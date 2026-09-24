import { supabase } from "./supabase.service.js";
import { generateStructuredContent } from "./gemini.service.js";
import { retrieveContext } from "./rag.service.js";
import { allocateByWeight } from "../utils/allocation.utils.js";

/**
 * Get documents from database and ensure they are ready.
 */
async function getDocuments(documentIds) {
  const { data, error } = await supabase
    .from("documents")
    .select(`
      id,
      filename,
      word_count,
      page_count,
      status
    `)
    .in("id", documentIds);

  if (error) {
    throw new Error(`Failed to load documents: ${error.message}`);
  }

  if (!data?.length) {
    throw new Error("No documents found for the provided IDs.");
  }

  const notReady = data.filter((doc) => doc.status !== "ready");

  if (notReady.length > 0) {
    throw new Error(
      `Some documents are still processing or not ready: ${notReady
        .map((doc) => doc.filename)
        .join(", ")}`
    );
  }

  return data;
}

/**
 * Schema for generated questions.
 */
const examResponseSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["mcq", "short", "long"],
          },
          question: {
            type: "string",
          },
          options: {
            type: "array",
            items: {
              type: "string",
            },
          },
          correctAnswer: {
            type: "string",
          },
          answer: {
            type: "string",
          },
          explanation: {
            type: "string",
          },
          sourcePages: {
            type: "array",
            items: {
              type: "integer",
            },
          },
        },
        required: [
          "type",
          "question",
          "options",
          "correctAnswer",
          "answer",
          "explanation",
          "sourcePages",
        ],
      },
    },
  },
  required: ["questions"],
};

/**
 * Build the prompt with strict guidelines.
 */
function buildPrompt({
  filename,
  context,
  mcqCount,
  shortCount,
  longCount,
  difficulty,
  focusTopics,
}) {
  return `
You are an expert educational exam generator.

Your job is to generate exam questions ONLY from the provided source material.

DOCUMENT:
${filename}

REQUESTED QUESTION COUNTS:
MCQ: ${mcqCount}
SHORT ANSWER: ${shortCount}
LONG ANSWER: ${longCount}

DIFFICULTY LEVEL:
${difficulty}

FOCUS TOPICS:
${focusTopics || "Cover the most important concepts and core themes across the material."}

RULES:
1. Use ONLY information contained in the SOURCE MATERIAL below. Do NOT hallucinate or extrapolate.
2. Every question must be answerable from the text.
3. Questions should test analytical understanding, not mere sentence copying.
4. Avoid duplicate or repetitive questions.
5. For MCQs:
   - Provide exactly four distinct options in 'options'.
   - 'correctAnswer' must match one of the four options exactly.
6. For short answer questions:
   - 'options' must be []
   - 'correctAnswer' must be ""
   - 'answer' should contain a clear, 1-3 sentence expected response.
7. For long answer questions:
   - 'options' must be []
   - 'correctAnswer' must be ""
   - 'answer' should contain a thorough, multi-point expected response.
8. 'sourcePages' must contain an array of integer page numbers directly cited from the source material.
9. Match the requested difficulty level (${difficulty}).
10. Return exactly ${mcqCount + shortCount + longCount} questions in total.

SOURCE MATERIAL:
${context}
`;
}

/**
 * Generate questions for one document.
 */
async function generateForDocument({
  document,
  mcqCount,
  shortCount,
  longCount,
  difficulty,
  focusTopics,
}) {
  const totalQuestions = mcqCount + shortCount + longCount;

  if (totalQuestions === 0) {
    return [];
  }

  // 1. Context retrieval with word capping and topic filtering
  const rag = await retrieveContext({
    documentId: document.id,
    focusTopics,
    topK: Math.min(24, Math.max(8, totalQuestions * 3)),
  });

  if (!rag.context) {
    throw new Error(`No extractable content found for document "${document.filename}"`);
  }

  // 2. Build structured prompt
  const prompt = buildPrompt({
    filename: document.filename,
    context: rag.context,
    mcqCount,
    shortCount,
    longCount,
    difficulty,
    focusTopics,
  });

  // 3. Structured Gemini generation
  const result = await generateStructuredContent({
    systemInstruction:
      "You are a rigorous educational exam creator. Output questions conforming strictly to the requested JSON schema.",
    prompt,
    responseSchema: examResponseSchema,
  });

  const questions = result.questions || [];

  return questions.map((question) => ({
    ...question,
    options: Array.isArray(question.options) ? question.options : [],
    sourcePages: Array.isArray(question.sourcePages)
      ? question.sourcePages.filter((p) => typeof p === "number")
      : [],
    documentId: document.id,
    filename: document.filename,
  }));
}

/**
 * Generate complete exam with parallelized document processing.
 */
export async function generateExam({
  documentIds,
  totalQuestions,
  mcqCount,
  shortCount,
  longCount,
  difficulty = "medium",
  focusTopics = "",
  includeAnswers = true,
}) {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new Error("At least one document is required.");
  }

  if (totalQuestions <= 0) {
    throw new Error("totalQuestions must be greater than zero.");
  }

  const calculatedTotal = mcqCount + shortCount + longCount;
  if (calculatedTotal !== totalQuestions) {
    throw new Error("The sum of MCQ, short, and long questions must equal totalQuestions.");
  }

  // Load and validate documents
  const documents = await getDocuments(documentIds);

  // Allocate questions across documents using the largest remainder method
  const mcqAllocation = allocateByWeight(documents, mcqCount, (doc) => doc.word_count);
  const shortAllocation = allocateByWeight(documents, shortCount, (doc) => doc.word_count);
  const longAllocation = allocateByWeight(documents, longCount, (doc) => doc.word_count);

  // Parallel generation across documents for high performance
  const generationPromises = documents.map(async (document) => {
    const mcqCountForDoc =
      mcqAllocation.find((item) => item.item.id === document.id)?.count || 0;

    const shortCountForDoc =
      shortAllocation.find((item) => item.item.id === document.id)?.count || 0;

    const longCountForDoc =
      longAllocation.find((item) => item.item.id === document.id)?.count || 0;

    if (mcqCountForDoc + shortCountForDoc + longCountForDoc === 0) {
      return [];
    }

    return await generateForDocument({
      document,
      mcqCount: mcqCountForDoc,
      shortCount: shortCountForDoc,
      longCount: longCountForDoc,
      difficulty,
      focusTopics,
    });
  });

  const questionBatches = await Promise.all(generationPromises);
  const allQuestions = questionBatches.flat();

  // Clean and prepare final question list
  const finalQuestions = allQuestions.map((question, index) => {
    const cleaned = {
      id: index + 1,
      type: question.type,
      question: question.question,
      options: question.options || [],
      documentId: question.documentId,
      filename: question.filename,
      sourcePages: question.sourcePages || [],
    };

    if (includeAnswers) {
      cleaned.correctAnswer = question.correctAnswer || "";
      cleaned.answer = question.answer || "";
      cleaned.explanation = question.explanation || "";
    }

    return cleaned;
  });

  const totalWordsAcrossDocs = documents.reduce(
    (sum, d) => sum + Number(d.word_count || 0),
    0
  );

  return {
    totalQuestions: finalQuestions.length,
    requestedQuestions: totalQuestions,
    difficulty,
    focusTopics,
    documents: documents.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      wordCount: doc.word_count,
      percentage:
        totalWordsAcrossDocs > 0
          ? Number(((doc.word_count / totalWordsAcrossDocs) * 100).toFixed(2))
          : 0,
    })),
    questions: finalQuestions,
  };
}