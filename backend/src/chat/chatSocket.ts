import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
}

const onlineUsers = new Map<string, string>();

export function setupChatSocket(io: Server) {
  const chatNs = io.of("/chat");

  chatNs.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error("Auth required"));
    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || "12m-crm-jwt-secret-2024") as any;
      socket.userId = decoded.userId;
      socket.userName = `${decoded.firstName || ""} ${decoded.lastName || ""}`.trim();
      next();
    } catch { next(new Error("Invalid token")); }
  });

  chatNs.on("connection", (socket: AuthSocket) => {
    console.log(`Chat: ${socket.userName} online`);
    if (socket.userId) {
      onlineUsers.set(socket.userId, socket.userName);
      chatNs.emit("online-users", Array.from(onlineUsers.keys()));
      socket.join(socket.userId);
    }

    socket.on("join-room", (roomId: string) => { socket.join(roomId); });
    socket.on("leave-room", (roomId: string) => { socket.leave(roomId); });

    socket.on("typing", (data: { roomId?: string; receiverId?: string }) => {
      if (data.roomId) socket.to(data.roomId).emit("typing", { userId: socket.userId, userName: socket.userName });
      if (data.receiverId) socket.to(data.receiverId).emit("typing", { userId: socket.userId, userName: socket.userName });
    });
    socket.on("stop-typing", (data: { roomId?: string; receiverId?: string }) => {
      if (data.roomId) socket.to(data.roomId).emit("stop-typing", { userId: socket.userId });
      if (data.receiverId) socket.to(data.receiverId).emit("stop-typing", { userId: socket.userId });
    });

    socket.on("disconnect", () => {
      console.log(`Chat: ${socket.userName} offline`);
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        chatNs.emit("online-users", Array.from(onlineUsers.keys()));
      }
    });
  });

  return chatNs;
}

export function isOnline(userId: string): boolean { return onlineUsers.has(userId); }
export function emitToUser(io: Server, userId: string, event: string, data: any) { io.of("/chat").to(userId).emit(event, data); }
export function emitToRoom(io: Server, roomId: string, event: string, data: any) { io.of("/chat").to(roomId).emit(event, data); }