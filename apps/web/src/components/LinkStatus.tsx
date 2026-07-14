import type { ShortLink } from "../types/link";
import { getLinkStatus } from "../utils/link";

type LinkStatusProps = {
  link: ShortLink;
};

export const LinkStatus = ({ link }: LinkStatusProps) => {
  const status = getLinkStatus(link);

  return (
    <span className="status-label" data-status={status.kind}>
      <span aria-hidden="true" />
      {status.label}
    </span>
  );
};
