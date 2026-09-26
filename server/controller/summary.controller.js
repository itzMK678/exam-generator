import {
  summarizeDocument,
  summarizeDocumentStream,
} from "../services/summary.service.js";
import { summarizeDocumentSchema } from "../validators/exam.validator.js";

export async function summarizeDocumentController(req, res, next) {
  try {
    const parseResult = summarizeDocumentSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({
        success: false,
        message: errorMessage || "Document ID is required.",
      });
    }

    const { documentId } = parseResult.data;

    const summary = await summarizeDocument(documentId);

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Summary error:", error.message);
    next(error);
  }
}

export async function summarizeDocumentStreamController(req, res, next) {
  try {
    const parseResult = summarizeDocumentSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({
        success: false,
        message: errorMessage || "Document ID is required.",
      });
    }

    const { documentId } = parseResult.data;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    try {
      const tokenStream = summarizeDocumentStream(documentId, abortController.signal);

      for await (const token of tokenStream) {
        if (req.writableEnded) break;
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      }

      if (!req.writableEnded) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    } catch (streamError) {
      console.error("Summary stream error:", streamError.message);
      if (!req.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            error: streamError.message || "Failed to stream document summary.",
          })}\n\n`
        );
        res.end();
      }
    }
  } catch (error) {
    console.error("Summary setup error:", error.message);
    next(error);
  }
}