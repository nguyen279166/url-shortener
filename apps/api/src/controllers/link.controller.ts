import type { Request, Response } from "express";

import { getClientIp } from "../lib/client-ip.js";
import { HttpError } from "../middleware/error.middleware.js";
import {
  createShortLink,
  deleteShortLink,
  getShortLinkBySlug,
  getLinkStats,
  getRedirectTarget,
  listShortLinks,
  recordClickEvent,
  updateShortLink,
} from "../services/link.service.js";
import {
  createLinkSchema,
  listLinksQuerySchema,
  linkSlugParamsSchema,
  updateLinkSchema,
} from "../validation/link.schema.js";

const getAuthenticatedUserId = (request: Request) => {
  if (!request.auth) {
    throw new HttpError(401, "Authentication required");
  }

  return request.auth.userId;
};

export const createLink = async (request: Request, response: Response) => {
  const input = createLinkSchema.parse(request.body);
  const link = await createShortLink(getAuthenticatedUserId(request), input);

  response.status(201).json({ data: link });
};

export const listLinks = async (request: Request, response: Response) => {
  const query = listLinksQuerySchema.parse(request.query);
  const result = await listShortLinks(getAuthenticatedUserId(request), query);

  response.status(200).json({ data: result.links, pagination: result.pagination });
};

export const getLink = async (request: Request, response: Response) => {
  const { slug } = linkSlugParamsSchema.parse(request.params);
  const link = await getShortLinkBySlug(getAuthenticatedUserId(request), slug);

  response.status(200).json({ data: link });
};

export const updateLink = async (request: Request, response: Response) => {
  const { slug } = linkSlugParamsSchema.parse(request.params);
  const input = updateLinkSchema.parse(request.body);
  const link = await updateShortLink(
    getAuthenticatedUserId(request),
    slug,
    input,
  );

  response.status(200).json({ data: link });
};

export const deleteLink = async (request: Request, response: Response) => {
  const { slug } = linkSlugParamsSchema.parse(request.params);

  await deleteShortLink(getAuthenticatedUserId(request), slug);

  response.status(204).send();
};

export const redirectLink = async (request: Request, response: Response) => {
  // Redirects must reach this service on every visit so that state changes and
  // click analytics are never hidden by a browser or intermediary cache.
  response.set("Cache-Control", "no-store");

  const { slug } = linkSlugParamsSchema.parse(request.params);
  const target = await getRedirectTarget(slug);

  await recordClickEvent({
    shortLinkId: target.id,
    referrer: request.get("referer") ?? request.get("referrer"),
    userAgent: request.get("user-agent"),
    ipAddress: getClientIp(request),
  });

  response.redirect(302, target.originalUrl);
};

export const getLinkAnalytics = async (request: Request, response: Response) => {
  const { slug } = linkSlugParamsSchema.parse(request.params);
  const stats = await getLinkStats(getAuthenticatedUserId(request), slug);

  response.status(200).json({ data: stats });
};
