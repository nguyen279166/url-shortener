import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { getApiHealth } from "../lib/api";

type ApiStatus = "checking" | "connected" | "offline";

const getPageTitle = (pathname: string) => {
  if (pathname === "/links") return "Links | slug/";
  if (pathname.startsWith("/links/")) return "Link detail | slug/";
  if (pathname === "/") return "slug/ | Link operations";

  return "Not found | slug/";
};

export const AppLayout = () => {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const location = useLocation();
  const hasNavigated = useRef(false);

  useEffect(() => {
    let shouldIgnore = false;

    void getApiHealth()
      .then(() => {
        if (!shouldIgnore) setApiStatus("connected");
      })
      .catch(() => {
        if (!shouldIgnore) setApiStatus("offline");
      });

    return () => {
      shouldIgnore = true;
    };
  }, []);

  useEffect(() => {
    document.title = getPageTitle(location.pathname);

    const hashTarget = location.hash
      ? document.querySelector<HTMLElement>(location.hash)
      : null;

    if (hashTarget) {
      hashTarget.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    if (hasNavigated.current) {
      document.querySelector<HTMLElement>("#main-content")?.focus();
    } else {
      hasNavigated.current = true;
    }
  }, [location.hash, location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <Link className="brand" to="/" aria-label="slug home">
          <span className="brand-mark" aria-hidden="true">
            <Link2 />
          </span>
          <span className="brand-name">slug/</span>
          <span className="brand-note">link operations</span>
        </Link>

        <nav aria-label="Primary navigation">
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/links">All links</NavLink>
          <Link to="/#create">Create</Link>
        </nav>

        <div className="api-status" data-status={apiStatus} aria-live="polite">
          <span aria-hidden="true" />
          API {apiStatus}
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer>
        <span>slug/</span>
        <p>Built around redirects, not decoration.</p>
        <Link to="/">Overview</Link>
      </footer>
    </div>
  );
};
