import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  shortLinkCount: vi.fn(),
  shortLinkCreate: vi.fn(),
  shortLinkFindFirst: vi.fn(),
  shortLinkFindMany: vi.fn(),
  shortLinkFindUnique: vi.fn(),
  shortLinkUpdate: vi.fn(),
  clickEventCount: vi.fn(),
  clickEventCreate: vi.fn(),
  clickEventFindMany: vi.fn(),
}));

const redisMocks = vi.hoisted(() => ({
  deleteCacheValue: vi.fn(),
  getCacheValue: vi.fn(),
  setCacheValue: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  default: {
    $transaction: prismaMocks.transaction,
    shortLink: {
      count: prismaMocks.shortLinkCount,
      create: prismaMocks.shortLinkCreate,
      findFirst: prismaMocks.shortLinkFindFirst,
      findMany: prismaMocks.shortLinkFindMany,
      findUnique: prismaMocks.shortLinkFindUnique,
      update: prismaMocks.shortLinkUpdate,
    },
    clickEvent: {
      count: prismaMocks.clickEventCount,
      create: prismaMocks.clickEventCreate,
      findMany: prismaMocks.clickEventFindMany,
    },
  },
}));

vi.mock("../lib/redis.js", () => ({
  deleteCacheValue: redisMocks.deleteCacheValue,
  getCacheValue: redisMocks.getCacheValue,
  setCacheValue: redisMocks.setCacheValue,
}));

import {
  createShortLink,
  deleteShortLink,
  getLinkStats,
  getRedirectTarget,
  getShortLinkBySlug,
  listShortLinks,
  updateShortLink,
} from "./link.service.js";

const OWNER_ID = "3b7e4204-d73a-4c91-b686-98de8041dc50";
const SLUG = "owner-only";
const CREATED_AT = new Date("2026-07-14T12:00:00.000Z");
const UPDATED_AT = new Date("2026-07-14T12:30:00.000Z");

