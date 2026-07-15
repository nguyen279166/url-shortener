import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./rate-limit.middleware.js";

describe("createRateLimiter", () => {
  it("uses the authenticated user as the stable rate-limit subject", async () => {
    const app = express();
    const consume = vi.fn().mockResolvedValue({ count: 1, ttlSeconds: 60 });
    const rateLimiter = createRateLimiter({
      keyPrefix: "test",
      limit: 2,
      windowSeconds: 60,
      consume,
    });

    app.use((request, _response, next) => {
      request.auth = { userId: "owner-1", user: {} as never };
      next();
    });
    app.get("/", rateLimiter, (_request, response) => {
      response.status(200).json({ status: "ok" });
    });

    await request(app)
      .get("/")
      .set("x-vercel-forwarded-for", "203.0.113.10");
    await request(app)
      .get("/")
      .set("x-vercel-forwarded-for", "203.0.113.20");

    expect(consume).toHaveBeenCalledTimes(2);
    expect(consume.mock.calls[0]?.[0]).toBe(consume.mock.calls[1]?.[0]);
  });

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
