import type { Request } from "express";
import { AppError } from "./errors.js";

function originFromReferer(referer: string): string | null {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function assertTrustedOrigin(
  req: Request,
  trustedOrigins: string[],
): void {
  const originHeader = req.get("origin")?.trim();
  if (originHeader) {
    if (!trustedOrigins.includes(originHeader)) {
      throw new AppError(403, "ORIGIN_FORBIDDEN", "Origin is not allowed");
    }
    return;
  }

  const refererHeader = req.get("referer")?.trim();
  if (refererHeader) {
    const refererOrigin = originFromReferer(refererHeader);
    if (!refererOrigin || !trustedOrigins.includes(refererOrigin)) {
      throw new AppError(403, "ORIGIN_FORBIDDEN", "Origin is not allowed");
    }
    return;
  }

  throw new AppError(
    403,
    "ORIGIN_FORBIDDEN",
    "Origin or Referer header is required",
  );
}
