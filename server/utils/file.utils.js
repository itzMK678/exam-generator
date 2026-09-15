export const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function getFileExtension(filename) {
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
  const extension = getFileExtension(file.originalname);

  return ALLOWED_EXTENSIONS.includes(extension);
}