import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { RentService } from "../services/RentService";
import { createRentContractSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new RentService();

router.get("/", requirePermission("rent:view"), asyncHandler(async (_req, res) => {
    const contracts = await service.getAll("", "");
    res.json(contracts);
}));

router.post("/", requirePermission("rent:create"), asyncHandler(async (req, res) => {
    const data = createRentContractSchema.parse(req.body);
    const contract = await service.create(data, req.user!.id);
    res.status(201).json(contract);
}));

router.get("/billing", requirePermission("rent:view"), asyncHandler(async (_req, res) => {
    const records = await service.getBilling();
    res.json(records);
}));

router.put("/:id", requirePermission("rent:edit"), asyncHandler(async (req, res) => {
    const data = req.body;
    const result = await service.update(req.params.id, data, req.user!.id);
    res.json(result);
}));

router.delete("/:id", requirePermission("rent:delete"), asyncHandler(async (req, res) => {
    await service.archive(req.params.id, req.user!.id);
    res.json({ success: true });
}));

export default router;