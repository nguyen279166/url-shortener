import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit.middleware.js";

describe("createRateLimiter", () => {
  it("returns 429 when the request limit is exceeded", async () => {
    const app = express();
    const rateLimiter = createRateLimiter({
      keyPrefix: "test",
      limit: 2,
      windowSeconds: 60,
      consume: () => Promise.resolve({ count: 3, ttlSeconds: 42 }),
    });

    app.get("/", rateLimiter, (_request, response) => {
      response.status(200).json({ status: "ok" });
    });

    const response = await request(app).get("/");

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      message: "Too many requests",
      retryAfter: 42,
    });
    expect(response.headers).toMatchObject({
      "ratelimit-limit": "2",
      "ratelimit-remaining": "0",
      "ratelimit-reset": "42",
      "retry-after": "42",
    });
  });

  it("allows the request when Redis is unavailable", async () => {
    const app = express();
    const rateLimiter = createRateLimiter({
      keyPrefix: "test",
      limit: 2,
      windowSeconds: 60,
      consume: () => Promise.resolve(null),
    });

    app.get("/", rateLimiter, (_request, response) => {
      response.status(200).json({ status: "ok" });
    });

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
