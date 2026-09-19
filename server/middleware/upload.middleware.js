import multer from "multer";
import {
  ALLOWED_EXTENSIONS,
  getFileExtension,
} from "../utils/file.utils.js";

const storage = multer.memoryStorage();
// temporarely save file in RAM
const fileFilter = (req, file, cb) => {
  const extension = getFileExtension(file.originalname);

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(
      new Error(
        `Unsupported file type: ${extension}. Only PDF and DOCX files are allowed.`
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
  },
});