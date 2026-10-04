import express from "express";
import { aiInteractionLimiter } from "../middleware/rateLimiter.middleware.js";

import {
  discussQuestionController,
  discussQuestionStreamController,
} from "../controller/discussion.controller.js";

const router = express.Router();

router.post(
  "/discuss",
  aiInteractionLimiter,
  discussQuestionController
);

/*
// ============================================================
// [COMMENTED OUT FOR VERCEL] SSE DISCUSSION STREAMING
// ============================================================
router.post(
  "/discuss/stream",
  aiInteractionLimiter,
  discussQuestionStreamController
);
*/

export default router;