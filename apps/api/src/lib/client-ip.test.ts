import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { getClientIp } from "./client-ip.js";

const createRequest = (
  headers: Record<string, string> = {},
  ipAddress = "127.0.0.1",
) =>
  ({
    get: (headerName: string) => headers[headerName.toLowerCase()],
    ip: ipAddress,
    socket: { remoteAddress: ipAddress },
  }) as Request;

describe("getClientIp", () => {
  it("prefers the client IP overwritten by Vercel", () => {
    const request = createRequest({
      "x-vercel-forwarded-for": "203.0.113.10",
      "cf-connecting-ip": "203.0.113.20",
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("uses the Cloudflare client IP for the public redirect domain", () => {
    const request = createRequest({ "cf-connecting-ip": "2001:db8::10" });

    expect(getClientIp(request)).toBe("2001:db8::10");
  });

  it("rejects forwarded chains and invalid values before falling back", () => {
    const request = createRequest(
      {
        "x-vercel-forwarded-for": "198.51.100.1, 198.51.100.2",
        "cf-connecting-ip": "not-an-ip",
      },
      "192.0.2.25",
    );

    expect(getClientIp(request)).toBe("192.0.2.25");
  });
});
