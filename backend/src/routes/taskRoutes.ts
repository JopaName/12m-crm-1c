import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { TaskService } from "../services/TaskService";
import { createTaskSchema, updateTaskSchema } from "../validators";

const router = Router();
const service = new TaskService();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(tasks);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const task = await service.create(data, req.user!.id);
    res.status(201).json(task);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const task = await service.update(req.params.id, data, req.user!.id);
    res.json(task);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to update task" });
  }
});

export default router;