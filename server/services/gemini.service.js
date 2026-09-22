
import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

const ai = new GoogleGenAI({
  apiKey: env.geminiApiKey,
});

/**
 * Generate an embedding for one piece of text.
 *
 * NOTE:
 * ExamForge no longer uses embeddings/vector search.
 * These functions can be removed later if nothing imports them.
 */
export async function generateEmbedding(text) {
  if (!text || !text.trim()) {
    throw new Error(
      "Cannot generate embedding for empty text"
    );
  }

  const response = await ai.models.embedContent({
    model: env.geminiEmbeddingModel,

    contents: text,

    config: {
      outputDimensionality:
        env.geminiEmbeddingDimensions,
    },
  });

  const embedding =
    response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error(
      "Gemini returned an empty embedding"
    );
  }

  if (
    embedding.length !==
    env.geminiEmbeddingDimensions
  ) {
    throw new Error(
      `Invalid embedding dimension. Expected ${env.geminiEmbeddingDimensions}, received ${embedding.length}`
    );
  }

  return embedding;
}

/**
 * Generate embeddings for multiple chunks.
 *
 * NOTE:
 * These functions are no longer needed if
 * ExamForge has completely removed vectorization.
 */
export async function generateEmbeddings(texts) {
  if (
    !Array.isArray(texts) ||
    texts.length === 0
  ) {
    return [];
  }

  const embeddings = [];

  for (let i = 0; i < texts.length; i++) {
    console.log(
      `Generating embedding ${i + 1}/${texts.length}`
    );

    const embedding =
      await generateEmbedding(texts[i]);

    embeddings.push(embedding);
  }

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Generated ${embeddings.length} embeddings for ${texts.length} texts`
    );
  }

  return embeddings;
}

/**
 * Generate structured JSON using Gemini.
 *
 * Retry strategy:
 *
 * Attempt 1
 *     ↓
 * 2-3 seconds
 *
 * Attempt 2
 *     ↓
 * 4-5 seconds
 *
 * Attempt 3
 *     ↓
 * 8-9 seconds
 *
 * Attempt 4
 *     ↓
 * Final failure
 */
export async function generateStructuredContent({
  systemInstruction,
  prompt,
  responseSchema,
}) {
  const maxRetries = 4;

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      console.log(
        `Gemini generation attempt ${attempt}/${maxRetries}...`
      );

      const response =
        await ai.models.generateContent({
          model: env.geminiGenerationModel,

          contents: prompt,

          config: {
            systemInstruction,

            temperature: 0.2,

            responseMimeType: "application/json",

            responseSchema,
          },
        });

      const text = response.text;

      if (!text) {
        throw new Error(
          "Gemini returned an empty response"
        );
      }

      /**
       * Convert Gemini's JSON string
       * into a JavaScript object.
       */
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error(
          "Gemini raw response:",
          text
        );

        throw new Error(
          `Gemini returned invalid JSON: ${parseError.message}`
        );
      }
    } catch (error) {
      const status = error?.status;

      console.error(
        `Gemini generation failed on attempt ${attempt}:`,
        error.message
      );

      /**
       * These errors are usually temporary
       * and are safe to retry.
       */
      const isRetryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;

      /**
       * Do not retry errors such as:
       *
       * 400 → Bad request
       * 401 → Invalid API key
       * 403 → Permission denied
       * 404 → Model not found
       */
      if (!isRetryable) {
        console.error(
          `Gemini error ${status} is not retryable.`
        );

        throw error;
      }

      /**
       * We have used all attempts.
       */
      if (attempt === maxRetries) {
        console.error(
          "Gemini failed after all retry attempts."
        );

        throw error;
      }

      /**
       * Exponential backoff:
       *
       * Attempt 1 → 2 seconds
       * Attempt 2 → 4 seconds
       * Attempt 3 → 8 seconds
       */
      const baseDelay =
        2000 *
        Math.pow(2, attempt - 1);

      /**
       * Add random jitter between
       * 0 and 1 second.
       */
      const jitter =
        Math.floor(
          Math.random() * 1000
        );

      const delay =
        baseDelay + jitter;

      console.log(
        `Retrying Gemini in ${(delay / 1000).toFixed(
          1
        )} seconds...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  /**
   * This should never normally be reached.
   */
  throw new Error(
    "Gemini generation failed."
  );
}