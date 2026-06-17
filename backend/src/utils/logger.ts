import { prisma } from "../db";

export async function logError(message: any, opts?: {
  level?: string;
  source?: string;
  stack?: string;
  metadata?: any;
  url?: string;
  userId?: string;
}) {
  try {
    const msg = typeof message === "string" ? message : message?.message || JSON.stringify(message);
    await prisma.log.create({
      data: {
        level: opts?.level || "error",
        message: msg,
        source: opts?.source || "app",
        stack: opts?.stack || null,
        metadata: opts?.metadata ? JSON.stringify(opts.metadata) : null,
        url: opts?.url || null,
        userId: opts?.userId || null,
      },
    });
  } catch (e) {
    console.error("Logger failed:", e);
  }
}

export function errorHandler(err: any, req: any, res: any, next: any) {
  const message = err?.message || "Unknown error";
  logError(message, {
    stack: err?.stack,
    url: req?.originalUrl,
    userId: req?.user?.id,
    source: "express",
    metadata: { method: req?.method, body: req?.body },
  });
  res.status(500).json({ error: "Internal server error" });
}
