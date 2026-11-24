import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { loginRateLimit } from "../../middleware/login-rate-limit.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { validate } from "../../middleware/validate.js";
import { getCsrfToken, login, logout, me } from "./auth.controller.js";
import { loginBodySchema } from "./auth.schemas.js";

export const authRouter: ExpressRouter = Router();

authRouter.get("/csrf", asyncHandler(getCsrfToken));

authRouter.post(
  "/login",
  loginRateLimit,
  validate({ body: loginBodySchema }),
  asyncHandler(login),
);

authRouter.post("/logout", asyncHandler(requireAuth), asyncHandler(logout));

authRouter.get("/me", asyncHandler(requireAuth), asyncHandler(me));
