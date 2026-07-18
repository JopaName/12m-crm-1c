import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { TelemetryService } from "../services/TelemetryService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new TelemetryService();

router.get("/devices", requirePermission("rent:view"), asyncHandler(async (_req, res) => {
    const devices = await service.getDevices();
    res.json(devices);
}));

router.get("/readings", requirePermission("rent:view"), asyncHandler(async (_req, res) => {
    const readings = await service.getReadings();
    res.json(readings);
}));

router.post("/readings", requirePermission("rent:create"), asyncHandler(async (req, res) => {
    const reading = await service.createReading(req.body);
    res.status(201).json(reading);
}));

export default router;