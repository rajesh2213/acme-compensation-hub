import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { validate } from "../../middleware/validate.js";
import {
  createSalary,
  getSalary,
  listRevisions,
  updateSalary,
} from "./salaries.controller.js";
import {
  assignSalaryBodySchema,
  employeeIdParamsSchema,
  listRevisionsQuerySchema,
  reviseSalaryBodySchema,
} from "./salaries.schemas.js";

export const salariesRouter: ExpressRouter = Router({ mergeParams: true });

salariesRouter.get(
  "/revisions",
  validate({ params: employeeIdParamsSchema, query: listRevisionsQuerySchema }),
  asyncHandler(listRevisions),
);

salariesRouter.get(
  "/",
  validate({ params: employeeIdParamsSchema }),
  asyncHandler(getSalary),
);

salariesRouter.post(
  "/",
  validate({ params: employeeIdParamsSchema, body: assignSalaryBodySchema }),
  asyncHandler(createSalary),
);

salariesRouter.patch(
  "/",
  validate({ params: employeeIdParamsSchema, body: reviseSalaryBodySchema }),
  asyncHandler(updateSalary),
);
