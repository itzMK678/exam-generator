import { generateExam } from "../services/exam.service.js";
import { generateExamSchema } from "../validators/exam.validator.js";

export async function generateExamController(req, res, next) {
  try {
    const parseResult = generateExamSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues.map((issue) => issue.message).join(", ");
      return res.status(400).json({
        success: false,
        message: errorDetails || "Invalid exam configuration parameters.",
        errors: parseResult.error.issues,
      });
    }

    const {
      documentIds,
      totalQuestions,
      mcqCount,
      shortCount,
      longCount,
      difficulty,
      focusTopics,
      includeAnswers,
    } = parseResult.data;

    const result = await generateExam({
      documentIds,
      totalQuestions,
      mcqCount,
      shortCount,
      longCount,
      difficulty,
      focusTopics,
      includeAnswers,
    });

    return res.status(200).json({
      success: true,
      message: "Exam generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}