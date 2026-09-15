import express from "express";

import {
  generateExamController,
} from "../controller/exam.controller.js";

const router =
  express.Router();


router.post(
  "/generate",
  generateExamController
);


export default router;