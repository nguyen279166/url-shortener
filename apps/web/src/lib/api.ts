import type {
  CreateLinkInput,
  LinkAnalytics,
  ListLinksParams,
  Pagination,
  ShortLink,
  UpdateLinkInput,
} from "../types/link";

const configuredApiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const API_URL = configuredApiUrl.replace(/\/$/, "");

type ErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
  retryAfter?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;
  readonly retryAfter?: number;

  constructor(status: number, payload: ErrorPayload) {
    super(payload.message ?? "The request could not be completed");
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = payload.errors ?? {};

    if (payload.retryAfter !== undefined) {
      this.retryAfter = payload.retryAfter;
    }
  }
}

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`${API_URL}${path}`, init);
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, payload as ErrorPayload);
  }

  return payload as T;
};

export const createShortLink = async (input: CreateLinkInput) => {
  const response = await request<{ data: ShortLink }>("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return response.data;
};

export const listShortLinks = async ({
  page = 1,
  limit = 20,
  search,
}: ListLinksParams = {}) => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    query.set("search", search);
  }

  return request<{ data: ShortLink[]; pagination: Pagination }>(
    `/api/links?${query.toString()}`,
  );
};

export const getShortLink = async (slug: string) => {
  const response = await request<{ data: ShortLink }>(
    `/api/links/${encodeURIComponent(slug)}`,
  );

  return response.data;
};

export const updateShortLink = async (
  slug: string,
  input: UpdateLinkInput,
) => {
  const response = await request<{ data: ShortLink }>(
    `/api/links/${encodeURIComponent(slug)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  return response.data;
};

export const getLinkAnalytics = async (slug: string) => {
  const response = await request<{ data: LinkAnalytics }>(
    `/api/links/${encodeURIComponent(slug)}/stats`,
  );

  return response.data;
};

export const getApiHealth = async () => {
  return request<{ status: "ok"; timestamp: string }>("/api/health");
};

export const getShortUrl = (shortPath: string) =>
  new URL(shortPath, `${API_URL}/`).toString();
