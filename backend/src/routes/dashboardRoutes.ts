import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { DashboardService } from "../services/DashboardService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new DashboardService();

router.get("/summary", requirePermission("dashboard:view"), asyncHandler(async (_req, res) => {
    const data = await service.getSummary();
    res.json(data);
}));

router.get("/pipeline", requirePermission("dashboard:view"), asyncHandler(async (_req, res) => {
    const data = await service.getPipeline();
    res.json(data);
}));

router.get("/finance", requirePermission("dashboard:view"), asyncHandler(async (_req, res) => {
    const data = await service.getFinance();
    res.json(data);
}));

router.get("/pulse", requirePermission("dashboard:view"), asyncHandler(async (_req, res) => {
    const data = await service.getPulse();
    res.json(data);
}));

export default router;