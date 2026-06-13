import { prisma } from "../db";

export class ChatService {
  async getConversations(userId: string) {
    const messages = await prisma.chatMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } }, receiver: { select: { id: true, firstName: true, lastName: true } } },
    });
    const conversationsMap = new Map();
    for (const msg of messages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, { user: otherUser, lastMessage: msg, unreadCount: 0 });
      }
    }
    const unreadMessages = await prisma.chatMessage.findMany({ where: { receiverId: userId, readAt: null }, select: { senderId: true } });
    for (const msg of unreadMessages) {
      const conv = conversationsMap.get(msg.senderId);
      if (conv) conv.unreadCount++;
    }
    return Array.from(conversationsMap.values());
  }

  async getMessages(userId: string, otherUserId: string) {
    return prisma.chatMessage.findMany({
      where: { OR: [{ senderId: userId, receiverId: otherUserId }, { senderId: otherUserId, receiverId: userId }] },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    return prisma.chatMessage.create({
      data: { senderId, receiverId, content },
      include: { sender: { select: { id: true, firstName: true, lastName: true } }, receiver: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async markAsRead(senderId: string, receiverId: string) {
    await prisma.chatMessage.updateMany({ where: { senderId, receiverId, readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }
}