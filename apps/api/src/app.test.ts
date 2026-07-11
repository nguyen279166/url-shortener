import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("API", () => {
  const app = createApp();

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

  it.each([
    { url: "abc", customAlias: "bad-url-01" },
    { url: "example.com", customAlias: "no-protocol-01" },
  ])("rejects an invalid URL with status 400", async (body) => {
    const response = await request(app).post("/api/links").send(body);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid request body");
    expect(response.body).toHaveProperty("errors.url");
  });

  it("rejects invalid list links query params with status 400", async () => {
    const response = await request(app).get("/api/links?limit=abc");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid request body");
    expect(response.body).toHaveProperty("errors.limit");
  });

  it("rejects empty link updates with status 400", async () => {
    const response = await request(app).patch("/api/links/demo-link").send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid request body");
    expect(response.body).toHaveProperty("errors.fields");
  });
});
