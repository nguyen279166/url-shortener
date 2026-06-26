import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorMiddleware } from "./middleware/error.middleware.js";
import { healthRouter } from "./routes/health.route.js";
import { linkRouter } from "./routes/link.route.js";
import { redirectRouter } from "./routes/redirect.route.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
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
