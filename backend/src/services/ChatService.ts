import { prisma } from "../db";
import { Server } from "socket.io";
import { emitToUser, emitToRoom, isOnline } from "../chat/chatSocket";

let _io: Server | null = null;
export function setChatIO(io: Server) { _io = io; }

export class ChatService {
  async getConversations(userId: string) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        isDeleted: false,
        roomId: null,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const rooms = await prisma.chatRoom.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    const unreadCounts = await this.getUnreadCounts(userId);

    const convMap = new Map();
    messages.forEach(m => {
      const other = m.senderId === userId ? m.receiver : m.sender;
      if (!other || convMap.has(other.id)) return;
      convMap.set(other.id, {
        user: {
          id: other.id, firstName: other.firstName, lastName: other.lastName,
          isOnline: isOnline(other.id),
        },
        lastMessage: { content: m.content, createdAt: m.createdAt, senderId: m.senderId, fileUrl: m.fileUrl },
        unreadCount: unreadCounts.get(other.id) || 0,
        isRoom: false,
      });
    });

    rooms.forEach(r => {
      convMap.set("room_" + r.id, {
        user: { id: r.id, name: r.name || r.members.map((m: any) => m.user.firstName).join(", "), isGroup: true },
        lastMessage: r.messages[0] ? { content: r.messages[0].content, createdAt: r.messages[0].createdAt, senderId: r.messages[0].senderId, fileUrl: r.messages[0].fileUrl } : null,
        unreadCount: 0,
        isRoom: true,
        memberCount: r.members.length,
      });
    });