const shortLink = {
  id: "d6c4e747-4746-4428-ad60-78bf64bce779",
  slug: SLUG,
  originalUrl: "https://example.com/private",
  isActive: true,
  expiresAt: null,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMocks.transaction.mockImplementation((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  redisMocks.deleteCacheValue.mockResolvedValue(undefined);
});

describe("link service owner scoping", () => {
  it("generates lowercase slugs that survive route normalization", async () => {
    prismaMocks.shortLinkFindUnique.mockResolvedValue(null);
    prismaMocks.shortLinkCreate.mockImplementation(
      ({ data }: { data: { slug: string; originalUrl: string } }) =>
        Promise.resolve({
          ...shortLink,
          slug: data.slug,
          originalUrl: data.originalUrl,
        }),
    );

    const generatedSlugs: string[] = [];

    for (let index = 0; index < 20; index += 1) {
      const result = await createShortLink(OWNER_ID, {
        url: `https://example.com/generated/${index}`,
      });

      generatedSlugs.push(result.slug);
    }

    expect(generatedSlugs).toHaveLength(20);

    for (const slug of generatedSlugs) {
      expect(slug).toMatch(/^[a-z0-9]{7}$/);
    }
  });

  it("stores the signed-in owner when creating a link", async () => {
    prismaMocks.shortLinkFindUnique.mockResolvedValue(null);
    prismaMocks.shortLinkCreate.mockResolvedValue(shortLink);

    await createShortLink(OWNER_ID, {
      url: shortLink.originalUrl,
      customAlias: SLUG,
    });

    expect(prismaMocks.shortLinkCreate).toHaveBeenCalledWith({
      data: {
        slug: SLUG,
        originalUrl: shortLink.originalUrl,
        expiresAt: null,
        ownerId: OWNER_ID,
      },
    });
  });

  it("scopes both list queries to the signed-in owner", async () => {
    prismaMocks.shortLinkCount.mockResolvedValue(1);
    prismaMocks.shortLinkFindMany.mockResolvedValue([
      { ...shortLink, _count: { clicks: 4 } },
    ]);
    const expectedWhere = {
      ownerId: OWNER_ID,
      deletedAt: null,
      OR: [
        { slug: { contains: "private", mode: "insensitive" } },
        { originalUrl: { contains: "private", mode: "insensitive" } },
      ],
    };

    const result = await listShortLinks(OWNER_ID, {
      page: 1,
      limit: 20,
      search: "private",
    });

    expect(prismaMocks.shortLinkCount).toHaveBeenCalledWith({
      where: expectedWhere,
    });
    expect(prismaMocks.shortLinkFindMany).toHaveBeenCalledWith({
      where: expectedWhere,
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
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
    });
    expect(result.links).toEqual([
      expect.objectContaining({ slug: SLUG, totalClicks: 4 }),
    ]);
  });

  it("returns 404 when a slug does not belong to the signed-in owner", async () => {
    prismaMocks.shortLinkFindFirst.mockResolvedValue(null);

    await expect(getShortLinkBySlug(OWNER_ID, SLUG)).rejects.toMatchObject({
      statusCode: 404,
      message: "Short link not found",
    });

    expect(prismaMocks.shortLinkFindFirst).toHaveBeenCalledWith({
      where: { slug: SLUG, ownerId: OWNER_ID, deletedAt: null },
      include: {
        _count: {
          select: { clicks: true },
        },
      },
    });
  });

  it("does not update or invalidate cache when the scoped link is absent", async () => {
    prismaMocks.shortLinkFindFirst.mockResolvedValue(null);

    await expect(
      updateShortLink(OWNER_ID, SLUG, { isActive: false }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Short link not found",
    });

    expect(prismaMocks.shortLinkFindFirst).toHaveBeenCalledWith({
      where: { slug: SLUG, ownerId: OWNER_ID, deletedAt: null },
    });
    expect(prismaMocks.shortLinkUpdate).not.toHaveBeenCalled();
    expect(redisMocks.deleteCacheValue).not.toHaveBeenCalled();
  });

  it("updates by the id obtained from the owner-scoped lookup", async () => {
    prismaMocks.shortLinkFindFirst.mockResolvedValue(shortLink);
    prismaMocks.shortLinkUpdate.mockResolvedValue({
      ...shortLink,
      isActive: false,
    });

    const result = await updateShortLink(OWNER_ID, SLUG, { isActive: false });

    expect(prismaMocks.shortLinkFindFirst).toHaveBeenCalledWith({
      where: { slug: SLUG, ownerId: OWNER_ID, deletedAt: null },
    });
    expect(prismaMocks.shortLinkUpdate).toHaveBeenCalledWith({
      where: { id: shortLink.id },
      data: { isActive: false },
    });
    expect(redisMocks.deleteCacheValue).toHaveBeenCalledWith(`redirect:${SLUG}`);
    expect(result).toEqual(expect.objectContaining({ isActive: false }));
  });

  it("redirects again after an expired link has its expiration removed", async () => {
    const expiredLink = {
      ...shortLink,
      expiresAt: new Date("2026-07-13T12:00:00.000Z"),
    };
    const restoredLink = { ...shortLink, expiresAt: null };
    prismaMocks.shortLinkFindFirst.mockResolvedValue(expiredLink);
    prismaMocks.shortLinkUpdate.mockResolvedValue(restoredLink);

    const updated = await updateShortLink(OWNER_ID, SLUG, { expiresAt: null });

    expect(prismaMocks.shortLinkUpdate).toHaveBeenCalledWith({
      where: { id: shortLink.id },
      data: { expiresAt: null },
    });
    expect(redisMocks.deleteCacheValue).toHaveBeenCalledWith(`redirect:${SLUG}`);
    expect(updated).toEqual(expect.objectContaining({ expiresAt: null }));

    redisMocks.getCacheValue.mockResolvedValue(null);
    prismaMocks.shortLinkFindUnique.mockResolvedValue(restoredLink);

    await expect(getRedirectTarget(SLUG)).resolves.toEqual({
      id: shortLink.id,
      slug: SLUG,
      originalUrl: shortLink.originalUrl,
    });
  });

  it("soft deletes an owner-scoped link and invalidates its redirect cache", async () => {
    const deletedAt = new Date("2026-07-15T12:00:00.000Z");
    prismaMocks.shortLinkFindFirst.mockResolvedValue(shortLink);
    prismaMocks.shortLinkUpdate.mockResolvedValue({
      ...shortLink,
      isActive: false,
      deletedAt: new Date(),
    });

    await deleteShortLink(OWNER_ID, SLUG, deletedAt);

    expect(prismaMocks.shortLinkFindFirst).toHaveBeenCalledWith({
      where: { slug: SLUG, ownerId: OWNER_ID, deletedAt: null },
      select: { id: true },
    });
    expect(prismaMocks.shortLinkUpdate).toHaveBeenCalledWith({
      where: { id: shortLink.id },
      data: {
        deletedAt,
        isActive: false,
      },
    });
    expect(redisMocks.deleteCacheValue).toHaveBeenCalledWith(`redirect:${SLUG}`);
  });

  it("does not delete or invalidate cache when the active owner-scoped link is absent", async () => {
    prismaMocks.shortLinkFindFirst.mockResolvedValue(null);

    await expect(deleteShortLink(OWNER_ID, SLUG)).rejects.toMatchObject({
      statusCode: 404,
      message: "Short link not found",
    });

    expect(prismaMocks.shortLinkUpdate).not.toHaveBeenCalled();
    expect(redisMocks.deleteCacheValue).not.toHaveBeenCalled();
  });

  it("returns 410 and does not cache or record a target for a soft-deleted link", async () => {
    redisMocks.getCacheValue.mockResolvedValue(null);
    prismaMocks.shortLinkFindUnique.mockResolvedValue({
      ...shortLink,
      isActive: false,
      deletedAt: new Date("2026-07-15T12:00:00.000Z"),
    });

    await expect(getRedirectTarget(SLUG)).rejects.toMatchObject({
      statusCode: 410,
      message: "Short link has been deleted",
    });

    expect(redisMocks.setCacheValue).not.toHaveBeenCalled();
  });

  it("keeps a deleted link's custom alias reserved", async () => {
    prismaMocks.shortLinkFindUnique.mockResolvedValue({
      ...shortLink,
      deletedAt: new Date("2026-07-15T12:00:00.000Z"),
    });

    await expect(
      createShortLink(OWNER_ID, {
        url: "https://example.com/replacement",
        customAlias: SLUG,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Custom alias is already taken",
    });

    expect(prismaMocks.shortLinkCreate).not.toHaveBeenCalled();
  });

  it("does not reveal analytics for a slug outside the owner's scope", async () => {
    prismaMocks.shortLinkFindFirst.mockResolvedValue(null);

    await expect(getLinkStats(OWNER_ID, SLUG)).rejects.toMatchObject({
      statusCode: 404,
      message: "Short link not found",
    });

    expect(prismaMocks.shortLinkFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: SLUG, ownerId: OWNER_ID, deletedAt: null },
      }),
    );
    expect(prismaMocks.clickEventCount).not.toHaveBeenCalled();
    expect(prismaMocks.clickEventFindMany).not.toHaveBeenCalled();
  });
});
