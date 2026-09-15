const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 75;


/**
 * Normalize extracted text.
 */
function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/**
 * Split text into word-based chunks.
 *
 * Example:
 *
 * chunk 1 = words 0-499
 * chunk 2 = words 425-924
 * chunk 3 = words 850-1349
 *
 * This creates overlap so important context isn't lost
 * between chunks.
 */
export function chunkText(
  text,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP
) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const words = normalized.split(/\s+/);

  if (words.length <= chunkSize) {
    return [
      {
        content: normalized,
        wordCount: words.length,
      },
    ];
  }

  const chunks = [];

  const step = chunkSize - overlap;

  if (step <= 0) {
    throw new Error(
      "Chunk overlap must be smaller than chunk size"
    );
  }

  let chunkIndex = 0;

  for (
    let start = 0;
    start < words.length;
    start += step
  ) {
    const chunkWords = words.slice(
      start,
      start + chunkSize
    );

    if (chunkWords.length === 0) {
      break;
    }

    chunks.push({
      content: chunkWords.join(" "),
      wordCount: chunkWords.length,
    });

    chunkIndex++;

    if (start + chunkSize >= words.length) {
      break;
    }
  }

  return chunks;
}


/**
 * Convert document pages into chunks.
 *
 * Each page is chunked independently so that we preserve
 * page_number metadata for citations/debugging.
 */
export function createDocumentChunks(pages) {
  const allChunks = [];

  let globalChunkIndex = 0;

  for (const page of pages) {
    const chunks = chunkText(page.content);

    for (const chunk of chunks) {
      allChunks.push({
        page_number: page.page_number,

        chunk_index: globalChunkIndex,

        content: chunk.content,

        word_count: chunk.wordCount,
      });

      globalChunkIndex++;
    }
  }

  return allChunks;
}