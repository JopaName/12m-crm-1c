import { Router, Response } from "express";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";

import { prisma } from "../db";
import { DealService } from "../services/DealService";
import { createDealSchema, updateDealStatusSchema } from "../validators";

const router = Router();
const service = new DealService();
import multer from "multer";
import path from "path";
import fs from "fs";
import { FileService } from "../services/FileService";

router.get("/", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  try {
    const deals = await service.getAll(req.user!.id, req.user!.roleName);
    res.json(deals);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch deals" });
  }
});

const fileService = new FileService();

const uploadsDir = path.join(__dirname, "../../uploads/deal-files");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dealUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const origName = Buffer.from(file.originalname, "latin1").toString("utf8");
      const ext = origName.includes(".") ? "" : "";
      const baseName = origName.includes(".") ? origName.substring(0, origName.lastIndexOf(".")) : origName;
      const fileExt = origName.includes(".") ? origName.substring(origName.lastIndexOf(".")) : "";
      const safeName = baseName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._ -]/g, "_").substring(0, 80);
      cb(null, Date.now() + "-" + safeName + fileExt);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.get("/:id/files", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  try {
    const files = await prisma.file.findMany({
      where: { entityType: "Deal", entityId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ files });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch files" });
  }
});

router.post("/:id/files", requirePermission("deals:create"), dealUpload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const origName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const record = await prisma.file.create({
      data: {
        originalName: origName,
        storageName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        checksum: null,
        entityType: "Deal",
        entityId: req.params.id,
        fieldName: "file",
        version: 1,
        uploadedById: req.user!.id,
      },
    });
    try {
      await prisma.dealAction.create({
        data: {
          dealId: req.params.id,
          type: "AUTO",
          title: "Загрузка файла",
          description: `файл: "${origName}"`,
          status: "COMPLETED",
          completedAt: new Date(),
          createdById: req.user!.id,
        },
      });
    } catch (_) {}
    res.status(201).json(record);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Upload failed" });
  }
});

router.get("/:id/files/:fileId/download", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  // Allow token as query param for direct browser downloads
  const token = req.query.token as string;
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as any;
      if (decoded.userId) {
        (req as any).user = decoded;
        (req as any).userId = decoded.userId;
      }
    } catch {}
  }
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.fileId, entityType: "Deal", entityId: req.params.id },
    });
    if (!file) return res.status(404).json({ error: "File not found" });
    const filePath = path.join(uploadsDir, file.storageName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found on disk" });
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", 'inline; filename="' + encodeURIComponent(file.originalName) + '"');
    res.setHeader("Content-Length", file.sizeBytes);
    fs.createReadStream(filePath).pipe(res);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Download failed" });
  }
});

router.delete("/:id/files/:fileId", requirePermission("deals:delete"), async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.fileId, entityType: "Deal", entityId: req.params.id },
    });
    if (!file) return res.status(404).json({ error: "File not found" });
    const filePath = path.join(uploadsDir, file.storageName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.file.delete({ where: { id: req.params.fileId } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Delete failed" });
  }
});

router.get("/:id", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  try {
    const deal = await service.getFullDetails(req.params.id);
    res.json(deal);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to fetch deal" });
  }
});

router.post("/", requirePermission("deals:create"), async (req: AuthRequest, res: Response) => {
  try {
    const data = createDealSchema.parse(req.body);
    const { clientName: _cn, clientPhone: _cp, ...cleanData } = data;
    const clientName = _cn;
    const clientPhone = _cp;

    const config = await prisma.pipelineConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    let status = "Lead_Created";
    if (config) {
      const stages = JSON.parse(config.configJson);
      if (Array.isArray(stages) && stages.length > 0) {
        status = stages[0].key;
      }
    }

    const deal = await service.create({ clientName, clientPhone, ...cleanData, expectedAmount: data.expectedAmount ?? 0, dealNumber: `D-${Date.now()}`, status, responsibleAgentId: req.user!.id }, req.user!.id);
    res.status(201).json(deal);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to create deal" });
  }
});

router.put("/:id/status", requirePermission("deals:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = updateDealStatusSchema.parse(req.body);
    const deal = await service.updateStatus(req.params.id, status, req.user!.id);
    res.json(deal);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update deal status" });
  }
});

router.put("/:id", requirePermission("deals:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const deal = await service.update(req.params.id, req.body, req.user!.id);
    res.json(deal);
  } catch (e: any) {
    console.error("DEAL UPDATE ERROR:", e?.message || e, e?.stack?.substring(0, 200));
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to update deal" });
  }
});

router.delete("/:id", requirePermission("deals:delete"), async (req: AuthRequest, res: Response) => {
  try {
    await service.archive(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Failed to delete deal" });
  }
});

export default router;
