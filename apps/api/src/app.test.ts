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
});
