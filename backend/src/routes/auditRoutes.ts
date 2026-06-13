import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { AuditService } from "../services/AuditService";

const router = Router();
const service = new AuditService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await service.getAll("", "");
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch audit logs" });
  }
});

router.get("/entity/:entityType/:entityId", async (req: AuthRequest, res: Response) => {
  try {
    const logs = await service.getByEntity(req.params.entityType, req.params.entityId);
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch entity audit logs" });
  }
});

export default router;