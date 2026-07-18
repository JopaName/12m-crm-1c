import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { IntegrationService } from "../services/IntegrationService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new IntegrationService();

router.get("/logs", requirePermission("integrations:view"), asyncHandler(async (_req, res) => {
    const logs = await service.getLogs();
    res.json(logs);
}));

router.post("/sync/1c", requirePermission("integrations:create"), asyncHandler(async (req, res) => {
    const log = await service.createLog({
      direction: "Incoming",
      system: "1C",
      status: "Success",
      request: JSON.stringify(req.body),
      createdById: req.user!.id,
    });
    res.json({ message: "1C sync received", log });
}));

router.post("/sync/finance-table", requirePermission("integrations:create"), asyncHandler(async (req, res) => {
    const log = await service.createLog({
      direction: req.body.direction || "Incoming",
      system: "FinanceTable",
      status: "Success",
      request: JSON.stringify(req.body),
      createdById: req.user!.id,
    });
    res.json({ message: "Finance table sync received", log });
}));

router.post("/weather", requirePermission("integrations:create"), asyncHandler(async (req, res) => {
    const log = await service.createLog({
      direction: "Incoming",
      system: "Weather",
      status: "Success",
      request: JSON.stringify(req.body),
      createdById: req.user!.id,
    });
    res.json({ message: "Weather data received", log });
}));

export default router;