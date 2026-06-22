import { prisma } from "../db";
import { Server } from "socket.io";
import { emitToUser, emitToRoom } from "../chat/chatSocket";

let _io: Server | null = null;
export function setChatIO(io: Server) { _io = io; }

export class ChatService {
  async getConversations(userId: string) { return []; }
  async getMessages(userId: string, otherUserId: string) {
    return prisma.chatMessage.findMany({
      where: { roomId: null, isDeleted: false, OR: [{ senderId: userId, receiverId: otherUserId }, { senderId: otherUserId, receiverId: userId }] },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getRoomMessages(roomId: string) { return []; }
  async sendMessage(senderId: string, receiverId: string, content: string, replyToId?: string, entityType?: string, entityId?: string, entityTitle?: string) {
    const msg = await prisma.chatMessage.create({
      data: { senderId, receiverId, content },
      include: { sender: { select: { id: true, firstName: true, lastName: true } }, receiver: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (_io) { emitToUser(_io, receiverId, "new-message", msg); emitToUser(_io, senderId, "new-message", msg); }
    return msg;
  }

  async sendGroupMessage(senderId: string, roomId: string, content: string, replyToId?: string) { return {} as any; }
  async addReaction(messageId: string, userId: string, emoji: string) { return {} as any; }
  async createRoom(name: string | null, memberIds: string[], creatorId: string) { return {} as any; }
  async markAsRead(senderId: string, receiverId: string) {
    await prisma.chatMessage.updateMany({ where: { senderId, receiverId, readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }

  async markMessageRead(messageId: string) {
    await prisma.chatMessage.update({ where: { id: messageId }, data: { readAt: new Date() } });
  }
}