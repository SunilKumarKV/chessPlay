import type { NextFunction, Request, Response } from "express";
import type { AsyncRouteHandler, HttpError } from "../types/http.js";
import { logger } from "../utils/logger.js";

export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(
  error: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = error.status || error.statusCode || 500;
  const message =
    status >= 500 && !error.expose
      ? "Server error"
      : error.message || "Request failed";

  if (status >= 500) {
    logger.error("Unhandled request error:", error);
  }

  res.status(status).json({ message });
}

