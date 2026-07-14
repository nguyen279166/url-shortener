export type ShortLink = {
  id: string;
  slug: string;
  originalUrl: string;
  shortPath: string;
  isActive: boolean;
  expiresAt: string | null;
  totalClicks?: number;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type CreateLinkInput = {
  url: string;
  customAlias?: string;
};

export type UpdateLinkInput = {
  isActive?: boolean;
  expiresAt?: string | null;
};

export type ListLinksParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type ClickEvent = {
  clickedAt: string;
  referrer: string | null;
  userAgent: string | null;
};

export type LinkAnalytics = {
  slug: string;
  originalUrl: string;
  totalClicks: number;
  recentClicks: ClickEvent[];
  createdAt: string;
  updatedAt: string;
};
