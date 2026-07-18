import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { InvoiceService } from "../services/InvoiceService";
import { createInvoiceSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new InvoiceService();

router.get("/", requirePermission("finance:view"), asyncHandler(async (_req, res) => {
    const invoices = await service.getAll("", "");
    res.json(invoices);
}));

router.post("/", requirePermission("finance:create"), asyncHandler(async (req, res) => {
    const data = createInvoiceSchema.parse(req.body);
    const invoice = await service.create(data, req.user!.id);
    res.status(201).json(invoice);
}));

export default router;