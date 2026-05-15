import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { autoCalculateInstallationCost } from "../services/salaryService";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.installationTask.findMany({
      where: { isArchived: false },
      include: {
        deal: { include: { client: true } },
        installer: {
          select: { firstName: true, lastName: true, roleId: true },
        },
        calendarEvents: true,
      },
      orderBy: { installDate: "desc" },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch installation tasks" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.installationTask.create({
      data: { ...req.body, status: "Scheduled" },
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to create installation task" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.installationTask.update({
      where: { id: req.params.id },
      data: req.body,
    });

    if (req.body.status === "Completed") {
      await autoCalculateInstallationCost(req.params.id);
    }

    const updated = await prisma.installationTask.findUnique({
      where: { id: req.params.id },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update installation task" });
  }
});

router.get("/calendar", async (_req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.installationCalendarEvent.findMany({
      where: { isArchived: false },
      include: {
        installationTask: { include: { deal: { include: { client: true } } } },
      },
      orderBy: { startDate: "asc" },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch calendar" });
  }
});

export default router;
