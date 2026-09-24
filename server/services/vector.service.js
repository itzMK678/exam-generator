import { supabase } from "./supabase.service.js";

const INSERT_BATCH_SIZE = 100;

/**
 * Save document chunks with batching to prevent PostgREST payload overflow.
 */
export async function saveDocumentChunks(documentId, chunks) {
  if (!chunks || !chunks.length) {
    return [];
  }

  const rows = chunks.map((chunk) => ({
    document_id: documentId,
    page_number: chunk.page_number,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    word_count: chunk.word_count,
  }));

  const allInserted = [];

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const { data, error } = await supabase
      .from("document_chunks")
      .insert(batch)
      .select("id, chunk_index, page_number");

    if (error) {
      throw new Error(
        `Failed to save document chunks (batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}): ${error.message}`
      );
    }

    if (data) {
      allInserted.push(...data);
    }
  }

  return allInserted;
}

/**
 * Remove all chunks for a document.
 */
export async function deleteDocumentChunks(documentId) {
  if (!documentId) return;

  const { error } = await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);

  if (error) {
    throw new Error(
      `Failed to delete document chunks: ${error.message}`
    );
  }
}