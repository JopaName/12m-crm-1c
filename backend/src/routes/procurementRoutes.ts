import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../db";
import { ProcurementService } from "../services/ProcurementService";
import { createPurchaseRequestSchema, createSupplierSchema, createSupplierOrderSchema } from "../validators";
import { getContentDisposition } from "../utils/fileUtils";
import { logError } from "../utils/logger";
import fs from "fs";
import path from "path";

const router = Router();
const service = new ProcurementService();

router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const data = await service.getProcurementDashboard();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch procurement data" });
  }
});

router.post("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const data = createPurchaseRequestSchema.parse(req.body);
    const request = await service.create(data, req.user!.id);
    res.status(201).json(request);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create purchase request" });
  }
});

router.post("/suppliers", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSupplierSchema.parse(req.body);
    const supplier = await service.createSupplier(data);
    res.status(201).json(supplier);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

router.post("/orders", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSupplierOrderSchema.parse(req.body);
    const order = await service.createOrder(data, req.user!.id);
    res.status(201).json(order);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: "Failed to create supplier order" });
  }
});


router.put("/requests/:id", async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(request);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update request" });
  }
});

router.delete("/requests/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete request" });
  }
});

router.put("/suppliers/:id", async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(supplier);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

router.delete("/suppliers/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.supplier.update({
      where: { id: req.params.id },
      data: { isArchived: true },
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

router.post("/upload", async (req: AuthRequest, res: Response) => {
  try {
    const multer = require("multer");
    const path = require("path");
    const fs = require("fs");
    const uploadDir = path.join(__dirname, "../../uploads/procurement");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const storage = multer.diskStorage({
      destination: (_: any, __: any, cb: any) => cb(null, uploadDir),
      filename: (_: any, file: any, cb: any) => {
        const name = Buffer.from(file.originalname, "latin1").toString("utf8");
        cb(null, `${Date.now()}-${name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")}`);
      },
    });
    const upload = multer({ storage }).single("file");

    upload(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: "Upload failed: " + err.message });
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const fileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      res.json({ fileUrl: "/uploads/procurement/" + req.file.filename, fileName });
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to upload file" });
  }
});



router.get("/download/:id", async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } });
    if (!record || !record.fileUrl) {
      return res.status(404).json({ error: "File not found" });
    }
    const filePath = path.join(__dirname, "../../", record.fileUrl.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }
    const ext = path.extname(filePath).toLowerCase();
    var mimeType = "application/octet-stream";
    var mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf",
      ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain", ".zip": "application/zip", ".rar": "application/x-rar-compressed",
    };
    if (mimeMap[ext]) mimeType = mimeMap[ext];
    var fileName = record.fileName || path.basename(filePath);
    var stat = fs.statSync(filePath);
    var stream = fs.createReadStream(filePath);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", getContentDisposition(mimeType, fileName));
    res.setHeader("Content-Length", stat.size);
    res.setHeader("X-Content-Type-Options", "nosniff");
    var aborted = false;
    req.on("close", function() { aborted = true; stream.destroy(); });
    stream.on("error", function(err: Error) {
      if (aborted) return;
      logError("Stream error during procurement download", {
        source: "procurementRoutes.download",
        metadata: { recordId: req.params.id, error: err.message },
      });
      if (!res.headersSent) res.status(500).json({ error: "Download failed" });
    });
    stream.pipe(res);
  } catch (e: any) {
    logError("Procurement file download error", {
      source: "procurementRoutes.download",
      metadata: { recordId: req.params.id, error: e.message },
    });
    if (!res.headersSent) res.status(500).json({ error: e.message || "Download failed" });
  }
});

export default router;