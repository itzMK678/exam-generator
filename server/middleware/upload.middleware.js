import multer from "multer";
import {
  ALLOWED_EXTENSIONS,
  getFileExtension,
  sanitizeFilename,
} from "../utils/file.utils.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Sanitize filename on the incoming file object
  file.originalname = sanitizeFilename(file.originalname);

  const extension = getFileExtension(file.originalname);

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(
      new Error(
        `Unsupported file type: ${extension || "unknown"}. Only PDF (.pdf) and Word (.docx) files are allowed.`
      )
    );
  }

  cb(null, true);
};

export const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: {
    // 25 MB per document
    fileSize: 25 * 1024 * 1024,
    // Max 15 files per batch to prevent memory saturation
    files: 15,
  },
});