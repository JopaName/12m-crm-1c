import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";

type AsyncRouteHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };
}