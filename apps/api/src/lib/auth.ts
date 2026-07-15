import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

export const AUTH_BASE_PATH = "/api/google-callback/auth";

const DEVELOPMENT_AUTH_SECRET =
  "development-only-secret-change-before-production";

const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          prompt: "select_account" as const,
        },
      }
    : {};

export const auth = betterAuth({
  appName: "slug",
  baseURL: env.BETTER_AUTH_URL,
  basePath: AUTH_BASE_PATH,
  secret: env.BETTER_AUTH_SECRET ?? DEVELOPMENT_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [env.WEB_ORIGIN],
  socialProviders,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: "url-shortener",
    ipAddress: {
      // Production auth traffic reaches Render through the Vercel rewrite.
      // Vercel overwrites this header with the connecting client's public IP,
      // so Better Auth can rate-limit users independently instead of sharing
      // one fallback bucket for every request.
      ipAddressHeaders:
        env.NODE_ENV === "production"
          ? ["x-vercel-forwarded-for"]
          : ["x-forwarded-for"],
    },
    database: {
      generateId: "uuid",
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
