import { Router } from "express";

import { getDashboardOverview } from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", getDashboardOverview);
