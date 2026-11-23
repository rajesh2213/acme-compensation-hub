import { Router, type Router as ExpressRouter } from "express";
import { getLiveness, getReadiness } from "../controllers/health.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const healthRouter: ExpressRouter = Router();

healthRouter.get("/health", getLiveness);
healthRouter.get("/health/ready", asyncHandler(getReadiness));
