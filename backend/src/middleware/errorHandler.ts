import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("Error:", err);

  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: "Duplicate entry", field: err.meta?.target });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
