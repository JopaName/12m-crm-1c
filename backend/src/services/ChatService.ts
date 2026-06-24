
import { prisma } from "../db";
import { Server } from "socket.io";
import { emitToUser, emitToRoom } from "../chat/chatSocket";

let _io: Server | null = null;
export function setChatIO(io: Server) { _io = io; }

export class ChatService {
  async getConversations(userId: string) {
    // Get all unique users this user has messaged
    const messages = await prisma.chatMessage.findMany({
      where: {
        isDeleted: false,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Get group rooms
    const rooms = await prisma.chatRoom.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    // Build unique conversation list
    const convMap = new Map();
    messages.forEach(m => {
      const other = m.senderId === userId ? m.receiver : m.sender;
      if (!other || convMap.has(other.id)) return;
      convMap.set(other.id, {
        user: { id: other.id, firstName: other.firstName, lastName: other.lastName },
        lastMessage: { content: m.content, createdAt: m.createdAt, senderId: m.senderId },
        unreadCount: 0,
        isRoom: false,
      });
    });

    // Add group rooms
    rooms.forEach(r => {
      convMap.set("room_" + r.id, {
        user: { id: r.id, name: r.name || r.members.map(m => m.user.firstName).join(", "), isGroup: true },
        lastMessage: r.messages[0] ? { content: r.messages[0].content, createdAt: r.messages[0].createdAt, senderId: r.messages[0].senderId } : null,
        unreadCount: 0,
        isRoom: true,
        memberCount: r.members.length,
      });
    });

    return Array.from(convMap.values()).sort((a, b) => {
      const da = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const db = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return db - da;
    });
  }

  async getMessages(userId: string, otherUserId: string) {
    return prisma.chatMessage.findMany({
      where: {
        roomId: null,
        isDeleted: false,
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getRoomMessages(roomId: string) {
    return prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async sendMessage(senderId: string, receiverId: string, content: string, replyToId: string | null, entityType: string | null, entityId: string | null, entityTitle: string | null) {
    const msg = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        content,
        replyToId,
        entityType,
        entityId,
        entityTitle,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (_io) {
      emitToUser(_io, receiverId, "new-message", msg);
      emitToUser(_io, senderId, "new-message", msg);
    }
    return msg;
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== userId) throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    return prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== userId) throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    return prisma.chatMessage.update({ where: { id: messageId }, data: { isDeleted: true } });
  }

  async forwardMessage(messageId: string, fromUserId: string, toUserId: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.isDeleted) throw new Error("Message not found");
    return this.sendMessage(fromUserId, toUserId, "\ud83d\udce8 Переслано: " + msg.content, null, null, null, null);
  }

  async sendGroupMessage(senderId: string, roomId: string, content: string, replyToId: string | null) {
    const msg = await prisma.chatMessage.create({
      data: { senderId, roomId, content, replyToId },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (_io) emitToRoom(_io, roomId, "new-room-message", msg);
    return msg;
  }

  async createRoom(name: string | null, memberIds: string[], creatorId: string) {
    const room = await prisma.chatRoom.create({
      data: {
        name,
        isGroup: true,
        createdBy: creatorId,
        members: { create: [...new Set([...memberIds, creatorId])].map(userId => ({ userId })) },
      },
      include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
    });
    if (_io) memberIds.forEach(uid => emitToUser(_io, uid, "room-created", room));
    return room;
  }

  async markAsRead(senderId: string, receiverId: string) {
    await prisma.chatMessage.updateMany({ where: { senderId, receiverId, readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }

  async markMessageRead(messageId: string) {
    await prisma.chatMessage.update({ where: { id: messageId }, data: { readAt: new Date() } });
    return { success: true };
  }

  async createTaskFromMessage(messageId: string, userId: string, assigneeId: string, title: string, dueDate: string | null) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId }, include: { sender: true } });
    if (!msg) throw new Error("Message not found");
    const task = await prisma.task.create({
      data: {
        title: title || msg.content.substring(0, 100),
        description: msg.content,
        type: "chat_task",
        status: "pending",
        priority: "medium",
        createdById: userId,
        assigneeId: assigneeId || userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    // Send a system message about task creation
    if (msg.receiverId) {
      await this.sendMessage(userId, msg.receiverId, "\u2705 Создана задача: " + task.title, null, "task", task.id, task.title);
    }
    return task;
  }
}
