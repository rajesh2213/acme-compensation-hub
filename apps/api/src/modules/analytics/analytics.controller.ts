import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import type { AnalyticsFiltersQuery } from "./analytics.schemas.js";
import {
  getCompensationAnalytics,
  getOverviewAnalytics,
} from "./analytics.service.js";

export async function overview(req: Request, res: Response): Promise<void> {
  const filters = req.query as unknown as AnalyticsFiltersQuery;
  const data = await getOverviewAnalytics(filters);
  sendSuccess(res, data);
}

export async function compensation(req: Request, res: Response): Promise<void> {
  const filters = req.query as unknown as AnalyticsFiltersQuery;
  const data = await getCompensationAnalytics(filters);
  sendSuccess(res, data);
}
