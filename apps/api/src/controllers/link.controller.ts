import type { Request, Response } from "express";

import {
  createShortLink,
  getLinkStats,
  getRedirectTarget,
  recordClickEvent,
} from "../services/link.service.js";
import {
  createLinkSchema,
  linkSlugParamsSchema,
} from "../validation/link.schema.js";

export const createLink = async (request: Request, response: Response) => {
  const input = createLinkSchema.parse(request.body);
  const link = await createShortLink(input);

  response.status(201).json({ data: link });
};

export const redirectLink = async (request: Request, response: Response) => {
  const { slug } = linkSlugParamsSchema.parse(request.params);
  const target = await getRedirectTarget(slug);

  await recordClickEvent({
    shortLinkId: target.id,
    referrer: request.get("referer") ?? request.get("referrer"),
    userAgent: request.get("user-agent"),
    ipAddress: request.ip,
  });

  response.redirect(302, target.originalUrl);
};

export const getLinkAnalytics = async (request: Request, response: Response) => {
  const { slug } = linkSlugParamsSchema.parse(request.params);
  const stats = await getLinkStats(slug);

  response.status(200).json({ data: stats });
};
