import { Router } from "express";

import { createLink } from "../controllers/link.controller.js";

export const linkRouter = Router();

linkRouter.post("/", createLink);
