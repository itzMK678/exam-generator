import { generateTextContent } from "./gemini.service.js";
import { supabase } from "./supabase.service.js";


// ============================================================
// GET DOCUMENT CHUNKS
// ============================================================

async function getDocumentChunks(documentId) {
  const { data, error } = await supabase
    .from("document_chunks")
    .select(
      "document_id, page_number, chunk_index, content"
    )
    .eq("document_id", documentId)
    .order("chunk_index", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Failed to get document chunks: ${error.message}`
    );
  }

  return data || [];
}


// ============================================================
// GENERATE DOCUMENT SUMMARY
// ============================================================

export async function summarizeDocument(
  documentId
) {
  if (!documentId) {
    throw new Error("Document ID is required.");
  }

  // Get all chunks belonging to this document
  const chunks = await getDocumentChunks(
    documentId
  );

  if (!chunks.length) {
    throw new Error(
      "No chunks found for this document."
    );
  }


  // ============================================================
  // COMBINE CHUNKS
  // ============================================================

  const documentText = chunks
    .map((chunk) => {
      return `
[Page ${chunk.page_number}]

${chunk.content}
`;
    })
    .join("\n");


  // ============================================================
  // GEMINI PROMPT
  // ============================================================

  const prompt = `
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


  // ============================================================
  // GEMINI (with retry & exponential backoff)
  // ============================================================

  return await generateTextContent({
    prompt,
    temperature: 0.3,
  });
}