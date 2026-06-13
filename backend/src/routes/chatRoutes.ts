import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ChatService } from "../services/ChatService";
import { sendMessageSchema } from "../validators";

const router = Router();
const service = new ChatService();

router.get("/conversations", async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await service.getConversations(req.user!.id);
    res.json(conversations);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/messages/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const messages = await service.getMessages(req.user!.id, req.params.userId);
    res.json(messages);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/send", async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content } = sendMessageSchema.parse(req.body);
    const message = await service.sendMessage(req.user!.id, receiverId, content);
    res.status(201).json(message);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: "Validation failed", details: e.issues });
    res.status(500).json({ error: e?.message || "Failed to send message" });
  }
});

router.put("/read/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.markAsRead(req.params.userId, req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

export default router;