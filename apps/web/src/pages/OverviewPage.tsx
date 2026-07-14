import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

import { LinkTable } from "../components/LinkTable";
import { ShortenForm } from "../components/ShortenForm";
import { listShortLinks } from "../lib/api";
import type { Pagination, ShortLink } from "../types/link";

const initialPagination: Pagination = {
  page: 1,
  limit: 6,
  totalItems: 0,
  totalPages: 0,
};

export const OverviewPage = () => {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await listShortLinks({ limit: 6 });

      setLinks(response.data);
      setPagination(response.pagination);
    } catch {
      setLoadError("The workspace cannot reach the API right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let shouldIgnore = false;

    void listShortLinks({ limit: 6 })
      .then((response) => {
        if (shouldIgnore) return;

        setLinks(response.data);
        setPagination(response.pagination);
      })
      .catch(() => {
        if (!shouldIgnore) {
          setLoadError("The workspace cannot reach the API right now.");
        }
      })
      .finally(() => {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      });

    return () => {
      shouldIgnore = true;
    };
  }, []);

  const handleCreated = (link: ShortLink) => {
    setLinks((currentLinks) => [link, ...currentLinks].slice(0, 6));
    setPagination((current) => ({
      ...current,
      totalItems: current.totalItems + 1,
      totalPages: Math.max(current.totalPages, 1),
    }));
    setLoadError("");
  };

  const runtimeStatus = isLoading
    ? "checking"
    : loadError
      ? "check API"
      : "healthy";

  return (
    <>
      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <Activity aria-hidden="true" />
            Redirect infrastructure, made legible
          </div>
          <h1>
            Small links.
            <br />
            Full <span>signal.</span>
          </h1>
          <p className="hero-description">
            Create durable short routes, watch every redirect, and keep the
            operational details close enough to act on.
          </p>

          <dl className="runtime-ledger" aria-label="Workspace summary">
            <div>
              <dt>Tracked</dt>
              <dd>{isLoading ? "\u2014" : pagination.totalItems}</dd>
            </div>
            <div>
              <dt>Loaded now</dt>
              <dd>{isLoading ? "\u2014" : links.length}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{runtimeStatus}</dd>
            </div>
          </dl>
        </div>

        <ShortenForm onCreated={handleCreated} />
      </section>

      <section className="recent-section" id="links" aria-labelledby="links-title">
        <div className="section-heading">
          <div>
            <span className="section-index">02 / route log</span>
            <h2 id="links-title">Recent links</h2>
          </div>
          <div className="section-actions">
            <p>The six newest routes. Select a slug to inspect its analytics.</p>
            <button
              type="button"
              onClick={() => void loadLinks()}
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? "spin" : ""} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        <LinkTable
          links={links}
          isLoading={isLoading}
          error={loadError}
          onRetry={() => void loadLinks()}
        />
      </section>
    </>
  );
};
