import { Router } from "express";

import {
  createLink,
  getLinkAnalytics,
  listLinks,
} from "../controllers/link.controller.js";

export const linkRouter = Router();

linkRouter.get("/", listLinks);
linkRouter.post("/", createLink);
linkRouter.get("/:slug/stats", getLinkAnalytics);
