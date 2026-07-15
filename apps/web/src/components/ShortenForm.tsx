import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Check,
  Clipboard,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { Link } from "react-router";

import {
  ApiError,
  SHORT_URL_BASE,
  createShortLink,
  getShortUrl,
} from "../lib/api";
import type { ShortLink } from "../types/link";

type ShortenFormProps = {
  onCreated?: (link: ShortLink) => void;
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const ShortenForm = ({ onCreated }: ShortenFormProps) => {
  const [url, setUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setCreatedLink(null);
    setCopyState("idle");

    const normalizedUrl = url.trim();
    const normalizedAlias = customAlias.trim();

    if (!isHttpUrl(normalizedUrl)) {
      setError("Enter a complete URL beginning with http:// or https://");
      return;
    }

    setIsSubmitting(true);

    try {
      const link = await createShortLink({
        url: normalizedUrl,
        ...(normalizedAlias ? { customAlias: normalizedAlias } : {}),
      });

      setCreatedLink(link);
      setUrl("");
      setCustomAlias("");
      onCreated?.(link);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        const fieldError =
          caughtError.fieldErrors.url?.[0] ??
          caughtError.fieldErrors.customAlias?.[0];
        const retryMessage = caughtError.retryAfter
          ? ` Try again in ${caughtError.retryAfter} seconds.`
          : "";

        setError(`${fieldError ?? caughtError.message}${retryMessage}`);
      } else {
        setError("The API is unreachable. Check that the backend is running.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(getShortUrl(createdLink.shortPath));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const shortUrlHost = new URL(SHORT_URL_BASE).host;

  return (
    <section className="create-panel" id="create" aria-labelledby="create-title">
      <div className="panel-kicker">
        <span>01</span>
        <span>New redirect</span>
      </div>

      <div className="panel-heading">
        <h2 id="create-title">Cut a cleaner path.</h2>
        <p>Paste the destination. Keep the signal.</p>
      </div>

      <form className="shorten-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="destination-url">Destination URL</label>
          <input
            id="destination-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://your-long-link.com/campaign"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-describedby="url-help form-error"
            aria-invalid={Boolean(error)}
          />
          <p className="field-help" id="url-help">
            Include the protocol so redirects remain explicit and safe.
          </p>
        </div>

        <div className="field-group">
          <label htmlFor="custom-alias">
            Custom alias <span>optional</span>
          </label>
          <div className="alias-input">
            <span aria-hidden="true">{shortUrlHost}/</span>
            <input
              id="custom-alias"
              name="customAlias"
              type="text"
              autoComplete="off"
              placeholder="launch-notes"
              value={customAlias}
              onChange={(event) => setCustomAlias(event.target.value)}
              maxLength={64}
            />
          </div>
        </div>

        {error ? (
          <p className="form-message form-message--error" id="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="submit-button" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? "Creating link" : "Create short link"}</span>
          {isSubmitting ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
        </button>
      </form>

      {createdLink ? (
        <div className="created-result" aria-live="polite">
          <div>
            <span className="result-label">Ready to route</span>
            <a
              href={getShortUrl(createdLink.shortPath)}
              target="_blank"
              rel="noreferrer"
            >
              {getShortUrl(createdLink.shortPath)}
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
          <div className="created-result-actions">
            <button type="button" onClick={handleCopy} className="copy-button">
              {copyState === "copied" ? (
                <Check aria-hidden="true" />
              ) : (
                <Clipboard aria-hidden="true" />
              )}
              <span>{copyState === "copied" ? "Copied" : "Copy"}</span>
            </button>
            <Link
              className="result-detail-link"
              to={`/links/${encodeURIComponent(createdLink.slug)}`}
            >
              <ChartNoAxesColumnIncreasing aria-hidden="true" />
              <span>View analytics</span>
            </Link>
          </div>
          {copyState === "failed" ? (
            <span className="copy-error" role="alert">
              Copy failed — select the link manually.
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
