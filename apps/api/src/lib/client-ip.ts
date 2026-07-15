import { isIP } from "node:net";

import type { Request } from "express";

const CLIENT_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
] as const;

const getSingleIpHeader = (request: Request, headerName: string) => {
  const value = request.get(headerName)?.trim();

  if (!value || value.includes(",") || isIP(value) === 0) {
    return undefined;
  }

  return value;
};

export const getClientIp = (request: Request) => {
  for (const headerName of CLIENT_IP_HEADERS) {
    const ipAddress = getSingleIpHeader(request, headerName);

    if (ipAddress) {
      return ipAddress;
    }
  }

  return request.ip ?? request.socket.remoteAddress;
};
