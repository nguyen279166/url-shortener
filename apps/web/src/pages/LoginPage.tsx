import { useEffect, useState } from "react";
import { ArrowUpRight, Link2, LockKeyhole } from "lucide-react";
import { Navigate, useLocation } from "react-router";

import { authClient } from "../lib/auth-client";

const getSafeReturnPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
};

export const LoginPage = () => {
  const { data: session, error: sessionError, isPending } =
    authClient.useSession();
  const location = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const returnTo = getSafeReturnPath(searchParams.get("returnTo"));
  const oauthError = searchParams.has("error");

  useEffect(() => {
    document.title = "Sign in | slug/";
  }, []);

  if (!isPending && session) {
    return <Navigate to={returnTo} replace />;
  }

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError(null);

    const callbackURL = new URL(returnTo, window.location.origin).toString();
    const errorCallbackURL = new URL("/login", window.location.origin);
    errorCallbackURL.searchParams.set("returnTo", returnTo);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: errorCallbackURL.toString(),
      });

      if (result.error) {
        setSignInError(
          result.error.message ?? "Google sign-in could not be started.",
        );
        setIsSigningIn(false);
      }
    } catch {
      setSignInError(
        "The authentication service is unavailable. Check the API and try again.",
      );
      setIsSigningIn(false);
    }
  };

  const visibleError =
    signInError ??
    (oauthError
      ? "Google sign-in was cancelled or could not be completed."
      : sessionError
        ? "The API could not verify your session. Make sure it is running."
        : null);

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="login-heading">
        <a className="login-brand" href="/" aria-label="slug home">
          <span className="brand-mark" aria-hidden="true">
            <Link2 />
          </span>
          <span className="brand-name">slug/</span>
        </a>

        <div className="login-story-copy">
          <span className="eyebrow">
            <LockKeyhole aria-hidden="true" /> Private operations workspace
          </span>
          <h1 id="login-heading">
            Your links.
            <br />
            Your <span>signal.</span>
          </h1>
          <p>
            Sign in to create short routes, control their availability, and
            inspect click activity from one focused workspace.
          </p>
        </div>

        <dl className="login-facts">
          <div>
            <dt>Identity</dt>
            <dd>Google OAuth</dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>HTTP-only cookie</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Owner scoped</dd>
          </div>
        </dl>
      </section>

      <section className="login-action" aria-label="Sign in">
        <div className="login-sequence" aria-hidden="true">
          <span>01</span>
          <span />
          <span>AUTH</span>
        </div>

        <div className="login-card">
          <span className="panel-kicker">Workspace access</span>
          <h2>Continue to slug/</h2>
          <p>
            Use your Google account. We only use your basic profile to identify
            which links belong to you.
          </p>

          {visibleError ? (
            <p className="login-error" role="alert">
              {visibleError}
            </p>
          ) : null}

          <button
            className="google-sign-in"
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isPending || isSigningIn}
          >
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            <span>{isSigningIn ? "Opening Google…" : "Continue with Google"}</span>
            <ArrowUpRight aria-hidden="true" />
          </button>

          <p className="login-privacy">
            The browser keeps the session cookie; the frontend never stores an
            access token in local storage.
          </p>
        </div>
      </section>
    </main>
  );
};
