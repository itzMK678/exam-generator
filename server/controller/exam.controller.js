import {generateExam,} from "../services/exam.service.js";


export async function generateExamController(
  req,
  res,
  next
) {
  try {
    const {
      documentIds,

      totalQuestions,

      mcqCount,

      shortCount,

      longCount,

      difficulty,

      focusTopics,

      includeAnswers,
    } = req.body;


    const result =
      await generateExam({
        documentIds,

        totalQuestions:
          Number(totalQuestions),

        mcqCount:
          Number(mcqCount || 0),

        shortCount:
          Number(shortCount || 0),

        longCount:
          Number(longCount || 0),

        difficulty:
          difficulty || "medium",

        focusTopics:
          focusTopics || "",

        includeAnswers:
          includeAnswers !== false,
      });


    res.status(200).json({
      success: true,

      message:
        "Exam generated successfully",

      data: result,
    });

  } catch (error) {
    next(error);
  }
}   