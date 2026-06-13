import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";
import { logError } from "../utils/logger";

const router = Router();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const source = req.query.source as string;
    const search = req.query.search as string;

    const where: any = {};
    if (level) where.level = level;
    if (source) where.source = source;
    if (search) where.message = { contains: search };

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.log.count({ where }),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    logError("Failed to fetch logs", { stack: error?.stack, source: "logs" });
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.delete("/", async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    await prisma.log.deleteMany({ where: { createdAt: { lt: cutoff } } });
    res.json({ message: `Logs older than ${days} days deleted` });
  } catch (error: any) {
    logError("Failed to clean logs", { stack: error?.stack, source: "logs" });
    res.status(500).json({ error: "Failed to clean logs" });
  }
});

export default router;
