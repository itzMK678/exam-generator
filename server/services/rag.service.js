import { supabase } from "./supabase.service.js";
import { env } from "../config/env.js";

/**
 * Retrieve and assemble context chunks for a document.
 * Safely caps total words to prevent overflowing Gemini context limits.
 */
export async function retrieveContext({
  documentId,
  focusTopics = "",
  topK,
}) {
  if (!documentId) {
    throw new Error("Document ID is required.");
  }

  // --------------------------------------------------------
  // 1. Get document chunks ordered by chunk index
  // --------------------------------------------------------
  const { data: chunks, error } = await supabase
    .from("document_chunks")
    .select("document_id, page_number, chunk_index, content, word_count")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to retrieve document chunks: ${error.message}`);
  }

  if (!chunks || !chunks.length) {
    throw new Error("No chunks found for this document.");
  }

  // --------------------------------------------------------
  // 2. Filter / Sample chunks if document exceeds budget
  // --------------------------------------------------------
  let selectedChunks = chunks;
  const maxWords = env.maxRAGWords || 35000;

  const totalWords = chunks.reduce(
    (sum, c) => sum + (c.word_count || c.content.split(/\s+/).length),
    0
  );

  // If focusTopics are specified and document is large, prioritize chunks containing topic keywords
  const topicKeywords = focusTopics
    ? focusTopics
        .toLowerCase()
        .split(/[,\s]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 2)
    : [];

  if (totalWords > maxWords || (topK && chunks.length > topK)) {
    // Score chunks by keyword matches
    const scored = chunks.map((chunk) => {
      const lower = chunk.content.toLowerCase();
      let matchCount = 0;
      for (const kw of topicKeywords) {
        if (lower.includes(kw)) {
          matchCount++;
        }
      }
      return { chunk, score: matchCount };
    });

    if (topicKeywords.length > 0) {
      // Sort with highest match first, but preserve original reading flow for top selections
      scored.sort((a, b) => b.score - a.score);
      const limit = topK || Math.ceil(maxWords / (env.maxChunkWordCount || 500));
      const topSelected = scored.slice(0, limit).map((s) => s.chunk);
      // Re-sort in original document order
      topSelected.sort((a, b) => a.chunk_index - b.chunk_index);
      selectedChunks = topSelected;
    } else {
      // Evenly sample chunks across the whole document so every section is covered
      const targetCount = topK || Math.ceil(maxWords / (env.maxChunkWordCount || 500));
      const step = chunks.length / targetCount;
      const sampled = [];
      for (let i = 0; i < targetCount && Math.floor(i * step) < chunks.length; i++) {
        sampled.push(chunks[Math.floor(i * step)]);
      }
      selectedChunks = sampled;
    }
  }

  // --------------------------------------------------------
  // 3. Build formatted context
  // --------------------------------------------------------
  const context = selectedChunks
    .map((chunk, index) => {
      return [
        `SOURCE ${index + 1}`,
        `Page: ${chunk.page_number}`,
        chunk.content,
      ].join("\n");
    })
    .join("\n\n");

  return {
    chunks: selectedChunks,
    context,
  };
}