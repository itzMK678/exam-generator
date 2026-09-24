import rateLimit from "express-rate-limit";

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 upload requests
  message: {
    success: false,
    message: "Too many upload requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 exam generations
  message: {
    success: false,
    message: "Too many exam generation requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});