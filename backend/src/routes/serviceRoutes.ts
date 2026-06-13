import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ServiceCaseService } from "../services/ServiceCaseService";
import { createServiceCaseSchema } from "../validators";

const router = Router();
const service = new ServiceCaseService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const cases = await service.getAll("", "");
    res.json(cases);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch service cases" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createServiceCaseSchema.parse(req.body);
    const sc = await service.create(data, req.user!.id);
    res.status(201).json(sc);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create service case" });
  }
});

export default router;