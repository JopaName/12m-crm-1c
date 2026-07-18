import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { RoleService } from "../services/RoleService";
import { createRoleSchema, updateRoleSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.use(authMiddleware);
const service = new RoleService();

router.get("/", requirePermission("roles:view"), asyncHandler(async (req, res) => {
    const roles = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(roles);
}));

router.get("/:id", requirePermission("roles:view"), asyncHandler(async (req, res) => {
    const role = await service.getById(req.params.id);
    res.json(role);
}));

router.post("/", requirePermission("roles:create"), asyncHandler(async (req, res) => {
    const data = createRoleSchema.parse(req.body);
    const role = await service.create(data, req.user!.id);
    res.status(201).json(role);
}));

router.put("/:id", requirePermission("roles:edit"), asyncHandler(async (req, res) => {
    const data = updateRoleSchema.parse(req.body);
    const role = await service.update(req.params.id, data, req.user!.id);
    res.json(role);
}));

router.delete("/:id", requirePermission("roles:delete"), asyncHandler(async (req, res) => {
    await service.archive(req.params.id, req.user!.id);
    res.json({ success: true });
}));

export default router;