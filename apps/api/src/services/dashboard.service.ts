import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";

const DASHBOARD_LINK_LIMIT = 5;
const DAILY_CLICK_WINDOW_DAYS = 7;

const dashboardLinkSelect = {
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
} satisfies Prisma.ShortLinkSelect;

type DashboardLink = Prisma.ShortLinkGetPayload<{
  select: typeof dashboardLinkSelect;
}>;

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const addUtcDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
};

const toUtcDateKey = (date: Date) => date.toISOString().slice(0, 10);

const formatDashboardLink = (link: DashboardLink) => ({
  id: link.id,
  slug: link.slug,
  originalUrl: link.originalUrl,
  shortPath: `/${link.slug}`,
  isActive: link.isActive,
  expiresAt: link.expiresAt,
  totalClicks: link._count.clicks,
  createdAt: link.createdAt,
  updatedAt: link.updatedAt,
});

export const getDashboard = async (ownerId: string, now = new Date()) => {
  const todayStart = startOfUtcDay(now);
  const sevenDayWindowStart = addUtcDays(
    todayStart,
    -(DAILY_CLICK_WINDOW_DAYS - 1),
  );
  const tomorrowStart = addUtcDays(todayStart, 1);
  const ownerWhere: Prisma.ShortLinkWhereInput = {
    ownerId,
    deletedAt: null,
  };

  const [
    totalLinks,
    activeLinks,
    totalClicks,
    recentClickEvents,
    topLinks,
    recentLinks,
  ] = await prisma.$transaction([
    prisma.shortLink.count({ where: ownerWhere }),
    prisma.shortLink.count({
      where: {
        ownerId,
        deletedAt: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.clickEvent.count({
      where: { shortLink: { ownerId, deletedAt: null } },
    }),
    prisma.clickEvent.findMany({
      where: {
        shortLink: { ownerId, deletedAt: null },
        clickedAt: {
          gte: sevenDayWindowStart,
          lt: tomorrowStart,
        },
      },
      select: { clickedAt: true },
    }),
    prisma.shortLink.findMany({
      where: ownerWhere,
      orderBy: [{ clicks: { _count: "desc" } }, { createdAt: "desc" }],
      take: DASHBOARD_LINK_LIMIT,
      select: dashboardLinkSelect,
    }),
    prisma.shortLink.findMany({
      where: ownerWhere,
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_LINK_LIMIT,
      select: dashboardLinkSelect,
    }),
  ]);

  const clicksByDate = new Map<string, number>();

  for (const event of recentClickEvents) {
    const date = toUtcDateKey(event.clickedAt);
    clicksByDate.set(date, (clicksByDate.get(date) ?? 0) + 1);
  }

  const dailyClicks = Array.from(
    { length: DAILY_CLICK_WINDOW_DAYS },
    (_, index) => {
      const date = toUtcDateKey(addUtcDays(sevenDayWindowStart, index));

      return { date, clicks: clicksByDate.get(date) ?? 0 };
    },
  );

  return {
    totalLinks,
    activeLinks,
    totalClicks,
    clicksLast7Days: recentClickEvents.length,
    dailyClicks,
    topLinks: topLinks.map(formatDashboardLink),
    recentLinks: recentLinks.map(formatDashboardLink),
  };
};
