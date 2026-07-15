import { useEffect, useRef, useState } from "react";
import { Link2, LogOut, Plus } from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

import { getApiHealth } from "../lib/api";
import { authClient } from "../lib/auth-client";

type ApiStatus = "checking" | "connected" | "offline";

const getPageTitle = (pathname: string) => {
  if (pathname === "/new") return "Create link | slug/";
  if (pathname === "/links") return "Links | slug/";
  if (pathname.startsWith("/links/")) return "Link detail | slug/";
  if (pathname === "/") return "Dashboard | slug/";

  return "Not found | slug/";
};

export const AppLayout = () => {
  const { data: session } = authClient.useSession();
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  const userLabel = session?.user.name || session?.user.email || "Account";
  const userInitial = userLabel.trim().charAt(0).toUpperCase() || "U";

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(false);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setSignOutError(true);
        setIsSigningOut(false);
        return;
      }

      navigate("/login", { replace: true });
    } catch {
      setSignOutError(true);
      setIsSigningOut(false);
    }
  };

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
            Dashboard
          </NavLink>
          <NavLink to="/links">All links</NavLink>
        </nav>

        <div className="header-actions">
          <NavLink
            className="new-link-cta"
            to="/new"
            aria-label="Create new link"
          >
            <Plus aria-hidden="true" />
            <span>New link</span>
          </NavLink>

          <div className="api-status" data-status={apiStatus} aria-live="polite">
            <span aria-hidden="true" />
            API {apiStatus}
          </div>

          <div className="account-summary">
            <span className="account-avatar" aria-hidden="true">
              {session?.user.image ? (
                <img src={session.user.image} alt="" referrerPolicy="no-referrer" />
              ) : (
                userInitial
              )}
            </span>
            <span className="account-identity">
              <strong>{userLabel}</strong>
              <span>{session?.user.email}</span>
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              aria-label={isSigningOut ? "Signing out" : "Sign out"}
              title={signOutError ? "Sign out failed. Try again." : "Sign out"}
            >
              <LogOut aria-hidden="true" />
            </button>
            {signOutError ? (
              <span className="sr-only" role="alert">
                Sign out failed. Please try again.
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer>
        <span>slug/</span>
        <p>Built around redirects, not decoration.</p>
        <Link to="/">Dashboard</Link>
      </footer>
    </div>
  );
};
