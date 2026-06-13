import { Router, Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";
import { LegalService } from "../services/LegalService";
import { createLegalDocumentSchema } from "../validators";

const router = Router();
const service = new LegalService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const docs = await service.getAll("", "");
    res.json(docs);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch legal documents" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createLegalDocumentSchema.parse(req.body);
    const doc = await service.create(data, req.user!.id);
    res.status(201).json(doc);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create legal document" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const doc = await service.update(req.params.id, req.body, req.user!.id);
    res.json(doc);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update legal document" });
  }
});

router.get("/categories", async (_req: AuthRequest, res: Response) => {
  try {
    const cats = await prisma.legalDocument.findMany({
      where: { category: { not: null }, isArchived: false },
      distinct: ["category"],
      select: { category: true },
    });
    res.json(cats.map((c: any) => c.category).filter(Boolean));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/types", async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { isArchived: false };
    if (req.query.category) where.category = String(req.query.category);
    const types = await prisma.legalDocument.findMany({
      where,
      distinct: ["documentType"],
      select: { documentType: true },
    });
    res.json(types.map((t: any) => t.documentType).filter(Boolean));
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch types" });
  }
});

export default router;
