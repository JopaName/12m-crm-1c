import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { TaskService } from "../services/TaskService";
import { createTaskSchema, updateTaskSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new TaskService();

router.get("/", requirePermission("tasks:view"), asyncHandler(async (req, res) => {
    const tasks = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(tasks);
}));

router.post("/", requirePermission("tasks:create"), asyncHandler(async (req, res) => {
    const data = createTaskSchema.parse(req.body);
    const task = await service.create(data, req.user!.id);
    res.status(201).json(task);
}));

router.put("/:id", requirePermission("tasks:edit"), asyncHandler(async (req, res) => {
    const data = updateTaskSchema.parse(req.body);
    const task = await service.update(req.params.id, data, req.user!.id);
    res.json(task);
}));

export default router;