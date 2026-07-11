import { z } from "zod";

const customAliasSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .min(3, "Custom alias must be at least 3 characters")
    .max(64, "Custom alias must be at most 64 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Custom alias can only contain letters, numbers, dashes, and underscores",
    )
    .transform((value) => value.toLowerCase())
    .optional(),
);

const futureDatetimeSchema = z.iso.datetime().refine(
  (value) => new Date(value).getTime() > Date.now(),
  "Expiration date must be in the future",
);

export const createLinkSchema = z
  .object({
    url: z
      .url()
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "URL must start with http:// or https://",
      ),
    customAlias: customAliasSchema,
    expiresAt: futureDatetimeSchema.optional(),
  })
  .strict();

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

export const linkSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(64, "Slug must be at most 64 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Slug can only contain letters, numbers, dashes, and underscores",
    )
    .transform((value) => value.toLowerCase()),
});
