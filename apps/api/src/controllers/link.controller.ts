import type { Request, Response } from "express";

import {
  createShortLink,
  getLinkStats,
  getRedirectTarget,
  listShortLinks,
  recordClickEvent,
} from "../services/link.service.js";
import {
  createLinkSchema,
  listLinksQuerySchema,
  linkSlugParamsSchema,
} from "../validation/link.schema.js";

export const createLink = async (request: Request, response: Response) => {
  const input = createLinkSchema.parse(request.body);
  const link = await createShortLink(input);

  response.status(201).json({ data: link });
};

export const listLinks = async (request: Request, response: Response) => {
  const query = listLinksQuerySchema.parse(request.query);
  const result = await listShortLinks(query);

  response.status(200).json({ data: result.links, pagination: result.pagination });
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
