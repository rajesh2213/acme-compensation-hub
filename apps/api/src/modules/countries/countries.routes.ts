import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { list } from "./countries.controller.js";

export const countriesRouter: ExpressRouter = Router();

countriesRouter.use(asyncHandler(requireAuth));
countriesRouter.get("/", asyncHandler(list));
