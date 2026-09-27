import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import crypto from "crypto";
import redis from "../config/redis.js";
const MAX_CONCURRENT_GEMINI_REQUESTS =
  env.maxConcurrentGeminiRequests || 2;
const REDIS_SEMAPHORE_KEY = "examforge:gemini:active_slots";
const SLOT_TTL_MS = 60000;
const ai = new GoogleGenAI({
  apiKey: env.geminiApiKey,
});

/**
 * ============================================================
 * GEMINI CONCURRENCY LIMITER
 * ============================================================
 *
 * Maximum number of Gemini API requests that can run
 * simultaneously.
 *
 * Example:
 * 5 requests arrive
 *
 * Request 1 → RUNNING
 * Request 2 → RUNNING
 * Request 3 → WAITING
 * Request 4 → WAITING
 * Request 5 → WAITING
 *
 * When one running request finishes, the next queued
 * request starts.
 */
async function acquireGeminiSlot(maxWaitMs = 120000) {
  const slotId = crypto.randomUUID();
  const startTime = Date.now();
  // Atomic Lua script:
  // 1. Purge expired leases
  // 2. Count active leases
  // 3. If count < limit, register slotId with future expiry timestamp and return 1
  // 4. Otherwise return 0 (queue is full)
  const luaScript = `
    redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, ARGV[1])
    local count = redis.call("ZCARD", KEYS[1])
    if count < tonumber(ARGV[2]) then
      redis.call("ZADD", KEYS[1], ARGV[3], ARGV[4])
      return 1
    else
      return 0
    end
  `;
  while (Date.now() - startTime < maxWaitMs) {
    const now = Date.now();
    const expiresAt = now + SLOT_TTL_MS;
    try {
      const acquired = await redis.eval(luaScript, {
        keys: [REDIS_SEMAPHORE_KEY],
        arguments: [
          String(now),
          String(MAX_CONCURRENT_GEMINI_REQUESTS),
          String(expiresAt),
          slotId,
        ],
      });
      if (acquired === 1) {
        return slotId;
      }
    } catch (err) {
      console.warn("[Gemini Redis Semaphore] Fallback on error:", err.message);
      return slotId; // Fallback so requests aren't permanently blocked if Redis blips
    }
    // Wait ~250ms with jitter before retrying
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));
  }
  throw new Error("Gemini is currently processing too many requests. Please try again shortly.");
}
/**
 * Release the distributed concurrency slot.
 */
async function releaseGeminiSlot(slotId) {
  if (!slotId) return;
  try {
    if (typeof redis.zRem === "function") {
      await redis.zRem(REDIS_SEMAPHORE_KEY, slotId);
    } else {
      await redis.sendCommand(["ZREM", REDIS_SEMAPHORE_KEY, slotId]);
    }
  } catch (err) {
    console.error("[Gemini Redis Semaphore] Failed to release slot:", err.message);
  }
}
/**
 * Execute a task wrapped in the Redis distributed limiter.
 */
async function runWithGeminiLimit(task) {
  const slotId = await acquireGeminiSlot();
  try {
    return await task();
  } finally {
    await releaseGeminiSlot(slotId);
  }
}
/**
 * ============================================================
 * GEMINI CONTENT GENERATION WITH RETRY
 * ============================================================
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
 *
 * The actual Gemini API request is also protected by
 * the concurrency limiter above.
 */

/**
 * Core resilient Gemini generator with:
 *
 * 1. Concurrency limiting
 * 2. Exponential backoff
 * 3. Random jitter
 * 4. Fallback model
 */
