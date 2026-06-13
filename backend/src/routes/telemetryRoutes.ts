import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { TelemetryService } from "../services/TelemetryService";

const router = Router();
const service = new TelemetryService();

router.get("/devices", async (_req: AuthRequest, res: Response) => {
  try {
    const devices = await service.getDevices();
    res.json(devices);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch telemetry devices" });
  }
});

router.get("/readings", async (_req: AuthRequest, res: Response) => {
  try {
    const readings = await service.getReadings();
    res.json(readings);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch telemetry readings" });
  }
});

router.post("/readings", async (req: AuthRequest, res: Response) => {
  try {
    const reading = await service.createReading(req.body);
    res.status(201).json(reading);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create telemetry reading" });
  }
});

export default router;