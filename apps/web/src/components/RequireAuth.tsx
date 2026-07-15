import { Navigate, Outlet, useLocation } from "react-router";

import { authClient } from "../lib/auth-client";

export const RequireAuth = () => {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <main className="auth-loading" aria-busy="true" aria-live="polite">
        <span className="auth-loading-mark" aria-hidden="true">
          /_
        </span>
        <p>Checking your workspace session…</p>
      </main>
    );
  }

  if (!session) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    const loginSearch = new URLSearchParams({ returnTo });

    return <Navigate to={`/login?${loginSearch.toString()}`} replace />;
  }

  return <Outlet />;
};
