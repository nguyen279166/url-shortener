import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  shortLinkCount: vi.fn(),
  shortLinkFindMany: vi.fn(),
  clickEventCount: vi.fn(),
  clickEventFindMany: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  default: {
    $transaction: prismaMocks.transaction,
    shortLink: {
      count: prismaMocks.shortLinkCount,
      findMany: prismaMocks.shortLinkFindMany,
    },
    clickEvent: {
      count: prismaMocks.clickEventCount,
      findMany: prismaMocks.clickEventFindMany,
    },
  },
}));

import { getDashboard } from "./dashboard.service.js";

const OWNER_ID = "f463ec60-590b-4ec7-b16b-e99596707d81";
const NOW = new Date("2026-07-15T14:30:00.000Z");
const DASHBOARD_LINK_SELECT = {
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
};

const dashboardLink = {
  id: "d6c4e747-4746-4428-ad60-78bf64bce779",
  slug: "owner-only",
  originalUrl: "https://example.com/private",
  isActive: true,
  expiresAt: null,
  createdAt: new Date("2026-07-14T12:00:00.000Z"),
  updatedAt: new Date("2026-07-14T12:30:00.000Z"),
  _count: { clicks: 4 },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMocks.transaction.mockImplementation((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  prismaMocks.shortLinkCount
    .mockResolvedValueOnce(3)
    .mockResolvedValueOnce(2);
  prismaMocks.clickEventCount.mockResolvedValue(9);
  prismaMocks.clickEventFindMany.mockResolvedValue([
    { clickedAt: new Date("2026-07-09T01:00:00.000Z") },
    { clickedAt: new Date("2026-07-11T23:59:00.000Z") },
    { clickedAt: new Date("2026-07-11T12:00:00.000Z") },
    { clickedAt: new Date("2026-07-15T08:00:00.000Z") },
  ]);
  prismaMocks.shortLinkFindMany.mockResolvedValue([dashboardLink]);
});

describe("dashboard service", () => {
  it("scopes every aggregate and link query to the signed-in owner", async () => {
    await getDashboard(OWNER_ID, NOW);

    expect(prismaMocks.shortLinkCount).toHaveBeenNthCalledWith(1, {
      where: { ownerId: OWNER_ID, deletedAt: null },
    });
    expect(prismaMocks.shortLinkCount).toHaveBeenNthCalledWith(2, {
      where: {
        ownerId: OWNER_ID,
        deletedAt: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
      },
    });
    expect(prismaMocks.clickEventCount).toHaveBeenCalledWith({
      where: { shortLink: { ownerId: OWNER_ID, deletedAt: null } },
    });
    expect(prismaMocks.clickEventFindMany).toHaveBeenCalledWith({
      where: {
        shortLink: { ownerId: OWNER_ID, deletedAt: null },
        clickedAt: {
          gte: new Date("2026-07-09T00:00:00.000Z"),
          lt: new Date("2026-07-16T00:00:00.000Z"),
        },
      },
      select: { clickedAt: true },
    });
    expect(prismaMocks.shortLinkFindMany).toHaveBeenNthCalledWith(1, {
      where: { ownerId: OWNER_ID, deletedAt: null },
      orderBy: [{ clicks: { _count: "desc" } }, { createdAt: "desc" }],
      take: 5,
      select: DASHBOARD_LINK_SELECT,
    });
    expect(prismaMocks.shortLinkFindMany).toHaveBeenNthCalledWith(2, {
      where: { ownerId: OWNER_ID, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: DASHBOARD_LINK_SELECT,
    });
  });

  it("returns a complete seven-day UTC series and formatted link lists", async () => {
    const result = await getDashboard(OWNER_ID, NOW);

    expect(result).toEqual({
      totalLinks: 3,
      activeLinks: 2,
      totalClicks: 9,
      clicksLast7Days: 4,
      dailyClicks: [
        { date: "2026-07-09", clicks: 1 },
        { date: "2026-07-10", clicks: 0 },
        { date: "2026-07-11", clicks: 2 },
        { date: "2026-07-12", clicks: 0 },
        { date: "2026-07-13", clicks: 0 },
        { date: "2026-07-14", clicks: 0 },
        { date: "2026-07-15", clicks: 1 },
      ],
      topLinks: [
        {
          id: dashboardLink.id,
          slug: dashboardLink.slug,
          originalUrl: dashboardLink.originalUrl,
          shortPath: `/${dashboardLink.slug}`,
          isActive: true,
          expiresAt: null,
          totalClicks: 4,
          createdAt: dashboardLink.createdAt,
          updatedAt: dashboardLink.updatedAt,
        },
      ],
      recentLinks: [
        {
          id: dashboardLink.id,
          slug: dashboardLink.slug,
          originalUrl: dashboardLink.originalUrl,
          shortPath: `/${dashboardLink.slug}`,
          isActive: true,
          expiresAt: null,
          totalClicks: 4,
          createdAt: dashboardLink.createdAt,
          updatedAt: dashboardLink.updatedAt,
        },
      ],
    });
  });
});