export async function generateContentWithRetry({
  systemInstruction,
  prompt,
  temperature = 0.2,
  responseSchema,
  responseMimeType,
}) {
  const maxRetries = 4;

  const config = {
    temperature,
  };

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

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    /**
     * Switch to fallback model after the first failed
     * attempt if a fallback model is configured.
     */
    if (
      attempt >= 2 &&
      env.geminiFallbackModel &&
      currentModel !== env.geminiFallbackModel
    ) {
      console.warn(
        `[Gemini] Primary model busy/unavailable. Switching to fallback model: ${env.geminiFallbackModel}`
      );

      currentModel = env.geminiFallbackModel;
    }

    try {
      console.log(
        `Gemini generation attempt ${attempt}/${maxRetries} using model [${currentModel}]...`
      );

      /**
       * IMPORTANT:
       *
       * The actual Gemini API call goes through
       * the concurrency limiter.
       *
       * This prevents too many Gemini requests
       * from running simultaneously.
       */
      const response = await runWithGeminiLimit(
        () =>
          ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config,
          })
      );

      const text = response.text;

      if (!text) {
        throw new Error(
          "Gemini returned an empty response"
        );
      }

      return text;
    } catch (error) {
      const rawStatus = error?.status;

      const rawCode =
        error?.code ||
        error?.error?.code;

      const statusNum = Number(
        rawStatus || rawCode
      );

      const statusStr = String(
        rawStatus ||
          error?.error?.status ||
          ""
      ).toUpperCase();

      const errMsg = (
        error?.message || ""
      ).toLowerCase();

      console.error(
        `Gemini generation failed on attempt ${attempt} (${statusStr || rawCode || rawStatus}):`,
        error.message
      );

      /**
       * Determine whether the error is retryable.
       */
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
        errMsg.includes(
          "resource has been exhausted"
        );

      /**
       * Non-retryable error.
       *
       * Example:
       * Invalid request
       * Invalid schema
       * Invalid API key
       * Invalid model
       */
      if (!isRetryable) {
        console.error(
          `Gemini error ${
            statusStr ||
            rawStatus
          } is not retryable.`
        );

        throw error;
      }

      /**
       * All retry attempts have been exhausted.
       */
      if (attempt === maxRetries) {
        console.error(
          "Gemini failed after all retry attempts."
        );

        throw new Error(
          "This AI model is currently experiencing high demand. Please try again in a few moments."
        );
      }

      /**
       * Exponential backoff:
       *
       * Attempt 1 → 2-3 sec
       * Attempt 2 → 4-5 sec
       * Attempt 3 → 8-9 sec
       */
      const baseDelay =
        2000 *
        Math.pow(
          2,
          attempt - 1
        );

      /**
       * Add random jitter between
       * 0 and 999 milliseconds.
       */
      const jitter =
        Math.floor(
          Math.random() * 1000
        );

      const delay =
        baseDelay + jitter;

      console.log(
        `Retrying Gemini in ${(delay / 1000).toFixed(1)} seconds...`
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            delay
          )
      );
    }
  }

  throw new Error(
    "Gemini generation failed."
  );
}

/**
 * ============================================================
 * STRUCTURED JSON GENERATION
 * ============================================================
 */

/**
 * Generate structured JSON using Gemini
 * with retry and concurrency limiting.
 */
export async function generateStructuredContent({
  systemInstruction,
  prompt,
  responseSchema,
}) {
  const text =
    await generateContentWithRetry({
      systemInstruction,
      prompt,
      temperature: 0.2,
      responseMimeType:
        "application/json",
      responseSchema,
    });

  const cleanedText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch (parseError) {
    console.error(
      "Gemini raw response:",
      text
    );

    throw new Error(
      `Gemini returned invalid JSON: ${parseError.message}`
    );
  }
}

/**
 * ============================================================
 * PLAIN TEXT GENERATION
 * ============================================================
 *
 * Used for:
 *
 * - Document summaries
 * - Tutor discussions
 * - Explanations
 * - Other plain-text AI responses
 */

/**
 * Generate plain text using Gemini
 * with retry and concurrency limiting.
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

/**
 * ============================================================
 * STREAMING TEXT GENERATION
 * ============================================================
 *
 * Provides real-time token streaming using Gemini API.
 * Protected by the concurrency limiter and initial-connection retry.
 */
export async function* streamTextContent({
  systemInstruction,
  prompt,
  temperature = 0.4,
  signal,
}) {
  // Acquire distributed concurrency slot in Redis
  const slotId = await acquireGeminiSlot();

  // Heartbeat to keep slot active in Redis if stream lasts > 20s
  const heartbeat = setInterval(() => {
    redis
      .sendCommand([
        "ZADD",
        REDIS_SEMAPHORE_KEY,
        String(Date.now() + SLOT_TTL_MS),
        slotId,
      ])
      .catch(() => {});
  }, 20000);

  try {
    let currentModel = env.geminiGenerationModel;
    const maxRetries = 3;
    let responseStream = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (
        attempt >= 2 &&
        env.geminiFallbackModel &&
        currentModel !== env.geminiFallbackModel
      ) {
        console.warn(
          `[Gemini Stream] Switching to fallback model: ${env.geminiFallbackModel}`
        );
        currentModel = env.geminiFallbackModel;
      }

      try {
        console.log(
          `[Gemini Stream] Initializing attempt ${attempt}/${maxRetries} using model [${currentModel}]...`
        );

        const config = { temperature };
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (signal) config.abortSignal = signal;

        responseStream = await ai.models.generateContentStream({
          model: currentModel,
          contents: prompt,
          config,
        });

        break;
      } catch (error) {
        const rawStatus = error?.status;
        const rawCode = error?.code || error?.error?.code;
        const statusNum = Number(rawStatus || rawCode);
        const statusStr = String(
          rawStatus || error?.error?.status || ""
        ).toUpperCase();
        const errMsg = (error?.message || "").toLowerCase();

        console.error(
          `[Gemini Stream] Connection failed on attempt ${attempt} (${statusStr || rawCode || rawStatus}):`,
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

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        const baseDelay = 1500 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 500);
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
      }
    }

    if (!responseStream) {
      throw new Error("Failed to initialize Gemini stream.");
    }

    for await (const chunk of responseStream) {
      if (signal?.aborted) break;
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } finally {
    clearInterval(heartbeat);
    await releaseGeminiSlot(slotId);
  }
}
