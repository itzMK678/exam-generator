export const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream", // some browsers send octet-stream for docx
];

export function getFileExtension(filename) {
  if (!filename || typeof filename !== "string") {
    return "";
  }

  const lastDot = filename.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return filename
    .substring(lastDot)
    .toLowerCase();
}

export function getFileType(filename) {
  const extension = getFileExtension(filename);

  if (extension === ".pdf") {
    return "pdf";
  }

  if (extension === ".docx") {
    return "docx";
  }

  return null;
}

export function isSupportedFile(file) {
  if (!file || !file.originalname) {
    return false;
  }

  const extension = getFileExtension(file.originalname);
  return ALLOWED_EXTENSIONS.includes(extension);
}

export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== "string") {
    return "document";
  }

  // Strip path traversal characters
  const base = filename.replace(/^.*[\\/]/, "").trim();

  // Replace special characters that cause issues with storage URLs or filesystems
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");

  return sanitized.substring(0, 150) || "document";
}