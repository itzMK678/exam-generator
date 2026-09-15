import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "ExamForge API",
  });
});

export default router;