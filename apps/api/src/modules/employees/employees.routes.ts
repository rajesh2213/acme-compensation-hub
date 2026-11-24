import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { validate } from "../../middleware/validate.js";
import {
  create,
  getById,
  list,
  update,
} from "./employees.controller.js";
import {
  createEmployeeBodySchema,
  employeeIdParamsSchema,
  listEmployeesQuerySchema,
  updateEmployeeBodySchema,
} from "./employees.schemas.js";

export const employeesRouter: ExpressRouter = Router();

employeesRouter.use(asyncHandler(requireAuth));

employeesRouter.get(
  "/",
  validate({ query: listEmployeesQuerySchema }),
  asyncHandler(list),
);

employeesRouter.get(
  "/:id",
  validate({ params: employeeIdParamsSchema }),
  asyncHandler(getById),
);

employeesRouter.post(
  "/",
  validate({ body: createEmployeeBodySchema }),
  asyncHandler(create),
);

employeesRouter.patch(
  "/:id",
  validate({ params: employeeIdParamsSchema, body: updateEmployeeBodySchema }),
  asyncHandler(update),
);
