import { Router } from "express";

import { redirectLink } from "../controllers/link.controller.js";

export const redirectRouter = Router();

redirectRouter.get("/:slug", redirectLink);
