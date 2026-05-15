import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = { isArchived: false };
    if (req.user!.roleName === "Agent") {
      filter.assigneeId = req.user!.id;
    }
    const tasks = await prisma.task.findMany({
      where: filter,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        assignee: { select: { firstName: true, lastName: true } },
        deal: { select: { dealNumber: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.create({
      data: { ...req.body, createdById: req.user!.id, status: "New" },
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.status === "Completed") data.completedAt = new Date();
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

export default router;
