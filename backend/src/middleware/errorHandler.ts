import type { NextFunction, Request, Response } from "express";
import logger from "../utils/safeLogger";

type HttpError = Error & { status?: number; statusCode?: number; expose?: boolean };

export function errorHandler(error: HttpError, _req: Request, res: Response, _next: NextFunction) {
  const status = error.status || error.statusCode || 500;
  const message = status >= 500 && process.env.NODE_ENV === "production" && !error.expose
    ? "Server error"
    : error.message || "Request failed";

  if (status >= 500) logger.error("Unhandled request error", error);

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "production" ? {} : { stack: error.stack }),
  });
}
