import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "local",
  });
});
