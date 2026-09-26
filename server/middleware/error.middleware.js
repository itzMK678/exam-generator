import fs from "fs";

export function errorMiddleware(err, req, res, next) {
  console.error("API ERROR:", err);

  // Clean up any temporary files written to disk before the error occurred
  const filesToClean = Array.isArray(req.files)
    ? req.files
    : req.file
      ? [req.file]
      : [];

  for (const file of filesToClean) {
    if (file?.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File exceeds size limit. Maximum allowed size is 25 MB per file.",
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files uploaded. Maximum is 15 files per batch.",
    });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  let errorMessage = err.message || "An unexpected internal server error occurred.";

  if (typeof errorMessage === "string" && errorMessage.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {}
  }

  return res.status(statusCode).json({
    success: false,
    message: errorMessage,
  });
}