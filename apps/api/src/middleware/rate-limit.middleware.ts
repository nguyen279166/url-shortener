import { createHash } from "node:crypto";

import type { RequestHandler } from "express";

import {
  consumeRateLimit,
  type RateLimitResult,
} from "../lib/redis.js";

type RateLimitStore = (
  key: string,
  windowSeconds: number,
) => Promise<RateLimitResult | null>;

type RateLimiterOptions = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  consume?: RateLimitStore;
};

const hashClientIp = (ipAddress: string) =>
  createHash("sha256").update(ipAddress).digest("hex");

export const createRateLimiter = ({
  keyPrefix,
  limit,
  windowSeconds,
  consume = consumeRateLimit,
}: RateLimiterOptions): RequestHandler =>
  async (request, response, next) => {
    const clientIp = request.ip ?? request.socket.remoteAddress;

    if (!clientIp) {
      next();
      return;
    }

    const key = `rate-limit:${keyPrefix}:${hashClientIp(clientIp)}`;
    const result = await consume(key, windowSeconds);

    if (!result) {
      next();
      return;
    }

    const remaining = Math.max(limit - result.count, 0);

    response.set({
      "RateLimit-Limit": String(limit),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(result.ttlSeconds),
    });

    if (result.count > limit) {
      response.set("Retry-After", String(result.ttlSeconds));
      response.status(429).json({
        message: "Too many requests",
        retryAfter: result.ttlSeconds,
      });
      return;
    }

    next();
  };
