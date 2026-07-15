import { fromNodeHeaders } from "better-auth/node";
import type { Request, RequestHandler } from "express";

import { auth, type AuthSession } from "../lib/auth.js";

export type SessionResolver = (
  request: Request,
) => Promise<AuthSession | null>;

export const resolveAuthSession: SessionResolver = (request) =>
  auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

export const createRequireAuth = (
  resolveSession: SessionResolver = resolveAuthSession,
): RequestHandler =>
  async (request, response, next) => {
    try {
      const session = await resolveSession(request);

      if (!session) {
        response.status(401).json({ message: "Authentication required" });
        return;
      }

      request.auth = {
        userId: session.user.id,
        user: session.user,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

export const requireAuth = createRequireAuth();
