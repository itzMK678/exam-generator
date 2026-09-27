import { supabase } from "./supabase.service.js";

const INSERT_BATCH_SIZE = 100;
/**
 * Save document chunks in batched inserts with error rollback protection.
 */
export async function saveDocumentChunks(documentId, chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const rows = chunks.map((chunk) => ({
    document_id: documentId,
    page_number: Number(chunk.page_number) || 1,
    chunk_index: Number(chunk.chunk_index) || 0,
    content: String(chunk.content || "").trim(),
    word_count: Number(chunk.word_count) || 0,
  }));

  const allInserted = [];

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);

    const { data, error } = await supabase
      .from("document_chunks")
      .insert(batch)
      .select("id, chunk_index, page_number");

    if (error) {
      // Clean up already inserted chunks from previous batches if one fails
      await deleteDocumentChunks(documentId).catch(() => {});
      throw new Error(
        `Failed to save document chunks (batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1} of ${Math.ceil(rows.length / INSERT_BATCH_SIZE)}): ${error.message}`
      );
    }

    if (data) {
      allInserted.push(...data);
    }
  }

  return allInserted;
}

/**
 * Remove all chunks belonging to a document.
 */
export async function deleteDocumentChunks(documentId) {
  if (!documentId) return;

  const { error } = await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);

  if (error) {
    console.error(`Failed to delete chunks for document ${documentId}:`, error.message);
    throw new Error(`Failed to delete document chunks: ${error.message}`);
  }
}