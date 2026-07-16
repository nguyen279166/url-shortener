import { Check, Clipboard, TriangleAlert } from "lucide-react";

import { useClipboardCopy } from "../hooks/useClipboardCopy";
import { getShortUrl } from "../lib/api";

type CopyShortLinkButtonProps = {
  shortPath: string;
  slug: string;
  showLabel?: boolean;
};

export const CopyShortLinkButton = ({
  shortPath,
  slug,
  showLabel = false,
}: CopyShortLinkButtonProps) => {
  const { copyState, copyText } = useClipboardCopy();
  const shortUrl = getShortUrl(shortPath);
  const visibleLabel =
    copyState === "copied" ? "Copied" : copyState === "failed" ? "Retry" : "Copy";
  const title =
    copyState === "copied"
      ? "Short link copied"
      : copyState === "failed"
        ? "Copy failed — try again"
        : "Copy short link";
  const announcement =
    copyState === "copied"
      ? `Copied short link /${slug}`
      : copyState === "failed"
        ? `Could not copy short link /${slug}`
        : "";

  const handleCopy = () => {
    void copyText(shortUrl);
  };

  return (
    <span className="short-link-copy-control">
      <button
        className={`short-link-copy-button${
          showLabel ? " short-link-copy-button--labeled" : ""
        }`}
        type="button"
        onClick={handleCopy}
        data-copy-state={copyState}
        aria-label={`${title}: /${slug}`}
        title={title}
      >
        {copyState === "copied" ? (
          <Check aria-hidden="true" />
        ) : copyState === "failed" ? (
          <TriangleAlert aria-hidden="true" />
        ) : (
          <Clipboard aria-hidden="true" />
        )}
        {showLabel ? <span>{visibleLabel}</span> : null}
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </span>
  );
};
