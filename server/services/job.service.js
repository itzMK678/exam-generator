import { randomUUID } from "crypto";
import redis from "../config/redis.js";

/**
 * Redis-based job registry for asynchronous long-running tasks.
 *
 * Stores:
 * - status
 * - progress
 * - result data
 * - error details
 *
 * Jobs automatically expire after 1 hour.
 */

const JOB_EXPIRATION_SECONDS = 60 * 60; // 1 hour

export async function createJob(type) {
  const jobId = `${type}_${randomUUID()}`;

  const job = {
    id: jobId,
    type,
    status: "processing",
    progress: 10,
    data: null,
    error: null,
    createdAt: Date.now(),
  };

  await redis.set(
    `job:${jobId}`,
    JSON.stringify(job),
    {
      EX: JOB_EXPIRATION_SECONDS,
    }
  );

  return job;
}

export async function getJob(jobId) {
  const data = await redis.get(`job:${jobId}`);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

export async function updateJob(jobId, updates) {
  const data = await redis.get(`job:${jobId}`);

  if (!data) {
    return null;
  }

  const job = JSON.parse(data);

  Object.assign(job, updates);

  await redis.set(
    `job:${jobId}`,
    JSON.stringify(job),
    {
      EX: JOB_EXPIRATION_SECONDS,
    }
  );

  return job;
}