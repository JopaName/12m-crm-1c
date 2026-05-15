import { Router, Response } from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/conversations", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const conversationsMap = new Map();
    for (const msg of messages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
    }

    const unreadMessages = await prisma.chatMessage.findMany({
      where: { receiverId: userId, readAt: null },
      select: { senderId: true },
    });

    for (const msg of unreadMessages) {
      const conv = conversationsMap.get(msg.senderId);
      if (conv) conv.unreadCount++;
    }

    res.json(Array.from(conversationsMap.values()));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/messages/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const { userId } = req.params;

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: userId },
          { senderId: userId, receiverId: myId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/send", async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ error: "receiverId and content required" });
    }

    const message = await prisma.chatMessage.create({
      data: {
        senderId: req.user!.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json(message);
  } catch (error: any) {
    console.error("Chat send error:", error);
    res.status(500).json({ error: error?.message || "Failed to send message" });
  }
});

router.put("/read/:userId", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.chatMessage.updateMany({
      where: {
        senderId: req.params.userId,
        receiverId: req.user!.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

export default router;
