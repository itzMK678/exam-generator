import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

const ai = new GoogleGenAI({
  apiKey: env.geminiApiKey,
});

/**
 * Generate an embedding for one piece of text.
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
 * We process each text separately because the current
 * Gemini response returned only one embedding when
 * multiple texts were sent together.
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
 */
export async function generateStructuredContent({
  systemInstruction,
  prompt,
  responseSchema,
}) {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Gemini exam generation attempt ${attempt}/${maxRetries}...`
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

      try {
        return JSON.parse(text);
      } catch (error) {
        console.error(
          "Gemini raw response:",
          text
        );

        throw new Error(
          `Gemini returned invalid JSON: ${error.message}`
        );
      }
    } catch (error) {
      const status = error?.status;

      console.error(
        `Gemini generation failed on attempt ${attempt}:`,
        error.message
      );

      // Retry temporary server/unavailable errors
      if (
        (status === 503 || status === 429) &&
        attempt < maxRetries
      ) {
        const delay =
          attempt * 3000;

        console.log(
          `Retrying Gemini in ${delay / 1000} seconds...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );

        continue;
      }

      throw error;
    }
  }
}