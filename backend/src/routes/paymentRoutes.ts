import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { PaymentService } from "../services/PaymentService";
import { createPaymentSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new PaymentService();

router.get("/", requirePermission("finance:view"), asyncHandler(async (_req, res) => {
    const payments = await service.getAll("", "");
    res.json(payments);
}));

router.post("/", requirePermission("finance:create"), asyncHandler(async (req, res) => {
    const data = createPaymentSchema.parse(req.body);
    const payment = await service.create(data, req.user!.id);
    res.status(201).json(payment);
}));

router.put("/:id/confirm", requirePermission("finance:edit"), asyncHandler(async (req, res) => {
    const payment = await service.confirm(req.params.id, req.user!.id);
    res.json(payment);
}));

export default router;