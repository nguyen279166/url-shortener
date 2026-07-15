import { Router } from "express";

import { env } from "../config/env.js";
import {
  createLink,
  deleteLink,
  getLink,
  getLinkAnalytics,
  listLinks,
  updateLink,
} from "../controllers/link.controller.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";

export const linkRouter = Router();
const createLinkRateLimiter = createRateLimiter({
  keyPrefix: "create-link",
  limit: env.CREATE_LINK_RATE_LIMIT,
  windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
});

linkRouter.get("/", listLinks);
linkRouter.post("/", createLinkRateLimiter, createLink);
linkRouter.patch("/:slug", updateLink);
linkRouter.delete("/:slug", deleteLink);
linkRouter.get("/:slug/stats", getLinkAnalytics);
linkRouter.get("/:slug", getLink);
