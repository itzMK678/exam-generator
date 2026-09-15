import { generateEmbeddings } from "./gemini.service.js";

const BATCH_SIZE = 20;


/**
 * Generate embeddings in batches.
 *
 * We don't send hundreds of chunks in one request.
 */
export async function embedChunks(chunks) {
  const results = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(
      i,
      i + BATCH_SIZE
    );

    const texts = batch.map(
      (chunk) => chunk.content
    );

    console.log(
      `Generating embeddings ${i + 1}-${Math.min(
        i + BATCH_SIZE,
        chunks.length
      )} / ${chunks.length}`
    );

    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],

        embedding: embeddings[j],
      });
    }
  }

  return results;
}