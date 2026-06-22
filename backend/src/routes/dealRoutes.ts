import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { DealService } from "../services/DealService";
import { createDealSchema, updateDealStatusSchema } from "../validators";

const router = Router();
const service = new DealService();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const deals = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(deals);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch deals" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const deal = await service.getFullDetails(req.params.id);
    res.json(deal);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch deal" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createDealSchema.parse(req.body);
    if (!data.clientInn && !data.clientId) {
      return res.status(400).json({ error: "Client INN or Client ID is required" });
    }
    const deal = await service.create({ ...data, dealNumber: `D-${Date.now()}`, status: "Lead_Created", responsibleAgentId: req.user!.id }, req.user!.id);
    res.status(201).json(deal);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to create deal" });
  }
});

router.put("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { status } = updateDealStatusSchema.parse(req.body);
    const deal = await service.updateStatus(req.params.id, status, req.user!.id);
    res.json(deal);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update deal status" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const deal = await service.update(req.params.id, req.body, req.user!.id);
    res.json(deal);
  } catch (e: any) {
    console.error("DEAL UPDATE ERROR:", e?.message || e, e?.stack?.substring(0, 200));
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update deal" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await service.archive(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to delete deal" });
  }
});

export default router;