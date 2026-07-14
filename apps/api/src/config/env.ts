import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.url().optional(),
  CREATE_LINK_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  TRUST_PROXY_HOPS: z.coerce.number().int().positive().default(1),
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

export const env = result.data;
