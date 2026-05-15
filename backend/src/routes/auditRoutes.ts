import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get(
  "/entity/:entityType/:entityId",
  async (_req: AuthRequest, res: Response) => {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          entityType: _req.params.entityType,
          entityId: _req.params.entityId,
        },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity audit logs" });
    }
  },
);

export default router;
