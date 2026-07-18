import fs from "fs";
import path from "path";

const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function logFilePath(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return path.join(logsDir, `error-${y}-${m}-${day}.log`);
}

export function logError(message: any, opts?: {
  level?: string;
  source?: string;
  stack?: string;
  metadata?: any;
  url?: string;
  userId?: string;
}) {
  const level = opts?.level || "error";
  const source = opts?.source || "app";
  const msg = typeof message === "string" ? message : message?.message || JSON.stringify(message);
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message: msg, source, stack: opts?.stack || null, url: opts?.url || null, userId: opts?.userId || null, metadata: opts?.metadata || null };
  const line = JSON.stringify(entry);

  console.error(line);

  try {
    fs.appendFileSync(logFilePath(), line + "\n");
  } catch {}
}

export function errorHandler(err: any, req: any, res: any, _next: any) {
  if (err?.issues) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }

  if (err?.code === "P2002") {
    return res.status(409).json({ error: "Duplicate entry", field: err.meta?.target });
  }

  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  if (err?.code === "NOT_FOUND" || err?.statusCode === 404) {
    return res.status(404).json({ error: err.message || "Not found" });
  }

  const message = err?.message || "Unknown error";
  logError(message, {
    stack: err?.stack,
    url: req?.originalUrl,
    userId: req?.user?.id,
    source: "express",
    metadata: { method: req?.method, body: req?.body },
  });

  res.status(err?.statusCode || err?.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err?.stack }),
  });
}
