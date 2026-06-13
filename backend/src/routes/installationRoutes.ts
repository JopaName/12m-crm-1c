import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { InstallationService } from "../services/InstallationService";
import { createInstallationTaskSchema } from "../validators";

const router = Router();
const service = new InstallationService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const tasks = await service.getAll("", "");
    res.json(tasks);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch installation tasks" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createInstallationTaskSchema.parse(req.body);
    const task = await service.create(data, req.user!.id);
    res.status(201).json(task);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create installation task" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const task = await service.update(req.params.id, req.body, req.user!.id);
    res.json(task);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update installation task" });
  }
});

router.get("/calendar", async (_req: AuthRequest, res: Response) => {
  try {
    const events = await service.getCalendar();
    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch calendar" });
  }
});

export default router;