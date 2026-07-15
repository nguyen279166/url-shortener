import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import type { AuthSession } from "./lib/auth.js";
import { createRequireAuth } from "./middleware/auth.middleware.js";

const TEST_USER_ID = "f463ec60-590b-4ec7-b16b-e99596707d81";
const resolveTestSession = () =>
  Promise.resolve({
    user: { id: TEST_USER_ID },
    session: { id: "test-session" },
  } as AuthSession);

describe("API", () => {
  const app = createApp();
  const authenticatedApp = createApp({
    authMiddleware: createRequireAuth(resolveTestSession),
  });

  it("reports its health", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok" });
  });

  it("returns JSON for unknown routes", async () => {
    const response = await request(app).get("/missing/path");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Route not found" });
  });

  it("prevents browsers from caching redirect route responses", async () => {
    const response = await request(app).get("/bad!slug");

    expect(response.status).toBe(400);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it.each([
    ["get", "/api/dashboard"],
    ["get", "/api/links"],
    ["post", "/api/links"],
    ["get", "/api/links/demo-link"],
    ["patch", "/api/links/demo-link"],
    ["delete", "/api/links/demo-link"],
    ["get", "/api/links/demo-link/stats"],
  ] as const)(
    "protects %s %s before the request reaches a protected controller",
    async (method, path) => {
      const response = await request(app)[method](path);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Authentication required" });
    },
  );

  it.each([
    { url: "abc", customAlias: "bad-url-01" },
    { url: "example.com", customAlias: "no-protocol-01" },
  ])("rejects an invalid URL with status 400", async (body) => {
    const response = await request(authenticatedApp).post("/api/links").send(body);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid request body");
    expect(response.body).toHaveProperty("errors.url");
  });

  it("rejects invalid list links query params with status 400", async () => {
    const response = await request(authenticatedApp).get("/api/links?limit=abc");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid request body");
    expect(response.body).toHaveProperty("errors.limit");
  });

  it("rejects empty link updates with status 400", async () => {
    const response = await request(authenticatedApp)
      .patch("/api/links/demo-link")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid request body");
    expect(response.body).toHaveProperty("errors.fields");
  });

  it("rejects an invalid slug before querying the database", async () => {
    const response = await request(authenticatedApp).get("/api/links/bad!slug");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid request body");
    expect(response.body).toHaveProperty("errors.slug");
  });
});
