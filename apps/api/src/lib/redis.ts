import { createClient } from "redis";

import { env } from "../config/env.js";

const REDIS_RETRY_DELAY_MS = 30_000;

const redisClient = env.REDIS_URL && env.NODE_ENV !== "test"
  ? createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 1_000,
        reconnectStrategy: false,
      },
    })
  : null;

let connectionPromise: Promise<boolean> | null = null;
let retryAfter = 0;

redisClient?.on("error", (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.warn("Redis connection error:", message);
});

const ensureRedisConnection = async () => {
  if (!redisClient) {
    return false;
  }

  if (redisClient.isReady) {
    return true;
  }

  if (redisClient.isOpen || Date.now() < retryAfter) {
    return false;
  }

  connectionPromise ??= redisClient
    .connect()
    .then(() => true)
    .catch((error: unknown) => {
      retryAfter = Date.now() + REDIS_RETRY_DELAY_MS;
      console.warn("Redis is unavailable; falling back to PostgreSQL:", error);
      return false;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

export const getCacheValue = async (key: string) => {
  if (!(await ensureRedisConnection()) || !redisClient) {
    return null;
  }

  try {
    return await redisClient.get(key);
  } catch (error) {
    console.warn("Could not read from Redis; falling back to PostgreSQL:", error);
    return null;
  }
};

export const setCacheValue = async (
  key: string,
  value: string,
  ttlSeconds: number,
) => {
  if (!(await ensureRedisConnection()) || !redisClient) {
    return;
  }

  try {
    await redisClient.set(key, value, { EX: ttlSeconds });
  } catch (error) {
    console.warn("Could not write to Redis:", error);
  }
};

export const deleteCacheValue = async (key: string) => {
  if (!(await ensureRedisConnection()) || !redisClient) {
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error) {
    console.warn("Could not delete from Redis:", error);
  }
};

export type RateLimitResult = {
  count: number;
  ttlSeconds: number;
};

export const consumeRateLimit = async (
  key: string,
  windowSeconds: number,
): Promise<RateLimitResult | null> => {
  if (!(await ensureRedisConnection()) || !redisClient) {
    return null;
  }

  try {
    const [count, , ttlSeconds] = await redisClient
      .multi()
      .incr(key)
      .expire(key, windowSeconds, "NX")
      .ttl(key)
      .exec();

    if (typeof count !== "number" || typeof ttlSeconds !== "number") {
      return null;
    }

    return {
      count,
      ttlSeconds: Math.max(ttlSeconds, 1),
    };
  } catch (error) {
    console.warn("Could not update the Redis rate limit counter:", error);
    return null;
  }
};
