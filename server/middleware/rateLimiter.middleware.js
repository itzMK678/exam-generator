import rateLimit from "express-rate-limit";
// import { RedisStore } from "rate-limit-redis";
// import redis from "../config/redis.js";

// Uses express-rate-limit's built-in memory store (compatible with Vercel serverless)
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  /*
  // [COMMENTED OUT FOR VERCEL]
  store: new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix: "examforge:rl:upload:",
  }),
  */
  message: {
    success: false,
    message: "Too many upload requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  /*
  // [COMMENTED OUT FOR VERCEL]
  store: new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix: "examforge:rl:gen:",
  }),
  */
  message: {
    success: false,
    message: "Too many exam generation requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiInteractionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
  /*
  // [COMMENTED OUT FOR VERCEL]
  store: new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix: "examforge:rl:ai:",
  }),
  */
  message: {
    success: false,
    message: "Too many AI tutor or summary requests. Please wait a moment and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});