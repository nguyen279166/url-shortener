import type { Request, Response } from "express";

import { createShortLink } from "../services/link.service.js";
import { createLinkSchema } from "../validation/link.schema.js";

export const createLink = async (request: Request, response: Response) => {
  const input = createLinkSchema.parse(request.body);
  const link = await createShortLink(input);

  response.status(201).json({ data: link });
};
