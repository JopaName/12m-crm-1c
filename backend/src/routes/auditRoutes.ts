import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { AuditService } from "../services/AuditService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new AuditService();

router.get("/", requirePermission("audit:view"), asyncHandler(async (_req, res) => {
    const logs = await service.getAll("", "");
    res.json(logs);
}));

router.get("/entity/:entityType/:entityId", requirePermission("audit:view"), asyncHandler(async (req, res) => {
    const logs = await service.getByEntity(req.params.entityType, req.params.entityId);
    res.json(logs);
}));

export default router;