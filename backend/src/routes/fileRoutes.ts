import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { FileService } from "../services/FileService";
import { FILE_LIMITS, getContentDisposition, isAllowedMimeType } from "../utils/fileUtils";
import { logError } from "../utils/logger";

const router = Router();
const fileService = new FileService();

const tempStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tempDir = path.join(__dirname, "../../uploads/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2) + ext);
  },
});

const upload = multer({
  storage: tempStorage,
  limits: { fileSize: FILE_LIMITS.maxSizeBytes },
  fileFilter: function(_req, file, cb) {
    if (isAllowedMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error("File type " + file.mimetype + " is not allowed"), { statusCode: 400 }));
    }
  },
});

router.post("/upload/:entityType/:entityId/:fieldName", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  let tempPath: string | null = null;
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    tempPath = req.file.path;
    const record = await fileService.uploadFromTemp(
      tempPath, req.file.originalname, req.file.mimetype, req.file.size,
      req.params.entityType, req.params.entityId, req.params.fieldName, req.user!.id,
    );
    tempPath = null;
    res.status(201).json(record);
  } catch (e: any) {
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
    logError("File upload error", { source: "fileRoutes.upload", metadata: { entityType: req.params.entityType, entityId: req.params.entityId, fieldName: req.params.fieldName, error: e.message } });
    res.status(e.statusCode || 500).json({ error: e.message || "Upload failed" });
  }
});

router.get("/download/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const access = await fileService.checkAccess(req.params.id, req.user!.id, req.user!.roleName);
    if (!access) return res.status(403).json({ error: "Access denied" });
    const { stream, record } = await fileService.download(req.params.id, req.user!.id, req.user!.roleName);
    res.setHeader("Content-Type", record.mimeType);
    res.setHeader("Content-Disposition", getContentDisposition(record.mimeType, record.fileName));
    res.setHeader("Content-Length", record.fileSize);
    res.setHeader("X-Content-Type-Options", "nosniff");

    var aborted = false;
    req.on("close", function() {
      aborted = true;
      stream.destroy();
    });

    stream.on("error", function(err: Error) {
      if (aborted) return;
      logError("Stream error during file download", {
        source: "fileRoutes.download",
        metadata: { recordId: req.params.id, error: err.message },
      });
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error during download" });
      }
    });

    var timeoutId = setTimeout(function() {
      if (!aborted) {
        stream.destroy();
        if (!res.headersSent) {
          res.status(504).json({ error: "Download timeout" });
        }
      }
    }, 30000);

    stream.on("end", function() {
      clearTimeout(timeoutId);
    });

    stream.pipe(res);
  } catch (e: any) {
    logError("File download error", {
      source: "fileRoutes.download",
      metadata: { recordId: req.params.id, error: e.message },
    });
    if (!res.headersSent) {
      res.status(e.statusCode || 500).json({ error: e.message || "Download failed" });
    }
  }
});

router.get("/download/:entityType/:entityId/:fieldName", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId, fieldName } = req.params;
    const access = await fileService.checkEntityAccess(entityType, entityId, req.user!.id, req.user!.roleName);
    if (!access) return res.status(403).json({ error: "Access denied" });
    const { stream, record } = await fileService.downloadByField(entityType, entityId, fieldName, req.user!.id, req.user!.roleName);
    res.setHeader("Content-Type", record.mimeType);
    res.setHeader("Content-Disposition", getContentDisposition(record.mimeType, record.fileName));
    res.setHeader("Content-Length", record.fileSize);
    res.setHeader("X-Content-Type-Options", "nosniff");

    var aborted = false;
    req.on("close", function() {
      aborted = true;
      stream.destroy();
    });

    stream.on("error", function(err: Error) {
      if (aborted) return;
      logError("Stream error during file download by field", {
        source: "fileRoutes.downloadByField",
        metadata: { entityType: entityType, entityId: entityId, fieldName: fieldName, error: err.message },
      });
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error during download" });
      }
    });

    var timeoutId = setTimeout(function() {
      if (!aborted) {
        stream.destroy();
        if (!res.headersSent) {
          res.status(504).json({ error: "Download timeout" });
        }
      }
    }, 30000);

    stream.on("end", function() {
      clearTimeout(timeoutId);
    });

    stream.pipe(res);
  } catch (e: any) {
    logError("File download by field error", {
      source: "fileRoutes.downloadByField",
      metadata: { entityType: req.params.entityType, entityId: req.params.entityId, fieldName: req.params.fieldName, error: e.message },
    });
    if (!res.headersSent) {
      res.status(e.statusCode || 500).json({ error: e.message || "Download failed" });
    }
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const access = await fileService.checkAccess(req.params.id, req.user!.id, req.user!.roleName);
    if (!access) {
      logError("Delete denied - access check failed", {
        source: "fileRoutes.delete",
        metadata: { recordId: req.params.id, userId: req.user!.id, roleName: req.user!.roleName },
      });
      return res.status(403).json({ error: "Access denied" });
    }
    await fileService.delete(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e: any) {
    logError("File delete error", { source: "fileRoutes.delete", metadata: { recordId: req.params.id, error: e.message } });
    res.status(e.statusCode || 500).json({ error: e.message || "Delete failed" });
  }
});

router.get("/:entityType/:entityId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const fieldName = req.query.field as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || undefined;
    const result = await fileService.list(req.params.entityType, req.params.entityId, fieldName, { page, pageSize });
    res.json(result);
  } catch (e: any) {
    logError("File list error", { source: "fileRoutes.list", metadata: { entityType: req.params.entityType, entityId: req.params.entityId, error: e.message } });
    res.status(500).json({ error: e.message || "Failed to list files" });
  }
});

router.post("/cleanup/expired", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== "Director") return res.status(403).json({ error: "Only Director can run cleanup" });
    const result = await fileService.cleanupExpiredDeletedFiles();
    res.json({ deletedCount: result });
  } catch (e: any) {
    logError("File cleanup expired error", { source: "fileRoutes.cleanupExpired", metadata: { error: e.message } });
    res.status(500).json({ error: e.message || "Cleanup failed" });
  }
});

router.post("/cleanup/orphaned", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.roleName !== "Director") return res.status(403).json({ error: "Only Director can run cleanup" });
    const result = await fileService.cleanupOrphanedFiles();
    res.json(result);
  } catch (e: any) {
    logError("File cleanup error", { source: "fileRoutes.cleanup", metadata: { error: e.message } });
    res.status(500).json({ error: e.message || "Cleanup failed" });
  }
});

export default router;
