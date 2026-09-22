import express from "express";
import cors from "cors";

import { env } from "../config/env.js";

import healthRoutes from "../routes/health.route.js";
import documentRoutes from "../routes/document.route.js";
import examRoutes from "../routes/exam.route.js";
import discussionRoutes from "../routes/discussion.route.js";

import { errorMiddleware } from "../middleware/error.middleware.js";

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// --------------------------------------------------
// Routes
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    version: "1.0.0",
  });
});

app.use(
  "/api/health",
  healthRoutes
);

app.use(
  "/api/documents",
  documentRoutes
);
app.use(
  "/api/exams",
  discussionRoutes
);
app.use(
  "/api/exams",
   examRoutes
  );


app.use(errorMiddleware);

// --------------------------------------------------
// Server
// --------------------------------------------------

app.listen(env.port, () => {
  console.log(
    `🚀 ExamForge API running on http://localhost:${env.port}`
  );
});