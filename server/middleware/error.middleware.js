export function errorMiddleware(err, req, res, next) {
  console.error("ERROR:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File is too large. Maximum size is 25 MB.",
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
}