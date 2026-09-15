import express from "express";

import { uploadDocuments } from "../middleware/upload.middleware.js";

import {
  uploadDocuments as uploadDocumentsController,
} from "../controller/document.controller.js";

const router = express.Router();

router.post(
  "/upload",
  uploadDocuments.array("files"),
  uploadDocumentsController
);

export default router;