    return Array.from(convMap.values()).sort((a: any, b: any) => {
      const da = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const db = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return db - da;
    });
  }

  private async getUnreadCounts(userId: string) {
    const unread = await prisma.chatMessage.findMany({
      where: { receiverId: userId, readAt: null, isDeleted: false, roomId: null },
      select: { senderId: true },
    });
    const map = new Map<string, number>();
    unread.forEach(m => map.set(m.senderId, (map.get(m.senderId) || 0) + 1));
    return map;
  }

  async getMessages(userId: string, otherUserId: string) {
    const msgs = await prisma.chatMessage.findMany({
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
    return msgs.map(m => ({ ...m, reactions: m.reactions ? JSON.parse(m.reactions) : null }));
  }

  async getRoomMessages(roomId: string) {
    const msgs = await prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    return msgs.map(m => ({ ...m, reactions: m.reactions ? JSON.parse(m.reactions) : null }));
  }

  async getEntityMessages(entityType: string, entityId: string) {
    const msgs = await prisma.chatMessage.findMany({
      where: { entityType, entityId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    return msgs.map(m => ({ ...m, reactions: m.reactions ? JSON.parse(m.reactions) : null }));
  }

  async sendMessage(senderId: string, receiverId: string, content: string, replyToId: string | null, entityType: string | null, entityId: string | null, entityTitle: string | null) {
    const msg = await prisma.chatMessage.create({
      data: { senderId, receiverId, content, replyToId, entityType, entityId, entityTitle },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    const msgParsed = { ...msg, reactions: msg.reactions ? JSON.parse(msg.reactions) : null };
    if (_io) {
      emitToUser(_io, receiverId, "new-message", msgParsed);
      emitToUser(_io, senderId, "new-message", msgParsed);
    }
    return msgParsed;
  }

  async sendEntityMessage(senderId: string, entityType: string, entityId: string, content: string, replyToId: string | null, entityTitle: string | null, mentionedUserIds: string[] | null, fileUrl: string | null, fileName: string | null) {
    const msg = await prisma.chatMessage.create({
      data: { senderId, entityType, entityId, entityTitle, content, replyToId, fileUrl, fileName, receiverId: null },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    const entityMsg = { ...msg, reactions: msg.reactions ? JSON.parse(msg.reactions) : null };
    if (_io && mentionedUserIds) {
      mentionedUserIds.forEach(uid => {
        if (uid !== senderId) {
          emitToUser(_io, uid, "entity-mention", { entityType, entityId, entityTitle, content, senderName: `${msg.sender.firstName} ${msg.sender.lastName}`, messageId: msg.id });
        }
      });
    }
    return entityMsg;
  }

  async sendMessageWithFile(senderId: string, receiverId: string, fileUrl: string, fileName: string, fileSize: number, mimeType: string, content: string = "") {
    const msg = await prisma.chatMessage.create({
      data: { senderId, receiverId, content, fileUrl, fileName, fileSize, mimeType },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    const msgParsed = { ...msg, reactions: msg.reactions ? JSON.parse(msg.reactions) : null };
    if (_io) {
      emitToUser(_io, receiverId, "new-message", msgParsed);
      emitToUser(_io, senderId, "new-message", msgParsed);
    }
    return msgParsed;
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== userId) throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    return { ...updated, reactions: updated.reactions ? JSON.parse(updated.reactions) : null };
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== userId) throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    return prisma.chatMessage.update({ where: { id: messageId }, data: { isDeleted: true } });
  }

  async forwardMessage(messageId: string, fromUserId: string, toUserId: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.isDeleted) throw new Error("Message not found");
    return this.sendMessage(fromUserId, toUserId, "\uD83D\uDCE8 Переслано: " + msg.content, null, null, null, null);
  }

  async sendGroupMessage(senderId: string, roomId: string, content: string, replyToId: string | null, fileUrl?: string, fileName?: string, fileSize?: number, mimeType?: string) {
    const msg = await prisma.chatMessage.create({
      data: { senderId, roomId, content, replyToId, fileUrl, fileName, fileSize, mimeType },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (_io) emitToRoom(_io, roomId, "new-room-message", msg);
    return { ...msg, reactions: null };
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

  async getRoom(roomId: string) {
    return prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, creator: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateRoom(roomId: string, name: string, userId: string) {
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room || room.createdBy !== userId) throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    return prisma.chatRoom.update({ where: { id: roomId }, data: { name } });
  }

  async addMembers(roomId: string, memberIds: string[]) {
    const existing = await prisma.chatRoomMember.findMany({
      where: { roomId, userId: { in: memberIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m: any) => m.userId));
    const newMembers = memberIds.filter(id => !existingIds.has(id));
    if (newMembers.length > 0) {
      await prisma.chatRoomMember.createMany({
        data: newMembers.map(userId => ({ roomId, userId })),
      });
    }
    return this.getRoom(roomId);
  }

  async removeMember(roomId: string, userId: string) {
    await prisma.chatRoomMember.deleteMany({ where: { roomId, userId } });
    const remaining = await prisma.chatRoomMember.count({ where: { roomId } });
    if (remaining === 0) {
      await prisma.chatRoom.delete({ where: { id: roomId } });
      return { deleted: true };
    }
    return this.getRoom(roomId);
  }

  async markAsRead(senderId: string, receiverId: string) {
    await prisma.chatMessage.updateMany({ where: { senderId, receiverId, readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }

  async markMessageRead(messageId: string) {
    await prisma.chatMessage.update({ where: { id: messageId }, data: { readAt: new Date() } });
    return { success: true };
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error("Message not found");
    const reactions = msg.reactions ? JSON.parse(msg.reactions) : {};
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(userId);
    if (idx >= 0) {
      reactions[emoji].splice(idx, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(userId);
    }
    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { reactions: JSON.stringify(reactions) },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });
    const result = { ...updated, reactions };
    if (_io && msg.roomId) emitToRoom(_io, msg.roomId, "reaction-updated", { messageId, reactions, userId });
    if (_io && msg.receiverId) emitToUser(_io, msg.receiverId, "reaction-updated", { messageId, reactions, userId });
    if (_io && msg.senderId) emitToUser(_io, msg.senderId, "reaction-updated", { messageId, reactions, userId });
    return result;
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
    if (msg.receiverId) {
      await this.sendMessage(userId, msg.receiverId, "\u2705 Создана задача: " + task.title, null, "task", task.id, task.title);
    }
    return task;
  }
}