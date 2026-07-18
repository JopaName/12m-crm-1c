import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { ProductionService } from "../services/ProductionService";
import { createProductionOrderSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new ProductionService();

router.get("/", requirePermission("production:view"), asyncHandler(async (_req, res) => {
    const orders = await service.getAll("", "");
    res.json(orders);
}));

router.post("/", requirePermission("production:create"), asyncHandler(async (req, res) => {
    const data = createProductionOrderSchema.parse(req.body);
    const order = await service.create(data, req.user!.id);
    res.status(201).json(order);
}));

router.put("/:id/status", requirePermission("production:edit"), asyncHandler(async (req, res) => {
    const order = await service.updateStatus(req.params.id, req.body.status, req.user!.id);
    res.json(order);
}));

router.get("/routes", requirePermission("production:view"), asyncHandler(async (_req, res) => {
    const routes = await service.getRoutes();
    res.json(routes);
}));

export default router;