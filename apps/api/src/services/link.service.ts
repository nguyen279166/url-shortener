import { createHash, randomInt } from "node:crypto";

import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import { HttpError } from "../middleware/error.middleware.js";
import type {
  CreateLinkInput,
  ListLinksQueryInput,
} from "../validation/link.schema.js";

const SLUG_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GENERATED_SLUG_LENGTH = 7;
const MAX_SLUG_GENERATION_ATTEMPTS = 5;

type RecordClickInput = {
  shortLinkId: string;
  referrer?: string | undefined;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
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

export const listShortLinks = async (input: ListLinksQueryInput) => {
  const where: Prisma.ShortLinkWhereInput = input.search
    ? {
        OR: [
          { slug: { contains: input.search, mode: "insensitive" } },
          { originalUrl: { contains: input.search, mode: "insensitive" } },
        ],
      }
    : {};
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
    links: links.map((link) => ({
      id: link.id,
      slug: link.slug,
      originalUrl: link.originalUrl,
      shortPath: `/${link.slug}`,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      totalClicks: link._count.clicks,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    })),
    pagination: {
      page: input.page,
      limit: input.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / input.limit),
    },
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
    id: shortLink.id,
    slug: shortLink.slug,
    originalUrl: shortLink.originalUrl,
  };
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

export const getLinkStats = async (slug: string) => {
  const shortLink = await prisma.shortLink.findUnique({
    where: { slug },
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
