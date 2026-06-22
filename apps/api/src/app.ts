import cors from "cors";
import express from "express";
import helmet from "helmet";

import { healthRouter } from "./routes/health.route.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10kb" }));

  app.use("/api/health", healthRouter);

  app.use((_request, response) => {
    response.status(404).json({ message: "Route not found" });
  });

  return app;
}
