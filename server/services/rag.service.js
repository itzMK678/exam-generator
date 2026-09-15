import {
  generateEmbedding,
} from "./gemini.service.js";

import {
  searchDocumentChunks,
} from "./vector.service.js";


/**
 * Retrieve relevant chunks for a document.
 */
export async function retrieveContext({
  query,
  documentId,
  topK = 8,
}) {
  if (!query || !query.trim()) {
    throw new Error(
      "RAG query cannot be empty"
    );
  }


  // --------------------------------------------------------
  // 1. Convert query into vector
  // --------------------------------------------------------

  const queryEmbedding =
    await generateEmbedding(query);


  // --------------------------------------------------------
  // 2. Search pgvector
  // --------------------------------------------------------

  const chunks =
    await searchDocumentChunks({
      queryEmbedding,

      documentIds: [documentId],

      topK,
    });


  // --------------------------------------------------------
  // 3. Build context
  // --------------------------------------------------------

  const context = chunks
    .map((chunk, index) => {
      return [
        `SOURCE ${index + 1}`,
        `Page: ${chunk.page_number}`,
        `Similarity: ${Number(
          chunk.similarity
        ).toFixed(4)}`,
        chunk.content,
      ].join("\n");
    })
    .join("\n\n");


  return {
    chunks,

    context,
  };
}