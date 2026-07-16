import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

import { getShortUrl } from "../lib/api";
import type { ShortLink } from "../types/link";
import { formatDate, formatDestination } from "../utils/link";
import { CopyShortLinkButton } from "./CopyShortLinkButton";
import { LinkStatus } from "./LinkStatus";

type DashboardLinkListProps = {
  links: ShortLink[];
  variant: "top" | "recent";
};

export const DashboardLinkList = ({
  links,
  variant,
}: DashboardLinkListProps) => {
  if (links.length === 0) {
    return (
      <div className="dashboard-list-empty">
        <p>
          {variant === "top"
            ? "No click leaders yet. Share a route to start collecting signal."
            : "No routes yet. Create your first one to populate this workspace."}
        </p>
        <Link to="/new">Create a link</Link>
      </div>
    );
  }

  const List = variant === "top" ? "ol" : "ul";

  return (
    <List
      className="dashboard-link-list"
      aria-label={variant === "top" ? "Top performing links" : "Recent links"}
    >
      {links.map((link, index) => (
        <li key={link.id}>
          {variant === "top" ? (
            <span className="dashboard-link-rank" aria-label={`Rank ${index + 1}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
          ) : (
            <span className="dashboard-link-date">{formatDate(link.createdAt)}</span>
          )}

          <div className="dashboard-link-route">
            <div>
              <Link to={`/links/${encodeURIComponent(link.slug)}`}>/{link.slug}</Link>
              <CopyShortLinkButton shortPath={link.shortPath} slug={link.slug} />
              <a
                href={getShortUrl(link.shortPath)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open redirect ${link.slug} in a new tab`}
              >
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
            <span title={link.originalUrl}>{formatDestination(link.originalUrl)}</span>
          </div>

          {variant === "top" ? (
            <div className="dashboard-link-clicks">
              <strong>{link.totalClicks ?? 0}</strong>
              <span>{link.totalClicks === 1 ? "click" : "clicks"}</span>
            </div>
          ) : (
            <LinkStatus link={link} />
          )}
        </li>
      ))}
    </List>
  );
};
