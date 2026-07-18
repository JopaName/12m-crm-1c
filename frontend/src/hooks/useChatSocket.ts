import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

type ChatEvents = {
  "new-message": (msg: any) => void;
  "new-room-message": (msg: any) => void;
  "reaction-updated": (data: { messageId: string; reactions: Record<string, string[]> }) => void;
  "online-users": (userIds: string[]) => void;
  "typing": (data: { userId: string; userName: string }) => void;
  "stop-typing": (data: { userId: string }) => void;
  "entity-mention": (data: { entityType: string; entityId: string; content: string; senderName: string }) => void;
  "room-created": (room: any) => void;
};

export function useChatSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const listenersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());

  useEffect(() => {
    if (!token) return;
    const socket = io("/chat", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("online-users", (ids: string[]) => setOnlineUsers(ids));
    socketRef.current = socket;
    return () => { socket.close(); socketRef.current = null; setConnected(false); };
  }, [token]);

  const on = useCallback(<K extends keyof ChatEvents>(event: K, handler: ChatEvents[K]) => {
    const s = socketRef.current;
    if (!s) {
      const unsub = () => {
        const set = listenersRef.current.get(event as string);
        if (set) { set.delete(handler as any); if (set.size === 0) listenersRef.current.delete(event as string); }
      };
      const set = listenersRef.current.get(event as string) || new Set();
      set.add(handler as any);
      listenersRef.current.set(event as string, set);
      return unsub;
    }
    s.on(event as string, handler as any);
    return () => { s.off(event as string, handler as any); };
  }, []);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    listenersRef.current.forEach((handlers, event) => {
      handlers.forEach((h) => s.on(event, h));
    });
    listenersRef.current.clear();
  }, [connected]);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("join-room", roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("leave-room", roomId);
  }, []);

  const sendTyping = useCallback((data: { roomId?: string; receiverId?: string }) => {
    socketRef.current?.emit("typing", data);
  }, []);

  const sendStopTyping = useCallback((data: { roomId?: string; receiverId?: string }) => {
    socketRef.current?.emit("stop-typing", data);
  }, []);

  return { socket: socketRef, connected, onlineUsers, on, emit, joinRoom, leaveRoom, sendTyping, sendStopTyping };
}
