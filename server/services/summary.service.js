import { generateTextContent, streamTextContent } from "./gemini.service.js";
import { retrieveContext } from "./rag.service.js";

function buildSummaryPrompt(chunks) {
  const documentText = chunks
    .map((chunk) => {
      return `
[Page ${chunk.page_number}]

${chunk.content}
`;
    })
    .join("\n");

  return `
You are a helpful study assistant inside ExamForge.

Create a clear and useful summary of the following
educational document.

Document content:

${documentText}


Summary requirements:

- Summarize the main ideas of the document.
- Keep the important concepts and definitions.
- Organize the summary into clear sections.
- Include important points from different parts of the document.
- Do not invent information that is not present in the document.
- Do not mention that the content came from chunks.
- Make the summary easy for a student to study.
- Use headings and bullet points where useful.
- Keep the summary concise but informative.
`;
}

// ============================================================
// GENERATE DOCUMENT SUMMARY
// ============================================================

export async function summarizeDocument(documentId) {
  if (!documentId) {
    throw new Error("Document ID is required.");
  }

  const { chunks } = await retrieveContext({ documentId });

  if (!chunks.length) {
    throw new Error("No chunks found for this document.");
  }

  const prompt = buildSummaryPrompt(chunks);

  return await generateTextContent({
    prompt,
    temperature: 0.3,
  });
}

export async function* summarizeDocumentStream(documentId, signal) {
  if (!documentId) {
    throw new Error("Document ID is required.");
  }

  const { chunks } = await retrieveContext({ documentId });

  if (!chunks.length) {
    throw new Error("No chunks found for this document.");
  }

  const prompt = buildSummaryPrompt(chunks);

  yield* streamTextContent({
    prompt,
    temperature: 0.3,
    signal,
  });
}