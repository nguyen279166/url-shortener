import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  LoaderCircle,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { LinkStatus } from "../components/LinkStatus";
import {
  ApiError,
  deleteShortLink,
  getLinkAnalytics,
  getShortLink,
  getShortUrl,
  updateShortLink,
} from "../lib/api";
import type { LinkAnalytics, ShortLink } from "../types/link";
import {
  formatDateTime,
  formatReferrer,
  toDatetimeLocalValue,
} from "../utils/link";

type MessageTone = "success" | "error";

export const LinkDetailPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState<ShortLink | null>(null);
  const [stats, setStats] = useState<LinkAnalytics | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingExpiry, setIsSavingExpiry] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsMessageTone, setSettingsMessageTone] =
    useState<MessageTone>("success");

  useEffect(() => {
    let shouldIgnore = false;

    void Promise.all([getShortLink(slug), getLinkAnalytics(slug)])
      .then(([linkResponse, statsResponse]) => {
        if (shouldIgnore) return;

        setLink(linkResponse);
        setStats(statsResponse);
        setExpiresAt(toDatetimeLocalValue(linkResponse.expiresAt));
        setLoadError("");
      })
      .catch((caughtError: unknown) => {
        if (shouldIgnore) return;

        setLoadError(
          caughtError instanceof ApiError && caughtError.status === 404
            ? "This short link does not exist."
            : "The link detail could not be loaded.",
        );
      })
      .finally(() => {
        if (!shouldIgnore) setIsLoading(false);
      });

    return () => {
      shouldIgnore = true;
    };
  }, [requestVersion, slug]);

  const refresh = () => {
    setIsLoading(true);
    setSettingsMessage("");
    setRequestVersion((current) => current + 1);
  };

  const mergeUpdatedLink = (updated: ShortLink) => {
    setLink((current) => ({
      ...updated,
      ...(current?.totalClicks !== undefined
        ? { totalClicks: current.totalClicks }
        : {}),
    }));
  };

  const handleToggleStatus = async () => {
    if (!link) return;

    setIsUpdatingStatus(true);
    setSettingsMessage("");

    try {
      const updated = await updateShortLink(link.slug, {
        isActive: !link.isActive,
      });

      mergeUpdatedLink(updated);
      setSettingsMessage(
        `Redirect ${updated.isActive ? "activated" : "paused"}. Cache invalidated.`,
      );
      setSettingsMessageTone("success");
    } catch (caughtError) {
      setSettingsMessage(
        caughtError instanceof ApiError
          ? caughtError.message
          : "The redirect status could not be updated.",
      );
      setSettingsMessageTone("error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExpirySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!link) return;

    setIsSavingExpiry(true);
    setSettingsMessage("");

    try {
      const updated = await updateShortLink(link.slug, {
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      mergeUpdatedLink(updated);
      setExpiresAt(toDatetimeLocalValue(updated.expiresAt));
      setSettingsMessage(
        updated.expiresAt ? "Expiration updated." : "Expiration removed.",
      );
      setSettingsMessageTone("success");
    } catch (caughtError) {
      setSettingsMessage(
        caughtError instanceof ApiError
          ? caughtError.message
          : "The expiration could not be updated.",
      );
      setSettingsMessageTone("error");
    } finally {
      setIsSavingExpiry(false);
    }
  };

  const handleDeleteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!link || deleteConfirmation.trim() !== link.slug) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteShortLink(link.slug);
      navigate("/links", { replace: true });
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "The link could not be deleted. Please try again.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="detail-state" aria-label="Loading link detail">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>Loading route and event ledger...</p>
      </section>
    );
  }

  if (loadError || !link || !stats) {
    return (
      <section className="detail-state" role="alert">
        <p>{loadError || "The link detail is unavailable."}</p>
        <div>
          <button type="button" onClick={refresh}>
            Retry
          </button>
          <Link to="/links">Back to all links</Link>
        </div>
      </section>
    );
  }

  const shortUrl = getShortUrl(link.shortPath);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <>
      <section className="detail-hero">
        <div>
          <Link className="back-link" to="/links">
            <ArrowLeft aria-hidden="true" />
            All links
          </Link>
          <span className="section-index">04 / route detail</span>
          <h1>/{link.slug}</h1>
          <a
            className="detail-short-url"
            href={shortUrl}
            target="_blank"
            rel="noreferrer"
          >
            {shortUrl}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>

        <div className="detail-signal">
          <span>Total redirects</span>
          <strong>{stats.totalClicks}</strong>
          <LinkStatus link={link} />
        </div>
      </section>

      <section className="detail-grid">
        <div className="route-settings" aria-labelledby="settings-title">
          <div className="detail-section-heading">
            <div>
              <span className="section-index">Control plane</span>
              <h2 id="settings-title">Redirect settings</h2>
            </div>
            <button className="icon-button" type="button" onClick={refresh}>
              <RefreshCw aria-hidden="true" />
              <span className="sr-only">Refresh link detail</span>
            </button>
          </div>

          <dl className="route-facts">
            <div>
              <dt>Destination</dt>
              <dd>
                <a href={link.originalUrl} target="_blank" rel="noreferrer">
                  {link.originalUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(link.createdAt)}</dd>
            </div>
            <div>
              <dt>Last changed</dt>
              <dd>{formatDateTime(link.updatedAt)}</dd>
            </div>
          </dl>

          <div className="status-control">
            <div>
              <h3>Traffic state</h3>
              <p>
                Pausing returns HTTP 410 and removes the cached redirect target.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleStatus()}
              disabled={isUpdatingStatus}
              data-action={link.isActive ? "pause" : "activate"}
            >
              {isUpdatingStatus ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : null}
              {link.isActive ? "Pause redirect" : "Activate redirect"}
            </button>
          </div>

          <form className="expiry-form" onSubmit={handleExpirySubmit}>
            <div>
              <label htmlFor="expires-at">Expiration</label>
              <p>
                Leave empty for no expiry. Input uses your timezone: {timezone}.
              </p>
            </div>
            <div className="expiry-input-row">
              <CalendarClock aria-hidden="true" />
              <input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
              <button type="submit" disabled={isSavingExpiry}>
                {isSavingExpiry ? "Saving..." : "Save expiry"}
              </button>
            </div>
          </form>

          <section className="danger-zone" aria-labelledby="delete-link-title">
            <div className="danger-zone-heading">
              <div>
                <span className="section-index">Danger zone</span>
                <h3 id="delete-link-title">Delete this link</h3>
                <p>
                  Remove this route from your workspace and stop all future
                  redirects. This action cannot be undone.
                </p>
              </div>

              {!isConfirmingDelete ? (
                <button
                  className="danger-zone-trigger"
                  type="button"
                  onClick={() => {
                    setIsConfirmingDelete(true);
                    setDeleteError("");
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  Delete link
                </button>
              ) : null}
            </div>

            {isConfirmingDelete ? (
              <form className="delete-confirmation" onSubmit={handleDeleteSubmit}>
                <TriangleAlert aria-hidden="true" />
                <div>
                  <label htmlFor="delete-confirmation">
                    Type <strong>{link.slug}</strong> to confirm
                  </label>
                  <input
                    id="delete-confirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(event) =>
                      setDeleteConfirmation(event.target.value)
                    }
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                    disabled={isDeleting}
                    aria-describedby="delete-link-help"
                  />
                  <p id="delete-link-help">
                    The short route and its analytics will no longer be available
                    in your workspace.
                  </p>

                  {deleteError ? (
                    <p className="delete-error" role="alert">
                      {deleteError}
                    </p>
                  ) : null}

                  <div className="delete-confirmation-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmingDelete(false);
                        setDeleteConfirmation("");
                        setDeleteError("");
                      }}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isDeleting || deleteConfirmation.trim() !== link.slug
                      }
                    >
                      {isDeleting ? (
                        <LoaderCircle className="spin" aria-hidden="true" />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                      {isDeleting ? "Deleting..." : `Delete /${link.slug}`}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </section>

          <p
            className="settings-message"
            data-tone={settingsMessage ? settingsMessageTone : undefined}
            role={
              settingsMessage && settingsMessageTone === "error"
                ? "alert"
                : undefined
            }
            aria-live={
              settingsMessageTone === "error" ? "assertive" : "polite"
            }
          >
            {settingsMessage}
          </p>
        </div>

        <div className="event-ledger" aria-labelledby="events-title">
          <div className="detail-section-heading">
            <div>
              <span className="section-index">Analytics</span>
              <h2 id="events-title">Recent events</h2>
            </div>
            <span>Latest {stats.recentClicks.length} / 10</span>
          </div>

          {stats.recentClicks.length === 0 ? (
            <div className="event-empty">
              No redirects recorded yet. Open the short URL to create the first event.
            </div>
          ) : (
            <ol className="event-list">
              {stats.recentClicks.map((event, index) => (
                <li key={`${event.clickedAt}-${index}`}>
                  <time dateTime={event.clickedAt}>
                    {formatDateTime(event.clickedAt)}
                  </time>
                  <strong>{formatReferrer(event.referrer)}</strong>
                  <span title={event.userAgent ?? "Unknown client"}>
                    {event.userAgent ?? "Unknown client"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
};
