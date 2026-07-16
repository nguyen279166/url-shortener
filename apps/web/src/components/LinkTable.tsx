import { ArrowUpRight, LoaderCircle, Settings2 } from "lucide-react";
import { Link } from "react-router";

import { getShortUrl } from "../lib/api";
import type { ShortLink } from "../types/link";
import { formatDate, formatDestination } from "../utils/link";
import { CopyShortLinkButton } from "./CopyShortLinkButton";
import { LinkStatus } from "./LinkStatus";

type LinkTableProps = {
  links: ShortLink[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  emptyMessage?: string;
  managed?: boolean;
  updatingSlug?: string;
  onToggle?: (link: ShortLink) => void;
};

export const LinkTable = ({
  links,
  isLoading,
  error,
  onRetry,
  emptyMessage = "No routes yet. Your first short link will appear here.",
  managed = false,
  updatingSlug,
  onToggle,
}: LinkTableProps) => {
  if (isLoading) {
    return (
      <div className="link-list link-list--loading" aria-label="Loading links">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="link-skeleton" key={index} aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="links-state" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry}>
          Retry connection
        </button>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="links-state">
        <p>{emptyMessage}</p>
        <Link to="/new">Create a route</Link>
      </div>
    );
  }

  return (
    <div className={`link-list${managed ? " link-list--managed" : ""}`}>
      <div className="link-list-header" aria-hidden="true">
        <span>Short route</span>
        <span>Destination</span>
        <span>Clicks</span>
        <span>Status</span>
        <span className="link-created">Created</span>
        {managed ? <span>Control</span> : null}
      </div>

      {links.map((link) => {
        const isUpdating = updatingSlug === link.slug;

        return (
          <article className="link-row" key={link.id}>
            <div className="link-primary" data-label="Short route">
              <Link to={`/links/${encodeURIComponent(link.slug)}`}>/{link.slug}</Link>
              <span className="link-row-actions">
                <CopyShortLinkButton
                  shortPath={link.shortPath}
                  slug={link.slug}
                />
                <a
                  className="redirect-link"
                  href={getShortUrl(link.shortPath)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open redirect ${link.slug} in a new tab`}
                >
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </span>
            </div>
            <div className="link-destination" data-label="Destination">
              <span title={link.originalUrl}>{formatDestination(link.originalUrl)}</span>
            </div>
            <div className="link-number" data-label="Clicks">
              {link.totalClicks ?? 0}
            </div>
            <div className="link-status-cell" data-label="Status">
              <LinkStatus link={link} />
            </div>
            <div className="link-date link-created" data-label="Created">
              {formatDate(link.createdAt)}
            </div>
            {managed ? (
              <div className="link-control" data-label="Control">
                <button
                  type="button"
                  onClick={() => onToggle?.(link)}
                  disabled={isUpdating}
                  aria-label={`${link.isActive ? "Pause" : "Activate"} ${link.slug}`}
                >
                  {isUpdating ? (
                    <LoaderCircle className="spin" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{link.isActive ? "II" : "\u25B6"}</span>
                  )}
                  {link.isActive ? "Pause" : "Activate"}
                </button>
                <Link
                  className="inspect-link"
                  to={`/links/${encodeURIComponent(link.slug)}`}
                  aria-label={`Inspect ${link.slug}`}
                >
                  <Settings2 aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};
