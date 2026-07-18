import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { logError } from "../utils/logger";
import fs from "fs";
import path from "path";

const router = Router();
const logsDir = path.join(__dirname, "../../logs");

router.get("/", requirePermission("audit:view"), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const source = req.query.source as string;
    const search = req.query.search as string || "";

    if (!fs.existsSync(logsDir)) {
      return res.json({ logs: [], total: 0, page, totalPages: 0 });
    }

    const files = fs.readdirSync(logsDir)
      .filter(f => f.endsWith(".log"))
      .sort()
      .reverse();

    let allEntries: any[] = [];
    for (const fname of files) {
      const content = fs.readFileSync(path.join(logsDir, fname), "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (level && entry.level !== level) continue;
          if (source && entry.source !== source) continue;
          if (search && !entry.message.toLowerCase().includes(search.toLowerCase())) continue;
          allEntries.push(entry);
        } catch {}
      }
    }

    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const total = allEntries.length;
    const start = (page - 1) * limit;
    const logs = allEntries.slice(start, start + limit);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    logError("Failed to fetch logs", { stack: error?.stack, source: "logs" });
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.delete("/", requirePermission("audit:delete"), async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = Date.now() - days * 86400000;

    if (!fs.existsSync(logsDir)) {
      return res.json({ message: "No logs directory" });
    }

    const files = fs.readdirSync(logsDir).filter(f => f.endsWith(".log"));
    for (const fname of files) {
      const fp = path.join(logsDir, fname);
      const stat = fs.statSync(fp);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fp);
      }
    }
    res.json({ message: `Logs older than ${days} days deleted` });
  } catch (error: any) {
    logError("Failed to clean logs", { stack: error?.stack, source: "logs" });
    res.status(500).json({ error: "Failed to clean logs" });
  }
});

export default router;
