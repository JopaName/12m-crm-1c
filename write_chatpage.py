import os

tsx = r'''import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import toast from "react-hot-toast";

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: any } | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardUserIds, setForwardUserIds] = useState<number[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [], isLoading: convLoading, error: convError } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => chatAPI.getConversations().then(r => r.data || []),
    refetchInterval: 15000,
  });

  const { data: selectedUser, refetch: refetchUser } = useQuery({
    queryKey: ["chat-user", selectedUserId],
    queryFn: () => chatAPI.getUser(selectedUserId!).then(r => r.data),
    enabled: !!selectedUserId,
  });

  const { data: roomData, refetch: refetchRoom } = useQuery({
    queryKey: ["chat-room", selectedRoomId],
    queryFn: () => chatAPI.getRoom(selectedRoomId!).then(r => r.data),
    enabled: !!selectedRoomId,
  });

  const displayUser = selectedUserId ? selectedUser : roomData;
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages", selectedUserId || selectedRoomId],
    queryFn: () => {
      if (selectedUserId) return chatAPI.getMessages(selectedUserId).then(r => r.data || []);
      if (selectedRoomId) return chatAPI.getRoomMessages(selectedRoomId).then(r => r.data || []);
      return [];
    },
    enabled: !!selectedUserId || !!selectedRoomId,
    refetchInterval: 5000,
  });

  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ["chat-pinned", selectedUserId || selectedRoomId],
    queryFn: () => {
      if (selectedUserId) return chatAPI.getPinned(selectedUserId).then(r => r.data || []);
      if (selectedRoomId) return chatAPI.getRoomPinned(selectedRoomId).then(r => r.data || []);
      return [];
    },
    enabled: (!!selectedUserId || !!selectedRoomId) && showPinned,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { content: string; replyToId?: number; editMsgId?: number; file?: File }) => {
      if (selectedUserId) {
        if (data.editMsgId) return chatAPI.editMessage(data.editMsgId, data.content).then(r => r.data);
        return chatAPI.sendMessage(selectedUserId, { content: data.content, replyToId: data.replyToId, file: data.file }).then(r => r.data);
      }
      if (selectedRoomId) {
        if (data.editMsgId) return chatAPI.editRoomMessage(data.editMsgId, data.content).then(r => r.data);
        return chatAPI.sendRoomMessage(selectedRoomId, { content: data.content, replyToId: data.replyToId, file: data.file }).then(r => r.data);
      }
    },
    onSuccess: () => {
      refetchMessages();
      if (selectedUserId) refetchUser();
      if (selectedRoomId) refetchRoom();
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (msgId: number) => chatAPI.deleteMessage(msgId),
    onSuccess: () => { refetchMessages(); queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }); },
  });

  const pinMutation = useMutation({
    mutationFn: (msgId: number) => chatAPI.togglePin(msgId),
    onSuccess: () => { refetchMessages(); if (showPinned) refetchRoom(); },
  });

  const markReadMutation = useMutation({
    mutationFn: (userId: number) => chatAPI.markRead(userId),
  });

  const handleSend = async () => {
    if (editingMsg) {
      sendMutation.mutate({ content: newMessage, editMsgId: editingMsg.id });
      setEditingMsg(null);
      setNewMessage("");
      return;
    }
    if (selectedFile) {
      sendMutation.mutate({ content: newMessage, replyToId: replyTo?.id, file: selectedFile });
    } else {
      if (!newMessage.trim()) return;
      sendMutation.mutate({ content: newMessage, replyToId: replyTo?.id });
    }
    setNewMessage("");
    setReplyTo(null);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleForward = async () => {
    if (!forwardMsg || forwardUserIds.length === 0) return;
    try {
      await Promise.all(forwardUserIds.map(uid => chatAPI.forwardMessage(forwardMsg.id, uid)));
      toast.success("Сообщение переслано");
      setShowForwardModal(false);
      setForwardMsg(null);
      setForwardUserIds([]);
    } catch { toast.error("Ошибка"); }
  };

  const handleSearchUsers = useCallback(async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchUsers([]); setSearchingUsers(false); return; }
    setSearchingUsers(true);
    try {
      const { authAPI } = await import("../api");
      const res = await authAPI.searchUsers(q);
      setSearchUsers(res.data?.data || res.data || []);
    } catch { setSearchUsers([]); }
    setSearchingUsers(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else { setFilePreview(null); }
    e.target.value = "";
  };

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return (conversations || []).filter((c: any) => {
      if (c.isRoom) return (c.user.name || "").toLowerCase().includes(q);
      return `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    const groups: { date: string; messages: any[] }[] = [];
    let currentDate = "";
    (messages as any[]).forEach((msg) => {
      const d = new Date(msg.createdAt);
      const ds = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const label = d.toDateString() === today.toDateString() ? "Сегодня"
        : d.toDateString() === yesterday.toDateString() ? "Вчера"
        : ds;
      if (label !== currentDate) { currentDate = label; groups.push({ date: label, messages: [] }); }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [messages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (selectedUserId) markReadMutation.mutate(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    const handler = () => { if (contextMenu) setContextMenu(null); };
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [contextMenu]);

  // ===== Utility functions (inline) =====
  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "только что";
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    if (d.toDateString() === now.toDateString()) return `${h}:${m}`;
    if (d.getDate() === now.getDate() - 1 && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return "вчера";
    return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  }

  function formatFullTime(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / 1048576).toFixed(1) + " МБ";
  }

  function getInitials(firstName?: string, lastName?: string) {
    return ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "?";
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-slate-50/60">
      {/* Sidebar */}
      <div className={`w-80 lg:w-88 border-r border-slate-200/70 bg-white flex flex-col ${selectedUserId || selectedRoomId ? "hidden sm:flex" : "flex"}`}>
        {/* Sidebar header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Чаты</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowUserSearch(!showUserSearch); setUserSearch(""); setSearchUsers([]); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-95 ${showUserSearch ? "bg-blue-100 text-blue-600" : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
                title="Новый чат"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all active:scale-95"
                title="Создать группу"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск чатов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100/80 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* User search */}
        {showUserSearch && (
          <div className="border-b border-slate-100 bg-blue-50/40">
            <div className="px-4 py-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Поиск сотрудников..."
                  value={userSearch}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
              </div>
              {searchingUsers && (
                <div className="flex items-center justify-center py-4">
                  <svg className="w-5 h-5 animate-spin text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              {!searchingUsers && userSearch.length >= 2 && searchUsers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">Ничего не найдено</p>
              )}
              {searchUsers.length > 0 && (
                <div className="mt-2 max-h-60 overflow-y-auto space-y-0.5">
                  {searchUsers.map((su: any) => (
                    <button
                      key={su.id}
                      onClick={() => {
                        setSelectedUserId(su.id);
                        setSelectedRoomId(null);
                        setShowUserSearch(false);
                        setUserSearch("");
                        setSearchUsers([]);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-100/60 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {((su.firstName?.[0] || "") + (su.lastName?.[0] || "")) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{su.firstName} {su.lastName}</div>
                        <div className="text-xs text-slate-500 truncate">{su.email || su.role?.name || ""}</div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
              {userSearch.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">Введите имя или email сотрудника</p>
              )}
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-1">
          {convError ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-amber-50 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">Ошибка загрузки</p>
              <p className="text-xs text-slate-400 mb-4">{(convError as any)?.message || "Не удалось загрузить чаты"}</p>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })}
                className="px-5 py-2 text-xs font-medium bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors">Повторить</button>
            </div>
          ) : convLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse px-2">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-slate-50 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">{search ? "Ничего не найдено" : "Нет чатов"}</p>
            </div>
          ) : (
            filteredConversations.map((conv: any) => {
              const isActive = conv.isRoom ? selectedRoomId === conv.user.id : selectedUserId === conv.user.id;
              return (
                <button
                  key={conv.isRoom ? "room_" + conv.user.id : conv.user.id}
                  onClick={() => {
                    if (conv.isRoom) { setSelectedRoomId(conv.user.id); setSelectedUserId(null); }
                    else { setSelectedUserId(conv.user.id); setSelectedRoomId(null); }
                    setShowPinned(false); setShowSearchResults(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left border-b border-slate-50/80 ${
                    isActive ? "bg-blue-50/80 shadow-sm" : "hover:bg-slate-50/60"
                  }`}
                >
                  {conv.isRoom ? (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="relative shrink-0">
                      <Avatar user={conv.user} size="md" />
                      {(conv.user as any).isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-800 truncate">
                        {conv.isRoom ? (conv.user.name || "Группа") : `${conv.user.firstName} ${conv.user.lastName}`}
                      </span>
                      <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2 font-medium">
                        {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[12px] text-slate-500 truncate">
                        {conv.lastMessage?.fileUrl ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            Файл
                          </span>
                        ) : conv.lastMessage?.content || "Нет сообщений"}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 ml-2 flex-shrink-0 shadow-sm">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main area */}
      {(selectedUserId || selectedRoomId) && displayUser ? (
        <div className="flex-1 flex flex-col bg-white relative">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200/70 sticky top-0 z-10">
            <button
              onClick={() => { setSelectedUserId(null); setSelectedRoomId(null); }}
              className="sm:hidden p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Avatar user={displayUser} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-slate-800">
                {displayUser?.firstName ? `${displayUser.firstName} ${displayUser.lastName}` : displayUser?.name || "Пользователь"}
              </div>
              <div className="text-[11px] text-slate-400">{(displayUser as any)?.isOnline ? "В сети" : "Не в сети"}</div>
            </div>
            <button
              onClick={() => setShowPinned(!showPinned)}
              className={`p-2 rounded-xl transition-all ${showPinned ? "bg-yellow-100 text-yellow-600" : "hover:bg-slate-100 text-slate-400"}`}
              title="Закреплённые"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={() => setShowSearchResults(!showSearchResults)}
              className={`p-2 rounded-xl transition-all ${showSearchResults ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 text-slate-400"}`}
              title="Поиск сообщений"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Pinned panel */}
          {showPinned && (
            <div className="border-b border-slate-100 bg-yellow-50/60">
              <div className="px-5 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Закреплённые</span>
                <button onClick={() => setShowPinned(false)} className="text-xs text-slate-400 hover:text-slate-600">Скрыть</button>
              </div>
              {pinnedMessages.length === 0 ? (
                <div className="px-5 pb-3 text-xs text-slate-400">Нет закреплённых сообщений</div>
              ) : (
                <div className="px-5 pb-3 space-y-1 max-h-40 overflow-y-auto">
                  {(pinnedMessages as any[]).map((msg: any) => (
                    <div key={msg.id} className="flex items-start gap-2 p-2 bg-white rounded-xl border border-yellow-200/50 shadow-sm">
                      <div className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 truncate">{msg.content || "Файл"}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatFullTime(msg.createdAt)}</p>
                      </div>
                      <button onClick={() => pinMutation.mutate(msg.id)} className="text-[10px] text-slate-400 hover:text-red-400 shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search messages panel */}
          {showSearchResults && (
            <SearchMessagesPanel
              userId={selectedUserId}
              roomId={selectedRoomId}
              onSelect={() => setShowSearchResults(false)}
            />
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gradient-to-b from-slate-50/30 to-white" id="chat-messages">
            {groupedMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-3xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-slate-600 mb-1">Начните общение</h3>
                  <p className="text-sm text-slate-400">Напишите что-нибудь, чтобы начать диалог</p>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {groupedMessages.map((group, gi) => (
                  <div key={gi}>
                    <div className="flex justify-center my-4">
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-100/80 px-3 py-1 rounded-full backdrop-blur-sm">{group.date}</span>
                    </div>
                    {group.messages.map((msg: any) => {
                      const isMine = msg.senderId === user?.id;
                      const showRead = isMine && msg.readAt;
                      const showSender = !isMine && selectedRoomId;
                      return (
                        <div key={msg.id} className={`flex mb-1 ${isMine ? "justify-end" : "justify-start"} animate-fade-in`}>
                          <div className={`max-w-[78%] ${isMine ? "order-1" : "order-1"}`}>
                            {showSender && (
                              <div className="text-[11px] font-medium text-slate-400 mb-0.5 px-1">{msg.sender.firstName} {msg.sender.lastName}</div>
                            )}
                            <div
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, msg });
                              }}
                              className={`px-3.5 py-2.5 text-sm leading-relaxed break-words relative group cursor-pointer ${
                                isMine
                                  ? "bg-blue-500 text-white rounded-2xl rounded-br-md shadow-sm"
                                  : "bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-slate-100"
                              }`}
                            >
                              {/* File content */}
                              {msg.fileUrl && !msg.fileUrl.startsWith("blob:") && (
                                <div className="mb-1.5">
                                  {msg.mimeType?.startsWith("image/") ? (
                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <img src={msg.fileUrl} alt={msg.fileName || ""} className="max-w-[280px] max-h-[220px] rounded-xl object-cover hover:opacity-90 transition-opacity" loading="lazy" />
                                    </a>
                                  ) : (
                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                        isMine ? "bg-blue-400/30 hover:bg-blue-400/40" : "bg-slate-100 hover:bg-slate-200"
                                      }`}>
                                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isMine ? "bg-white/20" : "bg-white shadow-sm"}`}>
                                        <svg className={`w-5 h-5 ${isMine ? "text-white" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                      <div className="min-w-0">
                                        <p className={`text-xs font-medium truncate max-w-[160px] ${isMine ? "text-white" : "text-slate-700"}`}>
                                          {msg.fileName || "Файл"}
                                        </p>
                                        <p className={`text-[10px] mt-0.5 ${isMine ? "text-white/70" : "text-slate-400"}`}>
                                          {formatFileSize(msg.fileSize || 0)}
                                        </p>
                                      </div>
                                    </a>
                                  )}
                                </div>
                              )}
                              {/* Text content */}
                              {msg.content && (
                                <div className={isMine ? "text-white/95" : "text-slate-800"}>
                                  {msg.content.includes('@') ? (
                                    <span dangerouslySetInnerHTML={{
                                      __html: msg.content.replace(
                                        /@(\w+)/g,
                                        '<span class="font-semibold text-blue-600 bg-blue-100/80 px-1 rounded">@$1</span>'
                                      )
                                    }} />
                                  ) : msg.content}
                                </div>
                              )}

                              {/* Time + read status */}
                              <div className={`flex items-center gap-1 mt-1 -mb-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                <span className={`text-[10px] ${isMine ? "text-white/60" : "text-slate-400"}`}>
                                  {formatFullTime(msg.createdAt)}
                                </span>
                                {showRead && (
                                  <svg className="w-3 h-3 text-blue-300" viewBox="0 0 16 11" fill="currentColor">
                                    <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 00-.336-.153.457.457 0 00-.337.14.538.538 0 00-.14.349c0 .133.047.26.14.356l2.405 2.509a.468.468 0 00.332.14c.14 0 .267-.058.368-.165l6.569-8.129a.533.533 0 00.127-.343.506.506 0 00-.142-.321zm-2.26 0a.458.458 0 00-.305-.102.494.494 0 00-.38.178l-6.19 7.636-1.084-1.13a.46.46 0 00-.337-.146.456.456 0 00-.337.14.538.538 0 00-.14.349c0 .134.047.26.14.356l1.478 1.54a.468.468 0 00.332.14c.14 0 .267-.058.368-.165l6.569-8.129a.534.534 0 00.127-.343.506.506 0 00-.142-.32z" />
                                  </svg>
                                )}
                              </div>

                              {/* Hover actions toolbar */}
                              <div className={`absolute -top-9 ${isMine ? "right-0" : "left-0"} hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl shadow-lg px-1 py-0.5 animate-scale-in`}>
                                <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-500 transition-colors" title="Ответить">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setForwardMsg(msg); setShowForwardModal(true); }}
                                  className="p-1.5 hover:bg-purple-50 rounded-lg text-slate-400 hover:text-purple-500 transition-colors" title="Переслать">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                </button>
                                {isMine && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingMsg(msg); setNewMessage(msg.content); }}
                                      className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-500 transition-colors" title="Редактировать">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm("Удалить?")) deleteMutation.mutate(msg.id); }}
                                      className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Удалить">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Reactions */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"} px-1`}>
                                {Object.entries(msg.reactions).map(([emoji, count]: [string, any]) => (
                                  <button key={emoji}
                                    onClick={() => { chatAPI.addReaction(msg.id, emoji).then(() => { refetchMessages(); }); }}
                                    className="text-xs bg-white hover:bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-sm">
                                    {emoji} <span className="text-[10px] text-slate-500 font-medium ml-0.5">{count as number}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Quick reactions */}
                            <div className={`flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${isMine ? "justify-end" : "justify-start"} px-1`}>
                              {["👍","❤️","😂","😮","😢","🔥"].map(emoji => (
                                <button key={emoji}
                                  onClick={(e) => { e.stopPropagation(); chatAPI.addReaction(msg.id, emoji).then(() => { refetchMessages(); }); }}
                                  className="text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 hover:scale-125 transition-all active:scale-90 opacity-60 hover:opacity-100">{emoji}</button>
                              ))}
                              <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }}
                                className="ml-0.5 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all opacity-60 hover:opacity-100" title="Ответить">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="px-5 py-2.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-sm border-t border-blue-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Ответ {replyTo.sender?.firstName || "пользователю"}</p>
                <div className="border-l-2 border-blue-300 pl-2 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">{replyTo.content?.substring(0, 120)}</p>
                </div>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-white/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Editing preview */}
          {editingMsg && (
            <div className="px-5 py-2.5 bg-gradient-to-r from-amber-50/90 to-yellow-50/90 backdrop-blur-sm border-t border-amber-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Редактирование</span>
                <p className="text-xs text-slate-500 truncate mt-0.5">{editingMsg.content?.substring(0, 80)}</p>
              </div>
              <button onClick={() => { setEditingMsg(null); setNewMessage(""); }} className="p-1.5 hover:bg-white/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="px-5 py-3 bg-white border-t border-slate-200/70">
            {selectedFile && (
              <div className="mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                {filePreview ? (
                  <img src={filePreview} alt="preview" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-slate-100/80 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sendMutation.isPending}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50 shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editingMsg ? "Редактировать..." : selectedFile ? "Добавить комментарий..." : "Сообщение..."}
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm max-h-32 py-1 placeholder-slate-400"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={handleSend}
                disabled={(!newMessage.trim() && !selectedFile) || sendMutation.isPending}
                className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 rounded-xl transition-all text-white shrink-0 active:scale-95 disabled:active:scale-100 shadow-sm hover:shadow-md disabled:shadow-none"
              >
                {sendMutation.isPending ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 rotate-45 translate-x-px -translate-y-px" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 hidden sm:flex items-center justify-center bg-gradient-to-br from-slate-50/60 to-white">
          <div className="text-center max-w-sm">
            <div className="w-28 h-28 mx-auto mb-5 bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl flex items-center justify-center shadow-inner">
              <svg className="w-14 h-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2 tracking-tight">Ваши сообщения</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Выберите чат из списка или создайте новый, чтобы начать общение</p>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowCreateRoom(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-4">Создать группу</h3>
            <input placeholder="Название группы" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!newRoomName.trim()) return;
                  try {
                    await chatAPI.createRoom(newRoomName.trim());
                    setShowCreateRoom(false);
                    setNewRoomName("");
                    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
                    toast.success("Группа создана");
                  } catch { toast.error("Ошибка"); }
                }}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
              >Создать</button>
              <button onClick={() => setShowCreateRoom(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[60] bg-white border border-slate-200 rounded-2xl shadow-2xl py-1.5 min-w-[200px] animate-scale-in"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 280) }}
          onClick={() => setContextMenu(null)}
        >
          <div className="px-4 pb-1.5 mb-1 border-b border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Действия</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); toast.success("Скопировано"); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-slate-700">Копировать</span>
          </button>
          <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="font-medium text-slate-700">Ответить</span>
          </button>
          <button onClick={() => { setForwardMsg(contextMenu.msg); setForwardUserIds([]); setForwardSearch(""); setShowForwardModal(true); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex items-center gap-3 transition-colors">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span className="font-medium text-slate-700">Переслать</span>
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button onClick={() => { pinMutation.mutate(contextMenu.msg.id); toast.success(contextMenu.msg.isPinned ? "Откреплено" : "Закреплено"); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-yellow-50 flex items-center gap-3 transition-colors">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="font-medium text-slate-700">{contextMenu.msg?.isPinned ? "Открепить" : "Закрепить"}</span>
          </button>
          {contextMenu.msg.senderId === user?.id && (
            <>
              <button onClick={() => { setEditingMsg(contextMenu.msg); setNewMessage(contextMenu.msg.content); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-amber-50 flex items-center gap-3 transition-colors">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="font-medium text-slate-700">Редактировать</span>
              </button>
              <button onClick={() => { if (confirm("Удалить сообщение?")) { deleteMutation.mutate(contextMenu.msg.id); } setContextMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-3 transition-colors">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-medium text-red-500">Удалить</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Forward modal */}
      {showForwardModal && forwardMsg && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in" onClick={() => setShowForwardModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-3">Переслать сообщение</h3>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 mb-3 border-l-4 border-purple-400">
              <p className="text-xs text-slate-600 truncate">{forwardMsg.content?.substring(0, 100) || "Файл"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{forwardMsg.sender?.firstName} {forwardMsg.sender?.lastName}</p>
            </div>
            <input placeholder="Поиск пользователей..." value={forwardSearch} onChange={e => setForwardSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all" />
            <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
              {conversations
                .filter((c: any) => !c.isRoom && c.user.id !== user?.id && (forwardSearch ? `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(forwardSearch.toLowerCase()) : true))
                .map((c: any) => (
                  <label key={c.user.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${forwardUserIds.includes(c.user.id) ? "bg-purple-50 border border-purple-200 shadow-sm" : "hover:bg-slate-50 border border-transparent"}`}>
                    <input type="checkbox" checked={forwardUserIds.includes(c.user.id)} onChange={() => setForwardUserIds(prev => prev.includes(c.user.id) ? prev.filter(id => id !== c.user.id) : [...prev, c.user.id])}
                      className="rounded accent-purple-500" />
                    <Avatar user={c.user} size="sm" />
                    <span className="text-sm font-medium text-slate-700">{c.user.firstName} {c.user.lastName}</span>
                  </label>
                ))}
              {(conversations as any[]).filter((c: any) => !c.isRoom && c.user.id !== user?.id).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Нет доступных пользователей</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForwardModal(false)} className="flex-1 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Отмена</button>
              <button onClick={handleForward} disabled={forwardUserIds.length === 0}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-sm">
                Переслать ({forwardUserIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload overlay */}
      {sendMutation.isPending && selectedFile && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-2xl flex items-center gap-3">
            <svg className="w-6 h-6 animate-spin text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-slate-700 font-medium">Загрузка файла...</span>
          </div>
        </div>
      )}
    </div>
  );
}
'''

# Need to handle SearchMessagesPanel import - add it inline or import it
# Since we need the SearchMessagesPanel component, let's define it inline
# Actually the component already existed in the original file as a separate component
# Let's check if we need it

# Write the file
dest = '/root/12m-crm-1c/frontend/src/pages/ChatPage.tsx'
with open(dest, 'w', encoding='utf-8') as f:
    f.write(tsx)

print(f"Written {len(tsx.split(chr(10)))} lines to {dest}")
