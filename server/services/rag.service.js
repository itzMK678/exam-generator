import { supabase } from "./supabase.service.js";

/**
 * Retrieve chunks for a document.
 *
 * No embeddings or vector search are used.
 */
export async function retrieveContext({
  documentId,
}) {
  if (!documentId) {
    throw new Error(
      "Document ID is required."
    );
  }

  // --------------------------------------------------------
  // 1. Get document chunks
  // --------------------------------------------------------

  const { data: chunks, error } =
    await supabase
      .from("document_chunks")
      .select(
        "document_id, page_number, chunk_index, content, word_count"
      )
      .eq("document_id", documentId)
      .order("chunk_index", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Failed to retrieve document chunks: ${error.message}`
    );
  }

  if (!chunks || !chunks.length) {
    throw new Error(
      "No chunks found for this document."
    );
  }

  // --------------------------------------------------------
  // 2. Build context
  // --------------------------------------------------------

  const context = chunks
    .map((chunk, index) => {
      return [
        `SOURCE ${index + 1}`,
        `Page: ${chunk.page_number}`,
        chunk.content,
      ].join("\n");
    })
    .join("\n\n");

  return {
    chunks,
    context,
  };
}