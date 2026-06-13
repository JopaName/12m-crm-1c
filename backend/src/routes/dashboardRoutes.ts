import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { DashboardService } from "../services/DashboardService";

const router = Router();
const service = new DashboardService();

router.get("/summary", async (_req: AuthRequest, res: Response) => {
  try {
    const data = await service.getSummary();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

router.get("/pipeline", async (_req: AuthRequest, res: Response) => {
  try {
    const data = await service.getPipeline();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

router.get("/finance", async (_req: AuthRequest, res: Response) => {
  try {
    const data = await service.getFinance();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch finance data" });
  }
});

router.get("/pulse", async (_req: AuthRequest, res: Response) => {
  try {
    const data = await service.getPulse();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch pulse data" });
  }
});

export default router;