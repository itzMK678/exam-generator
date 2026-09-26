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
  max: 10, // 10 exam generations per 15 min
  message: {
    success: false,
    message: "Too many exam generation requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiInteractionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // 40 tutor/summary interactions per 15 min
  message: {
    success: false,
    message: "Too many AI tutor or summary requests. Please wait a moment and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});