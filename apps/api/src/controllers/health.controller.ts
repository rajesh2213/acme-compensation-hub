import type { Request, Response } from "express";
import { checkDatabaseConnectivity } from "../db/prisma.js";

export function getLiveness(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}

export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const ready = await checkDatabaseConnectivity();

  if (ready) {
    res.status(200).json({ status: "ready" });
    return;
  }

  res.status(503).json({ status: "unavailable" });
}
