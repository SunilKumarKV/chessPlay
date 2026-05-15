import type { NextFunction, Request, Response } from "express";

export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export type HttpError = Error & {
  status?: number;
  statusCode?: number;
  expose?: boolean;
};

