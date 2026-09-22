import {
  discussQuestion,
} from "../services/discussion.service.js";

export async function discussQuestionController(
  req,
  res
) {
  try {

    const {
      question,
      answer,
      explanation,
      messages,
    } = req.body;


    // ============================================================
    // VALIDATION
    // ============================================================

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discussion messages are required.",
      });
    }


    // ============================================================
    // CALL SERVICE
    // ============================================================

    const response =
      await discussQuestion({
        question,
        answer,
        explanation,
        messages,
      });


    // ============================================================
    // RESPONSE
    // ============================================================

    return res.status(200).json({
      success: true,
      message: response,
    });

  } catch (error) {

    console.error(
      "Discussion error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to discuss question.",
    });
  }
}