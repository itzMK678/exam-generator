import fs from "fs";
import { processDocument } from "../services/document.service.js";

export async function uploadDocuments(
  req,
  res,
  next
) {
  try {
    const files = req.files;
console.log(
  "Uploaded files:",
  files?.map((file) => ({
    name: file.originalname,
    size: file.size,
    type: file.mimetype,
  }))
);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload at least one PDF or DOCX file.",
      });
    }

    const results = [];

   for (const file of files) {
  try {
    const document = await processDocument(file);

    results.push({
      success: true,
      document,
    });
  } catch (error) {
    console.error(
      `Failed to process ${file.originalname}:`,
      error
    );

    results.push({
      success: false,
      filename: file.originalname,
      error: error.message,
    });
  }
}
    const successful =
      results.filter(
        (result) => result.success
      );

    const failed =
      results.filter(
        (result) => !result.success
      );

    return res.status(200).json({
      success: failed.length === 0,

      message:
        failed.length === 0
          ? "All documents processed successfully."
          : "Some documents could not be processed.",

      total: files.length,

      successful: successful.length,

      failed: failed.length,

      documents: successful.map(
        (result) => result.document
      ),

      errors: failed,
    });

  } catch (error) {
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.path) {
          fs.promises.unlink(file.path).catch(() => {});
        }
      }
    }
    next(error);
  }
}