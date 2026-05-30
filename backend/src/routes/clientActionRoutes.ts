import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { createAuditLog } from "../utils/helpers";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadsDir = path.join(__dirname, "../../uploads/action-files");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Get all actions for a client
router.get("/:clientId/actions", async (req: AuthRequest, res: Response) => {
  try {
    const actions = await prisma.clientAction.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { orderIndex: "asc" },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

// Create a new action
router.post("/:clientId/actions", async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, description, status } = req.body;
    const clientId = req.params.clientId;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const maxOrder = await prisma.clientAction.aggregate({
      where: { clientId },
      _max: { orderIndex: true },
    });

    const action = await prisma.clientAction.create({
      data: {
        clientId,
        type,
        title,
        description,
        status: status || "PLAN",
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await createAuditLog({
      entityType: "ClientAction",
      entityId: action.id,
      action: "CREATE",
      userId: req.user!.id,
      newValue: action,
    });

    res.status(201).json(action);
  } catch (error) {
    res.status(500).json({ error: "Failed to create action" });
  }
});

// Update an action
router.put("/:clientId/actions/:actionId", async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.clientAction.findUnique({ where: { id: req.params.actionId } });
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

    const action = await prisma.clientAction.update({
      where: { id: req.params.actionId },
      data,
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await createAuditLog({
      entityType: "ClientAction",
      entityId: action.id,
      action: "UPDATE",
      userId: req.user!.id,
      oldValue: old,
      newValue: action,
    });

    res.json(action);
  } catch (error) {
    res.status(500).json({ error: "Failed to update action" });
  }
});

// Delete an action
router.delete("/:clientId/actions/:actionId", async (req: AuthRequest, res: Response) => {
  try {
    const old = await prisma.clientAction.findUnique({ where: { id: req.params.actionId } });
    if (!old) return res.status(404).json({ error: "Action not found" });

    await prisma.actionMessage.deleteMany({ where: { actionId: req.params.actionId } });
    await prisma.actionFile.deleteMany({ where: { actionId: req.params.actionId } });

    await prisma.clientAction.delete({ where: { id: req.params.actionId } });

    await createAuditLog({
      entityType: "ClientAction",
      entityId: req.params.actionId,
      action: "DELETE",
      userId: req.user!.id,
      oldValue: old,
    });

    res.json({ message: "Action deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete action" });
  }
});

// Reorder actions
router.put("/:clientId/actions/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds must be an array" });
    }

    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        prisma.clientAction.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    const actions = await prisma.clientAction.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { orderIndex: "asc" },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: "Failed to reorder actions" });
  }
});

// === Action Messages ===
router.get("/:clientId/actions/:actionId/messages", async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.actionMessage.findMany({
      where: { actionId: req.params.actionId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:clientId/actions/:actionId/messages", async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }
    const message = await prisma.actionMessage.create({
      data: {
        actionId: req.params.actionId,
        senderId: req.user!.id,
        content: content.trim(),
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// === Action Files ===
router.get("/:clientId/actions/:actionId/files", async (req: AuthRequest, res: Response) => {
  try {
    const files = await prisma.actionFile.findMany({
      where: { actionId: req.params.actionId },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    const baseUrl = `/api/clients/${req.params.clientId}/actions/${req.params.actionId}/files`;
    const enriched = files.map((f) => ({
      ...f,
      downloadUrl: `${baseUrl}/${f.id}/download`,
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// Download a file with the original filename
router.get("/:clientId/actions/:actionId/files/:fileId/download", async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.actionFile.findUnique({ where: { id: req.params.fileId } });
    if (!file) return res.status(404).json({ error: "File not found" });

    const filePath = path.join(__dirname, "../../uploads", file.fileUrl.replace(/^\/uploads\/?/, ""));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    // Fix double-encoding: convert garbled Latin-1 string back to UTF-8
    // Only apply to old files that were stored with garbled names
    let originalFilename = file.fileName;
    try {
      // Check if filename looks garbled (contains Latin-1 range chars that are actually UTF-8 bytes)
      // Garbled names have chars in range 0xC0-0xFF (Latin-1 supplement)
      const looksGarbled = /[\x80-\xFF]/.test(originalFilename) && !/[\u0400-\u04FF]/.test(originalFilename);
      
      if (looksGarbled) {
        const buffer = Buffer.from(originalFilename, "latin1");
        const recovered = buffer.toString("utf-8");
        // Verify recovered is valid UTF-8 and looks reasonable
        if (recovered.length > 0 && recovered.length <= originalFilename.length) {
          originalFilename = recovered;
        }
      }
    } catch (e) {
      // Keep original if conversion fails
    }

    const filename = encodeURIComponent(originalFilename);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}; filename="${filename}"`);
    
    // Set correct Content-Type based on file extension
    const ext = path.extname(originalFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: "Failed to download file" });
  }
});

router.post("/:clientId/actions/:actionId/files", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    // Fix filename encoding: convert garbled Latin-1 to proper UTF-8
    let originalName = req.file.originalname;
    try {
      const buffer = Buffer.from(originalName, "latin1");
      const recovered = buffer.toString("utf-8");
      if (recovered !== originalName && recovered.length < originalName.length * 2) {
        originalName = recovered;
      }
    } catch (e) {}

    const fileRecord = await prisma.actionFile.create({
      data: {
        actionId: req.params.actionId,
        fileName: originalName,
        fileUrl: "/uploads/action-files/" + req.file.filename,
        uploadedById: req.user!.id,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.status(201).json(fileRecord);
  } catch (error) {
    res.status(500).json({ error: "Failed to upload file" });
  }
});

router.delete("/:clientId/actions/:actionId/files/:fileId", async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.actionFile.findUnique({ where: { id: req.params.fileId } });
    if (!file) return res.status(404).json({ error: "File not found" });

    const filePath = path.join(__dirname, "../../uploads", file.fileUrl.replace(/^\/uploads\/?/, ""));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.actionFile.delete({ where: { id: req.params.fileId } });
    res.json({ message: "File deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
