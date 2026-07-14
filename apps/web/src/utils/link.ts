import type { ShortLink } from "../types/link";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDate = (value: string) =>
  dateFormatter.format(new Date(value));

export const formatDateTime = (value: string) =>
  dateTimeFormatter.format(new Date(value));

export const formatDestination = (value: string) => {
  try {
    const url = new URL(value);
    const path = url.pathname === "/" ? "" : url.pathname;

    return `${url.hostname}${path}`;
  } catch {
    return value;
  }
};

export const formatReferrer = (value: string | null) => {
  if (!value) {
    return "Direct / unknown";
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
};

export const getLinkStatus = (link: ShortLink) => {
  if (!link.isActive) {
    return { label: "Inactive", kind: "inactive" } as const;
  }

  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
    return { label: "Expired", kind: "expired" } as const;
  }

  return { label: "Active", kind: "active" } as const;
};

export const toDatetimeLocalValue = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
};
