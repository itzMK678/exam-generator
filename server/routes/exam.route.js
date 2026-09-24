import express from "express";
import {generateLimiter} from "../middleware/rateLimiter.middleware.js";
import {
  generateExamController,
} from "../controller/exam.controller.js";

const router =
  express.Router();


router.post(
  "/generate",
  generateLimiter,
  generateExamController
);


export default router;