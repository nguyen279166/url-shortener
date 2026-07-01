import { Router } from "express";

import { createLink, getLinkAnalytics } from "../controllers/link.controller.js";

export const linkRouter = Router();

linkRouter.post("/", createLink);
linkRouter.get("/:slug/stats", getLinkAnalytics);
