import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const cases = await prisma.serviceCase.findMany({
      where: { isArchived: false },
      include: { client: true, deal: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch service cases" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const serviceCase = await prisma.serviceCase.create({
      data: { ...req.body, status: "New" },
    });
    res.status(201).json(serviceCase);
  } catch (error) {
    res.status(500).json({ error: "Failed to create service case" });
  }
});

export default router;
