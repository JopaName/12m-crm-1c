import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const documents = await prisma.legalDocument.findMany({
      where: { isArchived: false },
      include: {
        deal: { include: { client: true } },
        responsibleLawyer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch legal documents" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const doc = await prisma.legalDocument.create({
      data: { ...req.body, status: "Draft", versionNumber: 1 },
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: "Failed to create legal document" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.legalDocument.findUnique({
      where: { id: req.params.id },
    });
    if (!old) return res.status(404).json({ error: "Document not found" });

    const doc = await prisma.legalDocument.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        versionNumber: req.body.fileDraft
          ? old.versionNumber + 1
          : old.versionNumber,
      },
    });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: "Failed to update legal document" });
  }
});

export default router;
