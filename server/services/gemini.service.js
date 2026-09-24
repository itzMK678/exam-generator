
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
/**
 * Core resilient Gemini generator with exponential backoff & jitter.
 */
export async function generateContentWithRetry({
  systemInstruction,
  prompt,
  temperature = 0.2,
  responseSchema,
  responseMimeType,
}) {
  const maxRetries = 4;
  const config = { temperature };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }
  if (responseSchema) {
    config.responseSchema = responseSchema;
  }

  let currentModel = env.geminiGenerationModel;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // If the primary model failed due to high demand / 503, switch to fallback model
    if (attempt >= 2 && env.geminiFallbackModel && currentModel !== env.geminiFallbackModel) {
      console.warn(`[Gemini] Primary model busy/unavailable. Switching to fallback model: ${env.geminiFallbackModel}`);
      currentModel = env.geminiFallbackModel;
    }

    try {
      console.log(`Gemini generation attempt ${attempt}/${maxRetries} using model [${currentModel}]...`);

      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config,
      });

      const text = response.text;

      if (!text) {
        throw new Error("Gemini returned an empty response");
      }

      return text;
    } catch (error) {
      const rawStatus = error?.status;
      const rawCode = error?.code || error?.error?.code;
      const statusNum = Number(rawStatus || rawCode);
      const statusStr = String(rawStatus || error?.error?.status || "").toUpperCase();
      const errMsg = (error?.message || "").toLowerCase();

      console.error(
        `Gemini generation failed on attempt ${attempt} (${statusStr || rawCode || rawStatus}):`,
        error.message
      );

      const isRetryable =
        statusNum === 429 ||
        statusNum === 500 ||
        statusNum === 502 ||
        statusNum === 503 ||
        statusNum === 504 ||
        statusStr === "UNAVAILABLE" ||
        statusStr === "RESOURCE_EXHAUSTED" ||
        errMsg.includes("503") ||
        errMsg.includes("429") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("high demand") ||
        errMsg.includes("resource has been exhausted");

      if (!isRetryable) {
        console.error(`Gemini error ${statusStr || rawStatus} is not retryable.`);
        throw error;
      }

      if (attempt === maxRetries) {
        console.error("Gemini failed after all retry attempts.");
        throw new Error("This AI model is currently experiencing high demand. Please try again in a few moments.");
      }

      const baseDelay = 2000 * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 1000);
      const delay = baseDelay + jitter;

      console.log(`Retrying Gemini in ${(delay / 1000).toFixed(1)} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gemini generation failed.");
}

/**
 * Generate structured JSON using Gemini with retry backoff.
 */
export async function generateStructuredContent({
  systemInstruction,
  prompt,
  responseSchema,
}) {
  const text = await generateContentWithRetry({
    systemInstruction,
    prompt,
    temperature: 0.2,
    responseMimeType: "application/json",
    responseSchema,
  });

  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error("Gemini raw response:", text);
    throw new Error(`Gemini returned invalid JSON: ${parseError.message}`);
  }
}

/**
 * Generate plain text using Gemini with retry backoff (for summaries, tutor discussions).
 */
export async function generateTextContent({
  systemInstruction,
  prompt,
  temperature = 0.3,
}) {
  return await generateContentWithRetry({
    systemInstruction,
    prompt,
    temperature,
  });
}