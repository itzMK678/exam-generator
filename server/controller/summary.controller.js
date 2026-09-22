import {
  summarizeDocument,
} from "../services/summary.service.js";


// ============================================================
// SUMMARIZE DOCUMENT
// ============================================================

export async function summarizeDocumentController(
  req,
  res
) {
  try {
    const { documentId } = req.body;


    // ============================================================
    // VALIDATION
    // ============================================================

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "Document ID is required.",
      });
    }


    // ============================================================
    // GENERATE SUMMARY
    // ============================================================

    const summary =
      await summarizeDocument(documentId);


    // ============================================================
    // RESPONSE
    // ============================================================

    return res.status(200).json({
      success: true,
      summary,
    });

  } catch (error) {

    console.error(
      "Summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate summary.",
    });
  }
}