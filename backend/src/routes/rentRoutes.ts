import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { RentService } from "../services/RentService";
import { createRentContractSchema } from "../validators";

const router = Router();
const service = new RentService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const contracts = await service.getAll("", "");
    res.json(contracts);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch rent contracts" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createRentContractSchema.parse(req.body);
    const contract = await service.create(data, req.user!.id);
    res.status(201).json(contract);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create rent contract" });
  }
});

router.get("/billing", async (_req: AuthRequest, res: Response) => {
  try {
    const records = await service.getBilling();
    res.json(records);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch billing records" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const result = await service.update(req.params.id, data, req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await service.archive(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to delete" });
  }
});

export default router;