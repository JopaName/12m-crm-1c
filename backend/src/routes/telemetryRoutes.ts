import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/devices", async (_req: AuthRequest, res: Response) => {
  try {
    const devices = await prisma.telemetryDevice.findMany({
      where: { isArchived: false },
      include: { readings: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch telemetry devices" });
  }
});

router.get("/readings", async (_req: AuthRequest, res: Response) => {
  try {
    const readings = await prisma.telemetryReading.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { rentContract: { include: { client: true } }, device: true },
    });
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch telemetry readings" });
  }
});

router.post("/readings", async (req: AuthRequest, res: Response) => {
  try {
    const reading = await prisma.telemetryReading.create({
      data: { ...req.body, verificationStatus: "Unverified" },
    });
    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ error: "Failed to create telemetry reading" });
  }
});

export default router;
