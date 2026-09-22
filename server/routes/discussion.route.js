import express from "express";

import {
  discussQuestionController,
} from "../controller/discussion.controller.js";

const router = express.Router();

router.post(
  "/discuss",
  discussQuestionController
);

export default router;