import { randomInt } from "node:crypto";

import prisma from "../lib/prisma.js";
import { HttpError } from "../middleware/error.middleware.js";
import type { CreateLinkInput } from "../validation/link.schema.js";

const SLUG_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GENERATED_SLUG_LENGTH = 7;
const MAX_SLUG_GENERATION_ATTEMPTS = 5;

const generateRandomSlug = () => {
  let slug = "";

  for (let index = 0; index < GENERATED_SLUG_LENGTH; index += 1) {
    slug += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  }

  return slug;
};

const generateUniqueSlug = async () => {
  for (let attempt = 0; attempt < MAX_SLUG_GENERATION_ATTEMPTS; attempt += 1) {
    const slug = generateRandomSlug();
    const existingLink = await prisma.shortLink.findUnique({ where: { slug } });

    if (!existingLink) {
      return slug;
    }
  }

  throw new HttpError(500, "Could not generate a unique short link");
};

export const createShortLink = async (input: CreateLinkInput) => {
  const slug = input.customAlias ?? (await generateUniqueSlug());

  if (input.customAlias) {
    const existingLink = await prisma.shortLink.findUnique({ where: { slug } });

    if (existingLink) {
      throw new HttpError(409, "Custom alias is already taken");
    }
  }

  const shortLink = await prisma.shortLink.create({
    data: {
      slug,
      originalUrl: input.url,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  return {
    id: shortLink.id,
    slug: shortLink.slug,
    originalUrl: shortLink.originalUrl,
    shortPath: `/${shortLink.slug}`,
    isActive: shortLink.isActive,
    expiresAt: shortLink.expiresAt,
    createdAt: shortLink.createdAt,
    updatedAt: shortLink.updatedAt,
  };
};

export const getRedirectTarget = async (slug: string) => {
  const shortLink = await prisma.shortLink.findUnique({ where: { slug } });

  if (!shortLink) {
    throw new HttpError(404, "Short link not found");
  }

  if (!shortLink.isActive) {
    throw new HttpError(410, "Short link is inactive");
  }

  if (shortLink.expiresAt && shortLink.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(410, "Short link has expired");
  }

  return {
    slug: shortLink.slug,
    originalUrl: shortLink.originalUrl,
  };
};
