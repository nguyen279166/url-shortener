import { describe, expect, it } from "vitest";

import { createLinkSchema, linkSlugParamsSchema } from "./link.schema.js";

describe("link schemas", () => {
  it("normalizes new custom aliases to lowercase", () => {
    const input = createLinkSchema.parse({
      url: "https://example.com/article",
      customAlias: "Launch-Notes",
    });

    expect(input.customAlias).toBe("launch-notes");
  });

  it("preserves route casing so legacy generated slugs still resolve", () => {
    const params = linkSlugParamsSchema.parse({ slug: "aB3_XyZ" });

    expect(params.slug).toBe("aB3_XyZ");
  });
});
