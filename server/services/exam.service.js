import { supabase } from "./supabase.service.js";

import {
  generateStructuredContent,
} from "./gemini.service.js";

import {
  retrieveContext,
} from "./rag.service.js";

import {
  allocateByWeight,
} from "../utils/allocation.utils.js";


/**
 * Get documents from database.
 */
async function getDocuments(documentIds) {
  const { data, error } =
    await supabase
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
    throw new Error(
      `Failed to load documents: ${error.message}`
    );
  }


  if (!data?.length) {
    throw new Error(
      "No documents found"
    );
  }


  const notReady =
    data.filter(
      (doc) => doc.status !== "ready"
    );


  if (notReady.length > 0) {
    throw new Error(
      `Some documents are not ready: ${notReady
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

            enum: [
              "mcq",
              "short",
              "long",
            ],
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

  required: [
    "questions",
  ],
};


/**
 * Build the RAG generation prompt.
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

Your job is to generate exam questions ONLY from the
provided source material.

DOCUMENT:
${filename}

REQUESTED QUESTION COUNTS:

MCQ:
${mcqCount}

SHORT:
${shortCount}

LONG:
${longCount}

DIFFICULTY:
${difficulty}

FOCUS TOPICS:
${focusTopics || "No specific focus topic. Cover the most important concepts."}


IMPORTANT RULES:

1. Use ONLY information contained in the SOURCE MATERIAL.

2. Do not invent facts.

3. Do not use outside knowledge.

4. Every question must be answerable from the source material.

5. Questions should test understanding, not just copying sentences.

6. Avoid duplicate questions.

7. Avoid questions that are nearly identical.

8. MCQs must have exactly four options.

9. MCQs must have exactly one correct answer.

10. For MCQs:
    - options must contain four choices
    - correctAnswer must exactly match one option

11. For short questions:
    - options must be []
    - correctAnswer must be ""
    - answer should contain the expected answer

12. For long questions:
    - options must be []
    - correctAnswer must be ""
    - answer should contain a detailed expected answer

13. sourcePages must contain the page numbers from the source
    material that support the question.

14. Make questions appropriate for the requested difficulty.

15. Return exactly the requested number of questions.

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
  const totalQuestions =
    mcqCount +
    shortCount +
    longCount;


  if (totalQuestions === 0) {
    return [];
  }


  // --------------------------------------------------------
  // Retrieval query
  // --------------------------------------------------------

  const retrievalQuery = `
Generate an exam from the important concepts,
definitions, mechanisms, facts, relationships,
examples, processes and explanations in this document.

Focus:
${focusTopics || "all important topics"}

Difficulty:
${difficulty}
`;


  // --------------------------------------------------------
  // RAG retrieval
  // --------------------------------------------------------

  const rag =
    await retrieveContext({
      query: retrievalQuery,

      documentId: document.id,

      topK: Math.min(
        12,
        Math.max(
          6,
          totalQuestions * 2
        )
      ),
    });


  if (!rag.context) {
    throw new Error(
      `No relevant content found for ${document.filename}`
    );
  }


  // --------------------------------------------------------
  // Gemini generation
  // --------------------------------------------------------

  const prompt =
    buildPrompt({
      filename: document.filename,

      context: rag.context,

      mcqCount,

      shortCount,

      longCount,

      difficulty,

      focusTopics,
    });


  const result =
    await generateStructuredContent({
      systemInstruction:
        "Generate accurate, source-grounded educational exam questions.",

      prompt,

      responseSchema:
        examResponseSchema,
    });


  const questions =
    result.questions || [];


  if (
    questions.length !==
    totalQuestions
  ) {
    throw new Error(
      `Gemini generated ${questions.length} questions for ${document.filename}, expected ${totalQuestions}`
    );
  }


  return questions.map(
    (question) => ({
      ...question,

      documentId:
        document.id,

      filename:
        document.filename,
    })
  );
}


/**
 * Generate complete exam.
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
  // --------------------------------------------------------
  // Validation
  // --------------------------------------------------------

  if (
    !Array.isArray(documentIds) ||
    documentIds.length === 0
  ) {
    throw new Error(
      "At least one document is required"
    );
  }


  if (
    totalQuestions <= 0
  ) {
    throw new Error(
      "totalQuestions must be greater than zero"
    );
  }


  const calculatedTotal =
    mcqCount +
    shortCount +
    longCount;


  if (
    calculatedTotal !==
    totalQuestions
  ) {
    throw new Error(
      "MCQ + short + long counts must equal totalQuestions"
    );
  }


  // --------------------------------------------------------
  // Load documents
  // --------------------------------------------------------

  const documents =
    await getDocuments(
      documentIds
    );


  // --------------------------------------------------------
  // Allocate questions according
  // to document word counts
  // --------------------------------------------------------

 


  /*
   * IMPORTANT:
   *
   * The above per-document allocation is not enough,
   * because each document gets the whole total.
   *
   * So we calculate each question type across all
   * documents below.
   */

  const mcqAllocation =
    allocateByWeight(
      documents,
      mcqCount,
      (doc) => doc.word_count
    );


  const shortAllocation =
    allocateByWeight(
      documents,
      shortCount,
      (doc) => doc.word_count
    );


  const longAllocation =
    allocateByWeight(
      documents,
      longCount,
      (doc) => doc.word_count
    );


  // --------------------------------------------------------
  // Generate per-document exams
  // --------------------------------------------------------

  const allQuestions = [];


  for (const document of documents) {
    const mcqCountForDoc =
      mcqAllocation.find(
        (item) =>
          item.item.id === document.id
      )?.count || 0;


    const shortCountForDoc =
      shortAllocation.find(
        (item) =>
          item.item.id === document.id
      )?.count || 0;


    const longCountForDoc =
      longAllocation.find(
        (item) =>
          item.item.id === document.id
      )?.count || 0;


    const questions =
      await generateForDocument({
        document,

        mcqCount:
          mcqCountForDoc,

        shortCount:
          shortCountForDoc,

        longCount:
          longCountForDoc,

        difficulty,

        focusTopics,
      });


    allQuestions.push(
      ...questions
    );
  }


  // --------------------------------------------------------
  // Remove answers if requested
  // --------------------------------------------------------

  const finalQuestions =
    allQuestions.map(
      (question, index) => {
        const cleaned = {
          id: index + 1,

          type: question.type,

          question:
            question.question,

          options:
            question.options || [],

          documentId:
            question.documentId,

          filename:
            question.filename,

          sourcePages:
            question.sourcePages || [],
        };


        if (includeAnswers) {
          cleaned.correctAnswer =
            question.correctAnswer || "";

          cleaned.answer =
            question.answer || "";

          cleaned.explanation =
            question.explanation || "";
        }


        return cleaned;
      }
    );


  return {
    totalQuestions:
      finalQuestions.length,

    requestedQuestions:
      totalQuestions,

    difficulty,

    focusTopics,

    documents: documents.map(
      (doc) => ({
        id: doc.id,

        filename:
          doc.filename,

        wordCount:
          doc.word_count,

        percentage:
          Number(
            (
              (doc.word_count /
                documents.reduce(
                  (sum, d) =>
                    sum +
                    Number(
                      d.word_count || 0
                    ),
                  0
                )) *
              100
            ).toFixed(2)
          ),
      })
    ),

    questions:
      finalQuestions,
  };
}