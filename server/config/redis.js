import { createClient } from "redis";
import { env } from "./env.js";

// In-memory fallback map for environments without Redis (like Vercel serverless)
const memoryStore = new Map();

const memoryFallback = {
  isFallback: true,
  async get(key) {
    return memoryStore.get(key) || null;
  },
  async set(key, value) {
    memoryStore.set(key, value);
    return "OK";
  },
  async del(key) {
    memoryStore.delete(key);
    return 1;
  },
  async sendCommand() {
    return null;
  },
  async zRem() {
    return 1;
  },
  async eval() {
    return 1;
  },
};

let redis = memoryFallback;

/*
// ============================================================
// [COMMENTED OUT FOR VERCEL] PERSISTENT REDIS CONNECTION
// Uncomment if running on a dedicated server with a Redis instance
// ============================================================
if (env.redisUrl) {
  try {
    const client = createClient({
      url: env.redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 200, 3000),
      },
    });

    client.on("error", (err) => {
      console.warn("[Redis] Client error:", err.message || err);
    });

    await client.connect();
    console.log("✅ Redis connected");
    redis = client;
  } catch (err) {
    console.warn("⚠️ Redis connection failed, using local memory store:", err.message);
  }
}
*/

export default redis;