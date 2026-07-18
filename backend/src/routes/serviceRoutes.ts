import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { ServiceCaseService } from "../services/ServiceCaseService";
import { createServiceCaseSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new ServiceCaseService();

router.get("/", requirePermission("service:view"), asyncHandler(async (_req, res) => {
    const cases = await service.getAll("", "");
    res.json(cases);
}));

router.post("/", requirePermission("service:create"), asyncHandler(async (req, res) => {
    const data = createServiceCaseSchema.parse(req.body);
    const sc = await service.create(data, req.user!.id);
    res.status(201).json(sc);
}));

export default router;