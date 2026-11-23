import { Router, type Router as ExpressRouter } from "express";
import { getApiMeta } from "../../controllers/meta.controller.js";

export const v1Router: ExpressRouter = Router();

v1Router.get("/", getApiMeta);
