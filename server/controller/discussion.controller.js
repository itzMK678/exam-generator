import {
  discussQuestion,
  discussQuestionStream,
} from "../services/discussion.service.js";
import { discussQuestionSchema } from "../validators/exam.validator.js";

export async function discussQuestionController(req, res, next) {
  try {
    const parseResult = discussQuestionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({
        success: false,
        message: errorMessage || "Invalid discussion parameters.",
      });
    }

    const { question, answer, explanation, messages } = parseResult.data;

    const response = await discussQuestion({
      question,
      answer,
      explanation,
      messages,
    });

    return res.status(200).json({
      success: true,
      message: response,
    });
  } catch (error) {
    console.error("Discussion error:", error.message);
    next(error);
  }
}

export async function discussQuestionStreamController(req, res, next) {
  try {
    const parseResult = discussQuestionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({
        success: false,
        message: errorMessage || "Invalid discussion parameters.",
      });
    }

    const { question, answer, explanation, messages } = parseResult.data;

    // Configure headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    try {
      const tokenStream = discussQuestionStream({
        question,
        answer,
        explanation,
        messages,
        signal: abortController.signal,
      });

      for await (const token of tokenStream) {
        if (req.writableEnded) break;
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      }

      if (!req.writableEnded) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    } catch (streamError) {
      console.error("Discussion stream error:", streamError.message);
      if (!req.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            error:
              streamError.message ||
              "AI Tutor is currently experiencing high demand. Please try again shortly.",
          })}\n\n`
        );
        res.end();
      }
    }
  } catch (error) {
    console.error("Discussion setup error:", error.message);
    next(error);
  }
}