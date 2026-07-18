import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { LeadService } from "../services/LeadService";
import { createLeadSchema, updateLeadSchema, convertLeadSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new LeadService();

router.get("/", requirePermission("leads:view"), asyncHandler(async (req, res) => {
    const leads = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(leads);
}));

router.post("/", requirePermission("leads:create"), asyncHandler(async (req, res) => {
    const data = createLeadSchema.parse(req.body);
    const lead = await service.create(data, req.user!.id);
    res.status(201).json(lead);
}));

router.put("/:id", requirePermission("leads:edit"), asyncHandler(async (req, res) => {
    const data = updateLeadSchema.parse(req.body);
    const lead = await service.update(req.params.id, data, req.user!.id);
    res.json(lead);
}));

router.post("/:id/convert", requirePermission("leads:create"), asyncHandler(async (req, res) => {
    const data = convertLeadSchema.parse(req.body);
    const result = await service.convert(req.params.id, req.user!.id, data);
    res.status(201).json(result);
}));

export default router;