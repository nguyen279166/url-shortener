import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { healthRouter } from "./routes/health.route.js";
import { linkRouter } from "./routes/link.route.js";
import { redirectRouter } from "./routes/redirect.route.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set(
    "trust proxy",
    env.NODE_ENV === "production" ? env.TRUST_PROXY_HOPS : false,
  );
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/links", linkRouter);
  app.use("/", redirectRouter);

  app.use((_request, response) => {
    response.status(404).json({ message: "Route not found" });
  });

  app.use(errorMiddleware);

  return app;
};
