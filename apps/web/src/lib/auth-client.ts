import { createAuthClient } from "better-auth/react";

import { API_URL } from "./api";

export const AUTH_BASE_PATH = "/api/google-callback/auth";

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: AUTH_BASE_PATH,
  fetchOptions: {
    credentials: "include",
  },
});
