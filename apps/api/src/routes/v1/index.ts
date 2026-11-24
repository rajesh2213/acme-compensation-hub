import { Router, type Router as ExpressRouter } from "express";
import { getApiMeta } from "../../controllers/meta.controller.js";
import { authRouter } from "../../modules/auth/auth.routes.js";
import { employeesRouter } from "../../modules/employees/employees.routes.js";

export const v1Router: ExpressRouter = Router();

v1Router.get("/", getApiMeta);
v1Router.use("/auth", authRouter);
v1Router.use("/employees", employeesRouter);
