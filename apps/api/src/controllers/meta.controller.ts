import type { Request, Response } from "express";
import { sendSuccess } from "../lib/response.js";

/** Minimal versioned API surface for convention checks — no business data. */
export function getApiMeta(_req: Request, res: Response): void {
  sendSuccess(res, {
    name: "acme-compensation-hub-api",
    version: "v1",
  });
}
