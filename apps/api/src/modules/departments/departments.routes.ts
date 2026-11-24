import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { list } from "./departments.controller.js";

export const departmentsRouter: ExpressRouter = Router();

departmentsRouter.use(asyncHandler(requireAuth));
departmentsRouter.get("/", asyncHandler(list));
