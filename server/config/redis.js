import { createClient } from "redis";
import { env } from "./env.js";

const redis = createClient({
  url: env.redisUrl,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 200, 3000),
  },
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message || err);
});

await redis.connect();

console.log("✅ Redis connected");

export default redis;