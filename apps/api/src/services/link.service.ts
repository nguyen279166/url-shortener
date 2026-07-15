import { createHash, randomInt } from "node:crypto";

import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import {
  deleteCacheValue,
  getCacheValue,
  setCacheValue,
} from "../lib/redis.js";
import { HttpError } from "../middleware/error.middleware.js";
import type {
  CreateLinkInput,
  ListLinksQueryInput,
  UpdateLinkInput,
} from "../validation/link.schema.js";

const SLUG_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const GENERATED_SLUG_LENGTH = 7;
const MAX_SLUG_GENERATION_ATTEMPTS = 5;
const REDIRECT_CACHE_PREFIX = "redirect:";
const REDIRECT_CACHE_TTL_SECONDS = 300;

type RecordClickInput = {
  shortLinkId: string;
  referrer?: string | undefined;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
};

type ShortLinkForResponse = {
  id: string;
  slug: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    clicks: number;
  };
};

type RedirectTarget = {
  id: string;
  slug: string;
  originalUrl: string;
};

const getRedirectCacheKey = (slug: string) =>
  `${REDIRECT_CACHE_PREFIX}${slug}`;

const parseCachedRedirectTarget = (value: string): RedirectTarget | null => {
  try {
    const target: unknown = JSON.parse(value);

    if (
      typeof target === "object" &&
      target !== null &&
      "id" in target &&
      typeof target.id === "string" &&
      "slug" in target &&
      typeof target.slug === "string" &&
      "originalUrl" in target &&
      typeof target.originalUrl === "string"
    ) {
      return target as RedirectTarget;
    }
  } catch {
    return null;
  }

  return null;
};

const getCachedRedirectTarget = async (slug: string) => {
  const cachedValue = await getCacheValue(getRedirectCacheKey(slug));

  if (!cachedValue) {
    return null;
  }

  const target = parseCachedRedirectTarget(cachedValue);

  return target?.slug === slug ? target : null;
};

const cacheRedirectTarget = async (
  target: RedirectTarget,
  expiresAt: Date | null,
) => {
  const secondsUntilExpiry = expiresAt
    ? Math.floor((expiresAt.getTime() - Date.now()) / 1_000)
    : REDIRECT_CACHE_TTL_SECONDS;
  const ttlSeconds = Math.min(REDIRECT_CACHE_TTL_SECONDS, secondsUntilExpiry);

  if (ttlSeconds < 1) {
    return;
  }

  await setCacheValue(
    getRedirectCacheKey(target.slug),
    JSON.stringify(target),
    ttlSeconds,
  );
};

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

const normalizeOptionalText = (value: string | undefined) => {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
};

const hashIpAddress = (ipAddress: string | undefined) => {
  const normalizedIpAddress = normalizeOptionalText(ipAddress);

  if (!normalizedIpAddress) {
    return null;
  }

  return createHash("sha256").update(normalizedIpAddress).digest("hex");
};

const formatShortLink = (shortLink: ShortLinkForResponse) => ({
  id: shortLink.id,
  slug: shortLink.slug,
  originalUrl: shortLink.originalUrl,
  shortPath: `/${shortLink.slug}`,
  isActive: shortLink.isActive,
  expiresAt: shortLink.expiresAt,
  ...(shortLink._count ? { totalClicks: shortLink._count.clicks } : {}),
  createdAt: shortLink.createdAt,
  updatedAt: shortLink.updatedAt,
});

export const createShortLink = async (
  ownerId: string,
  input: CreateLinkInput,
) => {
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
      ownerId,
    },
  });

  return formatShortLink(shortLink);
};

