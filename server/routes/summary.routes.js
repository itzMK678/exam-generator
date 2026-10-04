import express from "express";
import { aiInteractionLimiter } from "../middleware/rateLimiter.middleware.js";

import {
  summarizeDocumentController,
  summarizeDocumentStreamController,
} from "../controller/summary.controller.js";

const router = express.Router();

router.post(
  "/summarize",
  aiInteractionLimiter,
  summarizeDocumentController
);

/*
// ============================================================
// [COMMENTED OUT FOR VERCEL] SSE SUMMARY STREAMING
// ============================================================
router.post(
  "/summarize/stream",
  aiInteractionLimiter,
  summarizeDocumentStreamController
);
*/

export default router;