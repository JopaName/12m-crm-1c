import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ChatService } from "../services/ChatService";

const router = Router();
const service = new ChatService();

router.get("/conversations", async (req: AuthRequest, res: Response) => {
  try { res.json(await service.getConversations(req.user!.id)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.get("/messages/:userId", async (req: AuthRequest, res: Response) => {
  try { res.json(await service.getMessages(req.user!.id, req.params.userId)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.get("/room/:roomId/messages", async (req: AuthRequest, res: Response) => {
  try { res.json(await service.getRoomMessages(req.params.roomId)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.post("/send", async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content, replyToId, entityType, entityId, entityTitle } = req.body;
    if (!receiverId || !content?.trim()) return res.status(400).json({ error: "required" });
    res.status(201).json(await service.sendMessage(req.user!.id, receiverId, content.trim(), replyToId, entityType, entityId, entityTitle));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/room/send", async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, content, replyToId } = req.body;
    if (!roomId || !content?.trim()) return res.status(400).json({ error: "required" });
    res.status(201).json(await service.sendGroupMessage(req.user!.id, roomId, content.trim(), replyToId));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    res.json(await service.editMessage(req.params.id, req.user!.id, content));
  } catch (e: any) { res.status(403).json({ error: e.message }); }
});
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    res.json(await service.deleteMessage(req.params.id, req.user!.id));
  } catch (e: any) { res.status(403).json({ error: e.message }); }
});
router.post("/forward", async (req: AuthRequest, res: Response) => {
  try {
    const { messageId, toUserId } = req.body;
    res.status(201).json(await service.forwardMessage(messageId, req.user!.id, toUserId));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/react", async (req: AuthRequest, res: Response) => {
  try { res.json(await service.addReaction(req.body.messageId, req.user!.id, req.body.emoji)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/rooms", async (req: AuthRequest, res: Response) => {
  try { res.status(201).json(await service.createRoom(req.body.name || null, req.body.memberIds || [], req.user!.id)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/read/:userId", async (req: AuthRequest, res: Response) => {
  try { res.json(await service.markAsRead(req.params.userId, req.user!.id)); } catch { res.status(500).json({ error: "Failed" }); }
});
router.post("/read-message", async (req: AuthRequest, res: Response) => {
  try { await service.markMessageRead(req.body.messageId); res.json({ ok: true }); } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/create-task", async (req: AuthRequest, res: Response) => {
  try {
    const { messageId, assigneeId, title, dueDate } = req.body;
    const task = await service.createTaskFromMessage(messageId, req.user!.id, assigneeId, title, dueDate);
    res.status(201).json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;