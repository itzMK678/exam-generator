import { supabase } from "./supabase.service.js";

/**
 * Save document chunks.
 */
export async function saveDocumentChunks(
  documentId,
  chunks
) {
  if (!chunks.length) {
    return [];
  }

  const rows = chunks.map((chunk) => ({
    document_id: documentId,

    page_number: chunk.page_number,

    chunk_index: chunk.chunk_index,

    content: chunk.content,

    word_count: chunk.word_count,
  }));

  const { data, error } = await supabase
    .from("document_chunks")
    .insert(rows)
    .select();

  if (error) {
    throw new Error(
      `Failed to save document chunks: ${error.message}`
    );
  }

  return data;
}


/**
 * Remove all chunks for a document.
 */
export async function deleteDocumentChunks(
  documentId
) {
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