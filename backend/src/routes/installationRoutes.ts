import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { InstallationService } from "../services/InstallationService";
import { createInstallationTaskSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const service = new InstallationService();

router.get("/", requirePermission("installation:view"), asyncHandler(async (_req, res) => {
    const tasks = await service.getAll("", "");
    res.json(tasks);
}));

router.post("/", requirePermission("installation:create"), asyncHandler(async (req, res) => {
    const data = createInstallationTaskSchema.parse(req.body);
    const task = await service.create(data, req.user!.id);
    res.status(201).json(task);
}));

router.put("/:id", requirePermission("installation:edit"), asyncHandler(async (req, res) => {
    const task = await service.update(req.params.id, req.body, req.user!.id);
    res.json(task);
}));

router.get("/calendar", requirePermission("installation:view"), asyncHandler(async (_req, res) => {
    const events = await service.getCalendar();
    res.json(events);
}));

export default router;