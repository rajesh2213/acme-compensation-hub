import { Router, type Router as ExpressRouter } from "express";
import { getApiMeta } from "../../controllers/meta.controller.js";
import { analyticsRouter } from "../../modules/analytics/analytics.routes.js";
import { authRouter } from "../../modules/auth/auth.routes.js";
import { countriesRouter } from "../../modules/countries/countries.routes.js";
import { departmentsRouter } from "../../modules/departments/departments.routes.js";
import { employeesRouter } from "../../modules/employees/employees.routes.js";

export const v1Router: ExpressRouter = Router();

v1Router.get("/", getApiMeta);
v1Router.use("/auth", authRouter);
v1Router.use("/countries", countriesRouter);
v1Router.use("/departments", departmentsRouter);
v1Router.use("/employees", employeesRouter);
v1Router.use("/analytics", analyticsRouter);
