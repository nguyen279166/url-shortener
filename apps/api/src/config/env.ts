import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.url().optional(),
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
