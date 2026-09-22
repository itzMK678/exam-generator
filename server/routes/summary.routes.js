import express from "express";

import {
  summarizeDocumentController,
} from "../controller/summary.controller.js";

const router = express.Router();

router.post(
  "/summarize",
  summarizeDocumentController
);

export default router;