export const listShortLinks = async (
  ownerId: string,
  input: ListLinksQueryInput,
) => {
  const where: Prisma.ShortLinkWhereInput = {
    ownerId,
    deletedAt: null,
    ...(input.search
      ? {
          OR: [
            { slug: { contains: input.search, mode: "insensitive" } },
            { originalUrl: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const skip = (input.page - 1) * input.limit;

  const [totalItems, links] = await prisma.$transaction([
    prisma.shortLink.count({ where }),
    prisma.shortLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: input.limit,
      select: {
        id: true,
        slug: true,
        originalUrl: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { clicks: true },
        },
      },
    }),
  ]);

  return {
    links: links.map((link) => formatShortLink(link)),
    pagination: {
      page: input.page,
      limit: input.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / input.limit),
    },
  };
};

export const getShortLinkBySlug = async (ownerId: string, slug: string) => {
  const shortLink = await prisma.shortLink.findFirst({
    where: { slug, ownerId, deletedAt: null },
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  if (!shortLink) {
    throw new HttpError(404, "Short link not found");
  }

  return formatShortLink(shortLink);
};

export const updateShortLink = async (
  ownerId: string,
  slug: string,
  input: UpdateLinkInput,
) => {
  const existingLink = await prisma.shortLink.findFirst({
    where: { slug, ownerId, deletedAt: null },
  });

  if (!existingLink) {
    throw new HttpError(404, "Short link not found");
  }

  const data: Prisma.ShortLinkUpdateInput = {};

  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  if (input.expiresAt !== undefined) {
    data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  }

  const updatedLink = await prisma.shortLink.update({
    where: { id: existingLink.id },
    data,
  });

  await deleteCacheValue(getRedirectCacheKey(slug));

  return formatShortLink(updatedLink);
};

export const deleteShortLink = async (
  ownerId: string,
  slug: string,
  deletedAt = new Date(),
) => {
  const existingLink = await prisma.shortLink.findFirst({
    where: { slug, ownerId, deletedAt: null },
    select: { id: true },
  });

  if (!existingLink) {
    throw new HttpError(404, "Short link not found");
  }

  await prisma.shortLink.update({
    where: { id: existingLink.id },
    data: {
      deletedAt,
      isActive: false,
    },
  });

  await deleteCacheValue(getRedirectCacheKey(slug));
};

export const getRedirectTarget = async (slug: string) => {
  const cachedTarget = await getCachedRedirectTarget(slug);

  if (cachedTarget) {
    return cachedTarget;
  }

  const shortLink = await prisma.shortLink.findUnique({ where: { slug } });

  if (!shortLink) {
    throw new HttpError(404, "Short link not found");
  }

  if (shortLink.deletedAt) {
    throw new HttpError(410, "Short link has been deleted");
  }

  if (!shortLink.isActive) {
    throw new HttpError(410, "Short link is inactive");
  }

  if (shortLink.expiresAt && shortLink.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(410, "Short link has expired");
  }

  const target = {
    id: shortLink.id,
    slug: shortLink.slug,
    originalUrl: shortLink.originalUrl,
  };

  await cacheRedirectTarget(target, shortLink.expiresAt);

  return target;
};

export const recordClickEvent = async (input: RecordClickInput) => {
  await prisma.clickEvent.create({
    data: {
      shortLinkId: input.shortLinkId,
      referrer: normalizeOptionalText(input.referrer),
      userAgent: normalizeOptionalText(input.userAgent),
      ipHash: hashIpAddress(input.ipAddress),
    },
  });
};

export const getLinkStats = async (ownerId: string, slug: string) => {
  const shortLink = await prisma.shortLink.findFirst({
    where: { slug, ownerId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      originalUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!shortLink) {
    throw new HttpError(404, "Short link not found");
  }

  const [totalClicks, recentClicks] = await prisma.$transaction([
    prisma.clickEvent.count({ where: { shortLinkId: shortLink.id } }),
    prisma.clickEvent.findMany({
      where: { shortLinkId: shortLink.id },
      orderBy: { clickedAt: "desc" },
      take: 10,
      select: {
        clickedAt: true,
        referrer: true,
        userAgent: true,
      },
    }),
  ]);

  return {
    slug: shortLink.slug,
    originalUrl: shortLink.originalUrl,
    totalClicks,
    recentClicks,
    createdAt: shortLink.createdAt,
    updatedAt: shortLink.updatedAt,
  };
};
