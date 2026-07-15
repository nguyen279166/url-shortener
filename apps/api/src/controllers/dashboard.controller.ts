import type { Request, Response } from "express";

import { HttpError } from "../middleware/error.middleware.js";
import { getDashboard } from "../services/dashboard.service.js";

export const getDashboardOverview = async (
  request: Request,
  response: Response,
) => {
  if (!request.auth) {
    throw new HttpError(401, "Authentication required");
  }

  const dashboard = await getDashboard(request.auth.userId);

  response.status(200).json({ data: dashboard });
};
