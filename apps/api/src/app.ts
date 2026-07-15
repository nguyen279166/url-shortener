import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import type { RequestHandler } from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { AUTH_BASE_PATH, auth } from "./lib/auth.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { dashboardRouter } from "./routes/dashboard.route.js";
import { healthRouter } from "./routes/health.route.js";
import { linkRouter } from "./routes/link.route.js";
import { redirectRouter } from "./routes/redirect.route.js";

type CreateAppOptions = {
  authMiddleware?: RequestHandler;
};

export const createApp = (options: CreateAppOptions = {}) => {
  const app = express();
  const authMiddleware = options.authMiddleware ?? requireAuth;

  app.disable("x-powered-by");
  app.set(
    "trust proxy",
    env.NODE_ENV === "production" ? env.TRUST_PROXY_HOPS : false,
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.all(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(auth));
  app.use(express.json({ limit: "10kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/dashboard", authMiddleware, dashboardRouter);
  app.use("/api/links", authMiddleware, linkRouter);
  app.use("/", redirectRouter);

  app.use((_request, response) => {
    response.status(404).json({ message: "Route not found" });
  });

  app.use(errorMiddleware);

  return app;
};
