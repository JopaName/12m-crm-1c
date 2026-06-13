import { Router, Response } from "express";
import multer from "multer";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { FileService } from "../services/FileService";

const router = Router();
const fileService = new FileService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/upload/:entityType/:entityId/:fieldName", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const record = await fileService.upload(
      { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size },
      req.params.entityType, req.params.entityId, req.params.fieldName, req.user!.id,
    );
    res.status(201).json(record);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Upload failed" });
  }
});

router.get("/download/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const access = await fileService.checkAccess(req.params.id, req.user!.id, req.user!.roleName);
    if (!access) return res.status(403).json({ error: "Access denied" });
    const { buffer, record } = await fileService.download(req.params.id);
    res.setHeader("Content-Type", record.mimeType);
    res.setHeader("Content-Disposition", 'inline; filename="' + record.fileName + '"');
    res.setHeader("Content-Length", record.fileSize);
    res.send(buffer);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Download failed" });
  }
});

router.get("/download/:entityType/:entityId/:fieldName", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId, fieldName } = req.params;
    const access = await fileService.checkEntityAccess(entityType, entityId, req.user!.id, req.user!.roleName);
    if (!access) return res.status(403).json({ error: "Access denied" });
    const { buffer, record } = await fileService.downloadByField(entityType, entityId, fieldName);
    res.setHeader("Content-Type", record.mimeType);
    res.setHeader("Content-Disposition", 'inline; filename="' + record.fileName + '"');
    res.setHeader("Content-Length", record.fileSize);
    res.send(buffer);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Download failed" });
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const access = await fileService.checkAccess(req.params.id, req.user!.id, req.user!.roleName);
    if (!access) return res.status(403).json({ error: "Access denied" });
    await fileService.delete(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ error: e.message || "Delete failed" });
  }
});

router.get("/:entityType/:entityId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const fieldName = req.query.field as string | undefined;
    const files = await fileService.list(req.params.entityType, req.params.entityId, fieldName);
    res.json(files);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to list files" });
  }
});

export default router;
