import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";

import { LinkTable } from "../components/LinkTable";
import { ApiError, listShortLinks, updateShortLink } from "../lib/api";
import type { Pagination, ShortLink } from "../types/link";

const PAGE_SIZE = 10;
type MessageTone = "success" | "error";

const initialPagination: Pagination = {
  page: 1,
  limit: PAGE_SIZE,
  totalItems: 0,
  totalPages: 0,
};

export const LinksPage = () => {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingSlug, setUpdatingSlug] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionMessageTone, setActionMessageTone] =
    useState<MessageTone>("success");

  useEffect(() => {
    let shouldIgnore = false;

    void listShortLinks({ page, limit: PAGE_SIZE, search })
      .then((response) => {
        if (shouldIgnore) return;

        setLinks(response.data);
        setPagination(response.pagination);
        setLoadError("");
      })
      .catch(() => {
        if (!shouldIgnore) {
          setLoadError("The route inventory could not be loaded.");
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
  }, [page, requestVersion, search]);

  const retry = () => {
    setIsLoading(true);
    setLoadError("");
    setRequestVersion((current) => current + 1);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setActionMessage("");
    setPage(1);
    setSearch(searchInput.trim());
    setRequestVersion((current) => current + 1);
  };

  const changePage = (nextPage: number) => {
    setIsLoading(true);
    setActionMessage("");
    setPage(nextPage);
  };

  const handleToggle = async (link: ShortLink) => {
    setUpdatingSlug(link.slug);
    setActionMessage("");

    try {
      const updated = await updateShortLink(link.slug, {
        isActive: !link.isActive,
      });

      setLinks((currentLinks) =>
        currentLinks.map((currentLink) =>
          currentLink.id === updated.id
            ? currentLink.totalClicks === undefined
              ? updated
              : { ...updated, totalClicks: currentLink.totalClicks }
            : currentLink,
        ),
      );
      setActionMessage(
        `/${link.slug} is now ${updated.isActive ? "active" : "paused"}.`,
      );
      setActionMessageTone("success");
    } catch (caughtError) {
      setActionMessage(
        caughtError instanceof ApiError
          ? caughtError.message
          : `Could not update /${link.slug}.`,
      );
      setActionMessageTone("error");
    } finally {
      setUpdatingSlug("");
    }
  };

  const totalPages = Math.max(pagination.totalPages, 1);

  return (
    <>
      <section className="page-intro inventory-intro">
        <div>
          <span className="section-index">03 / route inventory</span>
          <h1>Every route, under control.</h1>
        </div>
        <p>
          Search destinations, pause traffic, and open the event trail for any
          short link in the workspace.
        </p>
      </section>

      <section className="inventory-section" aria-labelledby="inventory-title">
        <div className="inventory-toolbar">
          <div>
            <span className="toolbar-label">Tracked routes</span>
            <strong id="inventory-title">{pagination.totalItems}</strong>
          </div>
          <form className="search-form" role="search" onSubmit={handleSearch}>
            <label htmlFor="link-search">Search slug or destination</label>
            <div>
              <Search aria-hidden="true" />
              <input
                id="link-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="portfolio or github.com"
              />
              <button type="submit">Search</button>
            </div>
          </form>
        </div>

        <p
          className="action-message"
          data-tone={actionMessage ? actionMessageTone : undefined}
          role={
            actionMessage && actionMessageTone === "error" ? "alert" : undefined
          }
          aria-live={actionMessageTone === "error" ? "assertive" : "polite"}
        >
          {actionMessage}
        </p>

        <LinkTable
          links={links}
          isLoading={isLoading}
          error={loadError}
          onRetry={retry}
          emptyMessage={
            search
              ? `No routes match “${search}”.`
              : "No routes have been created yet."
          }
          managed
          updatingSlug={updatingSlug}
          onToggle={(link) => void handleToggle(link)}
        />

        {!isLoading && !loadError && pagination.totalItems > 0 ? (
          <nav className="pagination" aria-label="Link inventory pages">
            <button
              type="button"
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page <strong>{page}</strong> / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>
    </>
  );
};
