import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/logs", async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.integrationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch integration logs" });
  }
});

router.post("/sync/1c", async (req: AuthRequest, res: Response) => {
  try {
    const log = await prisma.integrationLog.create({
      data: {
        direction: "Incoming",
        system: "1C",
        status: "Success",
        request: JSON.stringify(req.body),
        createdById: req.user!.id,
      },
    });
    res.json({ message: "1C sync received", log });
  } catch (error) {
    res.status(500).json({ error: "1C sync failed" });
  }
});

router.post("/sync/finance-table", async (req: AuthRequest, res: Response) => {
  try {
    const log = await prisma.integrationLog.create({
      data: {
        direction: req.body.direction || "Incoming",
        system: "FinanceTable",
        status: "Success",
        request: JSON.stringify(req.body),
        createdById: req.user!.id,
      },
    });
    res.json({ message: "Finance table sync received", log });
  } catch (error) {
    res.status(500).json({ error: "Finance table sync failed" });
  }
});

router.post("/weather", async (req: AuthRequest, res: Response) => {
  try {
    const log = await prisma.integrationLog.create({
      data: {
        direction: "Incoming",
        system: "Weather",
        status: "Success",
        request: JSON.stringify(req.body),
        createdById: req.user!.id,
      },
    });
    res.json({ message: "Weather data received", log });
  } catch (error) {
    res.status(500).json({ error: "Failed to process weather data" });
  }
});

export default router;
