import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { LeadService } from "../services/LeadService";
import { createLeadSchema, updateLeadSchema, convertLeadSchema } from "../validators";

const router = Router();
const service = new LeadService();

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const leads = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(leads);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch leads" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createLeadSchema.parse(req.body);
    const lead = await service.create(data, req.user!.id);
    res.status(201).json(lead);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to create lead" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateLeadSchema.parse(req.body);
    const lead = await service.update(req.params.id, data, req.user!.id);
    res.json(lead);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update lead" });
  }
});

router.post("/:id/convert", async (req: AuthRequest, res: Response) => {
  try {
    const data = convertLeadSchema.parse(req.body);
    const result = await service.convert(req.params.id, req.user!.id, data);
    res.status(201).json(result);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to convert lead" });
  }
});

export default router;