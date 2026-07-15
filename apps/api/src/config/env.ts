import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1).optional(),
    REDIS_URL: z.url().optional(),
    WEB_ORIGIN: z.url().default("http://localhost:5173"),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    CREATE_LINK_RATE_LIMIT: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    TRUST_PROXY_HOPS: z.coerce.number().int().positive().default(1),
  })
  .superRefine((env, context) => {
    const hasGoogleClientId = Boolean(env.GOOGLE_CLIENT_ID);
    const hasGoogleClientSecret = Boolean(env.GOOGLE_CLIENT_SECRET);

    if (hasGoogleClientId !== hasGoogleClientSecret) {
      context.addIssue({
        code: "custom",
        path: [hasGoogleClientId ? "GOOGLE_CLIENT_SECRET" : "GOOGLE_CLIENT_ID"],
        message: "Google OAuth client ID and secret must be configured together",
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables", result.error.flatten().fieldErrors);
  process.exit(1);
}

if (result.data.NODE_ENV !== "test" && !result.data.DATABASE_URL) {
  console.error("Invalid environment variables", {
    DATABASE_URL: ["DATABASE_URL is required"],
  });
  process.exit(1);
}

if (result.data.NODE_ENV === "production" && !result.data.BETTER_AUTH_SECRET) {
  console.error("Invalid environment variables", {
    BETTER_AUTH_SECRET: ["BETTER_AUTH_SECRET is required in production"],
  });
  process.exit(1);
}

if (
  result.data.NODE_ENV === "production" &&
  (!result.data.GOOGLE_CLIENT_ID || !result.data.GOOGLE_CLIENT_SECRET)
) {
  console.error("Invalid environment variables", {
    GOOGLE_CLIENT_ID: ["Google OAuth credentials are required in production"],
    GOOGLE_CLIENT_SECRET: [
      "Google OAuth credentials are required in production",
    ],
  });
  process.exit(1);
}

export const env = result.data;
