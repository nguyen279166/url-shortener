import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorMiddleware } from "./error.middleware.js";
import { createRequireAuth } from "./auth.middleware.js";

type SessionResolver = NonNullable<Parameters<typeof createRequireAuth>[0]>;
type ResolvedSession = Awaited<ReturnType<SessionResolver>>;

const createTestApp = (resolveSession: SessionResolver) => {
  const app = express();

  app.get(
    "/protected",
    createRequireAuth(resolveSession),
    (request, response) => {
      response.status(200).json({ userId: request.auth?.userId });
    },
  );
  app.use(errorMiddleware);

  return app;
};

describe("createRequireAuth", () => {
  it("returns 401 before the controller runs when there is no session", async () => {
    const resolveSession: SessionResolver = () => Promise.resolve(null);
    const app = createTestApp(resolveSession);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Authentication required" });
  });

  it("attaches the signed-in user id and continues to the controller", async () => {
    const resolveSession: SessionResolver = () =>
      Promise.resolve({
        user: { id: "f463ec60-590b-4ec7-b16b-e99596707d81" },
        session: { id: "session-1" },
      } as ResolvedSession);
    const app = createTestApp(resolveSession);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      userId: "f463ec60-590b-4ec7-b16b-e99596707d81",
    });
  });

  it("forwards unexpected session lookup errors to the error middleware", async () => {
    const resolveSession: SessionResolver = () =>
      Promise.reject(new Error("session store unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createTestApp(resolveSession);

    const response = await request(app).get("/protected");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
