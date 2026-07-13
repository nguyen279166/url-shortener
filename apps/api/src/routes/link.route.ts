import { Router } from "express";

import {
  createLink,
  getLink,
  getLinkAnalytics,
  listLinks,
  updateLink,
} from "../controllers/link.controller.js";

export const linkRouter = Router();

linkRouter.get("/", listLinks);
linkRouter.post("/", createLink);
linkRouter.patch("/:slug", updateLink);
linkRouter.get("/:slug/stats", getLinkAnalytics);
linkRouter.get("/:slug", getLink);
