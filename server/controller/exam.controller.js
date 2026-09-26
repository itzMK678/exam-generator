import { generateExam } from "../services/exam.service.js";
import { generateExamSchema } from "../validators/exam.validator.js";
import { createJob, getJob, updateJob } from "../services/job.service.js";

/**
 * Initiate exam generation in the background.
 * Responds immediately (202 Accepted) with a jobId to prevent gateway timeouts.
 */
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

    // Create a new background tracking job in Redis
    const job = await createJob("exam");

    // Launch background generation without blocking the HTTP response
    (async () => {
      try {
        await updateJob(job.id, { progress: 30 });
        const result = await generateExam(parseResult.data);
        await updateJob(job.id, {
          status: "completed",
          progress: 100,
          data: result,
        });
        console.log(`[Exam Job ${job.id}] Successfully completed generation.`);
      } catch (err) {
        console.error(`[Exam Job ${job.id}] Generation failed:`, err.message);
        await updateJob(job.id, {
          status: "failed",
          error: err.message || "Failed to generate exam.",
        });
      }
    })();

    // Immediate 202 response in ~50ms!
    return res.status(202).json({
      success: true,
      message: "Exam generation initiated.",
      jobId: job.id,
      status: "processing",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Poll the status of an exam generation job.
 */
export async function getExamJobStatusController(req, res) {
  try {
    const { jobId } = req.params;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Exam job not found or has expired.",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check job status.",
    });
  }
}