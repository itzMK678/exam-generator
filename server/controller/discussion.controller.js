import { discussQuestion } from "../services/discussion.service.js";
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