import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ProductionService } from "../services/ProductionService";
import { createProductionOrderSchema } from "../validators";

const router = Router();
const service = new ProductionService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await service.getAll("", "");
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch production orders" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createProductionOrderSchema.parse(req.body);
    const order = await service.create(data, req.user!.id);
    res.status(201).json(order);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create production order" });
  }
});

router.put("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const order = await service.updateStatus(req.params.id, req.body.status, req.user!.id);
    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update production order" });
  }
});

router.get("/routes", async (_req: AuthRequest, res: Response) => {
  try {
    const routes = await service.getRoutes();
    res.json(routes);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch production routes" });
  }
});

export default router;