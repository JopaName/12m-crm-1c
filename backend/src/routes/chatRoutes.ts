import { Router, Response } from "express";
import { AuthRequest, requirePermission } from "../middleware/auth";
import { ChatService } from "../services/ChatService";
import multer from "multer";
import path from "path";
import fs from "fs";


const router = Router();
const service = new ChatService();

router.get("/conversations", requirePermission("chat:view"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.getConversations(req.user!.id)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.get("/messages/:userId", requirePermission("chat:view"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.getMessages(req.user!.id, req.params.userId)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.get("/room/:roomId/messages", requirePermission("chat:view"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.getRoomMessages(req.params.roomId)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.post("/send", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content, replyToId, entityType, entityId, entityTitle, mentionedUserIds, fileUrl, fileName } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "content required" });
    if (entityType && entityId) {
      res.status(201).json(await service.sendEntityMessage(req.user!.id, entityType, entityId, content.trim(), replyToId || null, entityTitle || null, mentionedUserIds || null, fileUrl || null, fileName || null));
    } else {
      if (!receiverId) return res.status(400).json({ error: "receiverId required" });
      res.status(201).json(await service.sendMessage(req.user!.id, receiverId, content.trim(), replyToId, entityType, entityId, entityTitle));
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/room/send", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, content, replyToId } = req.body;
    if (!roomId || !content?.trim()) return res.status(400).json({ error: "required" });
    res.status(201).json(await service.sendGroupMessage(req.user!.id, roomId, content.trim(), replyToId));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/:id", requirePermission("chat:edit"), async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    res.json(await service.editMessage(req.params.id, req.user!.id, content));
  } catch (e: any) { res.status(403).json({ error: e.message }); }
});
router.delete("/:id", requirePermission("chat:delete"), async (req: AuthRequest, res: Response) => {
  try {
    res.json(await service.deleteMessage(req.params.id, req.user!.id));
  } catch (e: any) { res.status(403).json({ error: e.message }); }
});
router.post("/forward/:messageId", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { toUserId } = req.body;
    res.status(201).json(await service.forwardMessage(messageId, req.user!.id, toUserId));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/react", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.addReaction(req.body.messageId, req.user!.id, req.body.emoji)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/rooms", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try { res.status(201).json(await service.createRoom(req.body.name || null, req.body.memberIds || [], req.user!.id)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.get("/rooms/:roomId", requirePermission("chat:view"), async (req: AuthRequest, res: Response) => {
  try {
    const room = await service.getRoom(req.params.roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json(room);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/rooms/:roomId", requirePermission("chat:edit"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.updateRoom(req.params.roomId, req.body.name, req.user!.id)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post("/rooms/:roomId/members", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.addMembers(req.params.roomId, req.body.memberIds || [])); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.delete("/rooms/:roomId/members/:userId", requirePermission("chat:delete"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.removeMember(req.params.roomId, req.params.userId)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/read/:userId", requirePermission("chat:edit"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.markAsRead(req.params.userId, req.user!.id)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.post("/read-message", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try { await service.markMessageRead(req.body.messageId); res.json({ ok: true }); } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/create-task", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try {
    const { messageId, assigneeId, title, dueDate } = req.body;
    const task = await service.createTaskFromMessage(messageId, req.user!.id, assigneeId, title, dueDate);
    res.status(201).json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


router.get("/entity/:entityType/:entityId", requirePermission("chat:view"), async (req: AuthRequest, res: Response) => {
  try { res.json(await service.getEntityMessages(req.params.entityType, req.params.entityId)); } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/entity", requirePermission("chat:create"), async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId, content, replyToId, entityTitle, mentionedUserIds, fileUrl, fileName } = req.body;
    if (!entityType || !entityId || !content?.trim()) return res.status(400).json({ error: "entityType, entityId, content required" });
    res.status(201).json(await service.sendEntityMessage(req.user!.id, entityType, entityId, content.trim(), replyToId || null, entityTitle || null, mentionedUserIds || null, fileUrl || null, fileName || null));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const chatUploadsDir = path.join(__dirname, "../../uploads/chat-files");
if (!fs.existsSync(chatUploadsDir)) { fs.mkdirSync(chatUploadsDir, { recursive: true }); }
const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, chatUploadsDir),
    filename: (_req, file, cb) => {
      const safeName = Buffer.from(file.originalname, "latin1").toString("utf8").replace(/[^a-zA-Z0-9а-яА-ЯёЁ._ -]/g, "_");
      cb(null, Date.now() + "-" + safeName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.post("/upload", requirePermission("chat:create"), chatUpload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const origName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const fileUrl = "/uploads/chat-files/" + req.file.filename;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const content = (req.body.content || "").trim();
    const replyToId = req.body.replyToId || null;

    if (req.body.receiverId) {
      const msg = await service.sendMessageWithFile(req.user!.id, req.body.receiverId, fileUrl, origName, fileSize, mimeType, content);
      return res.status(201).json(msg);
    }
    if (req.body.roomId) {
      const msg = await service.sendGroupMessage(req.user!.id, req.body.roomId, content || "", replyToId, fileUrl, origName, fileSize, mimeType);
      return res.status(201).json(msg);
    }
    res.status(201).json({ fileUrl, fileName: origName, fileSize, mimeType });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/file/uploads/chat-files/:filename", requirePermission("chat:view"), async (req: AuthRequest, res: Response) => {
  try {
    const filePath = path.join(chatUploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'inline; filename="' + encodeURIComponent(req.params.filename) + '"');
    fs.createReadStream(filePath).pipe(res);
  } catch (e: any) { res.status(500).json({ error: "Download failed" }); }
});

export default router;