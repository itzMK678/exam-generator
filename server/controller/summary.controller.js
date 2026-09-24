import { summarizeDocument } from "../services/summary.service.js";
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