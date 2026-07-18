import { Router, Response } from "express";
import { prisma } from "../db";
import { AuthRequest, authMiddleware, requirePermission } from "../middleware/auth";
import { createAuditLog } from "../utils/helpers";
import multer from "multer";
import path from "path";
import fs from "fs";
const router = Router();
const uploadsDir = path.join(__dirname, "../../uploads/deal-action-files");
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }); }
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
router.get("/:dealId/actions", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  try {
    const actions = await prisma.dealAction.findMany({ where: { dealId: req.params.dealId }, orderBy: { orderIndex: "asc" }, include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } });
    res.json(actions);
  } catch (error) { res.status(500).json({ error: "Failed to fetch actions" }); }
});
router.post("/:dealId/actions", requirePermission("deals:create"), async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, description, status } = req.body;
    const dealId = req.params.dealId;
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    const maxOrder = await prisma.dealAction.aggregate({ where: { dealId }, _max: { orderIndex: true } });
    const action = await prisma.dealAction.create({
      data: { dealId, type, title, description, status: status || "PLAN", orderIndex: (maxOrder._max.orderIndex ?? -1) + 1, createdById: req.user!.id },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    await createAuditLog({ entityType: "DealAction", entityId: action.id, action: "CREATE", userId: req.user!.id, newValue: action });
    res.status(201).json(action);
  } catch (error) { res.status(500).json({ error: "Failed to create action" }); }
});
router.put("/:dealId/actions/:actionId", requirePermission("deals:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.dealAction.findUnique({ where: { id: req.params.actionId } });
    if (!old) return res.status(404).json({ error: "Action not found" });
    const { type, title, description, status, orderIndex } = req.body;
    const data: any = {};
    if (type !== undefined) data.type = type;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (orderIndex !== undefined) data.orderIndex = orderIndex;
    if (status === "COMPLETED") data.completedAt = new Date();
    if (old.status === "COMPLETED" && status !== "COMPLETED") data.completedAt = null;
    const action = await prisma.dealAction.update({ where: { id: req.params.actionId }, data, include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } });
    await createAuditLog({ entityType: "DealAction", entityId: action.id, action: "UPDATE", userId: req.user!.id, oldValue: old, newValue: action });
    res.json(action);
  } catch (error) { res.status(500).json({ error: "Failed to update action" }); }
});
router.delete("/:dealId/actions/:actionId", requirePermission("deals:delete"), async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.dealAction.findUnique({ where: { id: req.params.actionId } });
    if (!old) return res.status(404).json({ error: "Action not found" });
    await prisma.dealActionMessage.deleteMany({ where: { actionId: req.params.actionId } });
    await prisma.dealActionFile.deleteMany({ where: { actionId: req.params.actionId } });
    await prisma.dealAction.delete({ where: { id: req.params.actionId } });
    await createAuditLog({ entityType: "DealAction", entityId: req.params.actionId, action: "DELETE", userId: req.user!.id, oldValue: old });
    res.json({ message: "Action deleted" });
  } catch (error) { res.status(500).json({ error: "Failed to delete action" }); }
});
router.put("/:dealId/actions/reorder", requirePermission("deals:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
    await Promise.all(orderedIds.map((id: string, index: number) => prisma.dealAction.update({ where: { id }, data: { orderIndex: index } })));
    const actions = await prisma.dealAction.findMany({ where: { dealId: req.params.dealId }, orderBy: { orderIndex: "asc" }, include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } });
    res.json(actions);
  } catch (error) { res.status(500).json({ error: "Failed to reorder actions" }); }
});
router.get("/:dealId/actions/:actionId/messages", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.dealActionMessage.findMany({ where: { actionId: req.params.actionId }, orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, firstName: true, lastName: true } } } });
    res.json(messages);
  } catch (error) { res.status(500).json({ error: "Failed to fetch messages" }); }
});
router.post("/:dealId/actions/:actionId/messages", requirePermission("deals:create"), async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: "Content is required" });
    const message = await prisma.dealActionMessage.create({ data: { actionId: req.params.actionId, senderId: req.user!.id, content: content.trim() }, include: { sender: { select: { id: true, firstName: true, lastName: true } } } });
    res.status(201).json(message);
  } catch (error) { res.status(500).json({ error: "Failed to send message" }); }
});
router.get("/:dealId/actions/:actionId/files", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  try {
    const files = await prisma.dealActionFile.findMany({ where: { actionId: req.params.actionId }, orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } } });
    const baseUrl = "/api/deals/" + req.params.dealId + "/actions/" + req.params.actionId + "/files";
    const enriched = files.map((f) => ({ ...f, downloadUrl: baseUrl + "/" + f.id + "/download" }));
    res.json(enriched);
  } catch (error) { res.status(500).json({ error: "Failed to fetch files" }); }
});
router.get("/:dealId/actions/:actionId/files/:fileId/download", requirePermission("deals:view"), async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.dealActionFile.findUnique({ where: { id: req.params.fileId } });
    if (!file) return res.status(404).json({ error: "File not found" });
    const filePath = path.join(__dirname, "../../uploads", file.fileUrl.replace(/^\/uploads\/?/, ""));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found on disk" });
    let originalFilename = file.fileName;
    try {
      const looksGarbled = /[\x80-\xFF]/.test(originalFilename) && !/[\u0400-\u04FF]/.test(originalFilename);
      if (looksGarbled) { const buffer = Buffer.from(originalFilename, "latin1"); const recovered = buffer.toString("utf-8"); if (recovered.length > 0 && recovered.length <= originalFilename.length) originalFilename = recovered; }
    } catch (e) {}
    const filename = encodeURIComponent(originalFilename);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const ext = path.extname(originalFilename).toLowerCase();
    const mimeTypes = { ".pdf": "application/pdf", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.sendFile(filePath);
  } catch (error) { res.status(500).json({ error: "Failed to download file" }); }
});
router.post("/:dealId/actions/:actionId/files", requirePermission("deals:create"), upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    let originalName = req.file.originalname;
    try { const buffer = Buffer.from(originalName, "latin1"); const recovered = buffer.toString("utf-8"); if (recovered !== originalName && recovered.length < originalName.length * 2) originalName = recovered; } catch (e) {}
    const fileRecord = await prisma.dealActionFile.create({ data: { actionId: req.params.actionId, fileName: originalName, fileUrl: "/uploads/deal-action-files/" + req.file.filename, uploadedById: req.user!.id }, include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } } });
    res.status(201).json(fileRecord);
  } catch (error) { res.status(500).json({ error: "Failed to upload file" }); }
});
router.delete("/:dealId/actions/:actionId/files/:fileId", requirePermission("deals:delete"), async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.dealActionFile.findUnique({ where: { id: req.params.fileId } });
    if (!file) return res.status(404).json({ error: "File not found" });
    const filePath = path.join(__dirname, "../../uploads", file.fileUrl.replace(/^\/uploads\/?/, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.dealActionFile.delete({ where: { id: req.params.fileId } });
    res.json({ message: "File deleted" });
  } catch (error) { res.status(500).json({ error: "Failed to delete file" }); }
});
export default router;