import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { validate } from "../../middleware/validate.js";
import { compensation, overview } from "./analytics.controller.js";
import { analyticsFiltersQuerySchema } from "./analytics.schemas.js";

export const analyticsRouter: ExpressRouter = Router();

analyticsRouter.use(asyncHandler(requireAuth));

analyticsRouter.get(
  "/overview",
  validate({ query: analyticsFiltersQuerySchema }),
  asyncHandler(overview),
);

analyticsRouter.get(
  "/compensation",
  validate({ query: analyticsFiltersQuerySchema }),
  asyncHandler(compensation),
);
