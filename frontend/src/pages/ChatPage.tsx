import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatAPI } from "../api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { formatTime, formatFullTime, formatFileSize, getInitials, COLORS, Avatar, formatMessageDateSeparator, FilePreview, usePrevious } from "../utils/chat";

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  role?: { name: string };
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
}

interface Conversation {
  user: ChatUser;
  lastMessage: ChatMessage;
  unreadCount: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData, isLoading: convLoading, isError: convError, error: convErrObj } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => chatAPI.getConversations().then((r) => r.data as Conversation[]),
    refetchInterval: 5000,
  });

  const conversations = conversationsData || [];

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages", selectedUserId],
    queryFn: () => (selectedUserId ? chatAPI.getMessages(selectedUserId).then((r) => r.data as ChatMessage[]) : Promise.resolve([])),
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const { data: roomMessages, refetch: refetchRoomMessages } = useQuery({
    queryKey: ["chat-room-messages", selectedRoomId],
    queryFn: () => (selectedRoomId ? chatAPI.getRoomMessages(selectedRoomId).then((r) => r.data as ChatMessage[]) : Promise.resolve([])),
    enabled: !!selectedRoomId,
    refetchInterval: 3000,
  });

  const prevMessagesLength = usePrevious(messages?.length || 0);

  const sendMutation = useMutation({
    mutationFn: (data: any) => data.isRoom ? chatAPI.sendRoomMessage(data.roomId, data.content) : chatAPI.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      refetchMessages();
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: { id: string; content: string }) => chatAPI.editMessage(data.id, data.content),
    onSuccess: () => { setEditingMsg(null); refetchMessages(); refetchRoomMessages(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatAPI.deleteMessage(id),
    onSuccess: () => { refetchMessages(); refetchRoomMessages(); },
  });

  const forwardMutation = useMutation({
    mutationFn: (data: { messageId: string; toUserId: string }) => chatAPI.forwardMessage(data.messageId, data.toUserId),
    onSuccess: () => { toast.success("Переслано"); },
  });

  const markReadMutation = useMutation({
    mutationFn: (userId: string) => chatAPI.markRead(userId),
  });

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }, 50);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      markReadMutation.mutate(selectedUserId);
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (messages && messages.length > prevMessagesLength) {
      scrollToBottom(true);
    }
  }, [messages, prevMessagesLength, scrollToBottom]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom(false);
    }
  }, []);

  const handleSend = () => {
    if (!newMessage.trim() || (!selectedUserId && !selectedRoomId)) return;
    if (selectedRoomId) {
      sendMutation.mutate({ roomId: selectedRoomId, content: newMessage.trim(), isRoom: true, replyToId: replyTo?.id });
    } else {
      sendMutation.mutate({ receiverId: selectedUserId, content: newMessage.trim(), replyToId: replyTo?.id });
    }
    setNewMessage("");
    setReplyTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;
    setUploading(true);
    try {
      await chatAPI.sendFile(selectedUserId, file);
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      refetchMessages();
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectedUser = selectedRoomId
    ? (conversations.find((c) => c.isRoom && c.user.id === selectedRoomId)?.user || null)
    : (conversations.find((c) => c.user.id === selectedUserId)?.user || null);
  const effectiveId = selectedRoomId || selectedUserId;
  const displayMessages = selectedRoomId ? (roomMessages || []) : (messages || []);

  const filteredConversations = conversations.filter((c) => {
    const name = (c.isRoom ? (c.user.name || "") : `${c.user.firstName} ${c.user.lastName}`).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  if (displayMessages.length > 0) {
    let currentDate = "";
    for (const msg of displayMessages) {
      const dateLabel = formatMessageDateSeparator(msg.createdAt);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groupedMessages.push({ date: dateLabel, messages: [msg] });
      } else {
        groupedMessages[groupedMessages.length - 1].messages.push(msg);
      }
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      {/* Left sidebar */}
      <div className={`w-80 lg:w-96 border-r border-gray-200 bg-white flex flex-col ${selectedUserId ? "hidden sm:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-800">Messages</h2><button onClick={() => setShowCreateRoom(true)} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded hover:bg-primary-200">+</button></div>
            <span className="text-xs text-gray-400">{conversations.length} chats</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {convError ? (
            <div className="p-8 text-center">
              <svg className="w-10 h-10 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <p className="text-sm font-medium text-gray-600 mb-1">Ошибка загрузки</p>
              <p className="text-xs text-gray-400 mb-3">{(convErrObj as any)?.message || "Не удалось загрузить чаты"}</p>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })}
                className="px-4 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Повторить</button>
            </div>
          ) : convLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="flex items-center gap-3 animate-pulse"><div className="w-10 h-10 bg-gray-200 rounded-full" /><div className="flex-1 space-y-1.5"><div className="h-3 bg-gray-200 rounded w-3/4" /><div className="h-2 bg-gray-100 rounded w-1/2" /></div></div>)}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">{search ? "Ничего не найдено" : "Нет чатов"}</div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.isRoom ? selectedRoomId === conv.user.id : selectedUserId === conv.user.id;
              return (
                <button
                  key={conv.isRoom ? "room_" + conv.user.id : conv.user.id}
                  onClick={() => { if (conv.isRoom) { setSelectedRoomId(conv.user.id); setSelectedUserId(null); } else { setSelectedUserId(conv.user.id); setSelectedRoomId(null); } }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 ${
                    isActive ? "bg-blue-50 hover:bg-blue-50" : ""
                  }`}
                >
                  {conv.isRoom ? (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{"\u2660"}</div>
                  ) : (
                    <div className="relative shrink-0"><Avatar user={conv.user} size="md" />
                    {conv.user.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {conv.isRoom ? (conv.user.name || "Group") : `${conv.user.firstName} ${conv.user.lastName}`}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-500 truncate">
                        {conv.lastMessage?.fileUrl ? "📎 " : ""}
                        {conv.lastMessage?.content || "No messages"}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ml-2 flex-shrink-0">
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

      {/* Right panel - Chat area */}
      {(selectedUserId || selectedRoomId) && selectedUser ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
            <button
              onClick={() => setSelectedUserId(null)}
              className="sm:hidden p-1 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Avatar user={selectedUser} size="md" />
            <div>
              <div className="font-semibold text-sm text-gray-900">
                {selectedUser.isGroup ? (selectedUser.name || "Group") : `${selectedUser.firstName} ${selectedUser.lastName}`}
              </div>
              <div className="text-xs text-gray-400">{typing ? <span className="text-green-500 animate-pulse">печатает...</span> : (selectedUser.isGroup ? "Group" : (selectedUser.role?.name || "User"))}</div>
            </div>
          </div>

          {/* Messages area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {groupedMessages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No messages yet. Send something!
              </div>
            )}
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
                <div className="flex justify-center my-3">
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{group.date}</span>
                </div>
                {group.messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const showRead = isMine && msg.readAt;
                  return (
                    <div key={msg.id} className={`flex mb-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] ${isMine ? "order-1" : "order-1"}`}>
                        <div
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, msg }); }}
                          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words relative group ${
                            isMine
                              ? "bg-blue-500 text-white rounded-br-md"
                              : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                          }`}
                        >
                          {msg.fileUrl ? (
                            <div>
                              {msg.mimeType?.startsWith("image/") ? (
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.fileUrl} alt={msg.fileName || "image"} className="max-w-[240px] max-h-[200px] rounded-lg object-cover hover:opacity-90 transition-opacity" />
                                </a>
                              ) : (
                                <div className={`flex items-center gap-2 px-3 py-2 ${isMine ? "bg-blue-400/30" : "bg-gray-100"} rounded-lg`}>
                                  <span className="text-xl">📎</span>
                                  <div>
                                    <p className="text-xs font-medium truncate max-w-[180px]">{msg.fileName || "Файл"}</p>
                                    {msg.fileSize && <p className="text-[10px] opacity-60">{formatFileSize(msg.fileSize)}</p>}
                                  </div>
                                </div>
                              )}
                              {!msg.mimeType?.startsWith("image/") && msg.content && (
                                <p className={`mt-1 ${isMine ? "text-white/80" : "text-gray-600"}`}>{msg.content}</p>
                              )}
                            </div>
                          ) : (
                            msg.content
                          )}
                          {/* Hover actions */}
                          <div className={`absolute -top-3 ${isMine ? "left-2" : "right-2"} hidden group-hover:flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm px-0.5 py-0.5`}>
                            <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500" title="Ответить">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            </button>
                            {isMine && (<>
                              <button onClick={(e) => { e.stopPropagation(); setEditingMsg(msg); setNewMessage(msg.content); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-amber-500" title="Редактировать">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); if (confirm("Удалить сообщение?")) deleteMutation.mutate(msg.id); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500" title="Удалить">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>)}
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"} px-1`}>
                          <span className={`text-[10px] ${isMine ? "text-gray-400" : "text-gray-400"}`}>
                            {formatFullTime(msg.createdAt)}
                          </span>
{showRead && (
                            <svg className="w-3 h-3 text-blue-400" viewBox="0 0 16 11" fill="currentColor">
                              <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 00-.336-.153.457.457 0 00-.337.14.538.538 0 00-.14.349c0 .133.047.26.14.356l2.405 2.509a.468.468 0 00.332.14c.14 0 .267-.058.368-.165l6.569-8.129a.533.533 0 00.127-.343.506.506 0 00-.142-.321zm-2.26 0a.458.458 0 00-.305-.102.494.494 0 00-.38.178l-6.19 7.636-1.084-1.13a.46.46 0 00-.337-.146.456.456 0 00-.337.14.538.538 0 00-.14.349c0 .134.047.26.14.356l1.478 1.54a.468.468 0 00.332.14c.14 0 .267-.058.368-.165l6.569-8.129a.534.534 0 00.127-.343.506.506 0 00-.142-.32z" />
                            </svg>
                          )}
                          {/* Reaction bar */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className={`flex items-center gap-0.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                              {Object.entries(msg.reactions).map(([emoji, count]: [string, any]) => (
                                <span key={emoji} className="text-[10px] bg-gray-100 hover:bg-gray-200 rounded-full px-1.5 py-0.5 cursor-pointer transition-colors">{emoji} {(count as number) > 1 ? count : ""}</span>
                              ))}
                            </div>
                          )}
                          {/* Quick emoji picker on hover */}
                          <div className={`hidden group-hover:flex items-center gap-0.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                            {["👍","❤️","😂","😮","😢","😡","🔥","👏"].map(emoji => (
                              <button key={emoji} onClick={(e) => { e.stopPropagation(); chatAPI.addReaction(msg.id, emoji).then(() => { refetchMessages(); refetchRoomMessages(); }); }}
                                className="text-xs hover:scale-125 transition-transform">{emoji}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-blue-600">В ответ {replyTo.sender?.firstName || "пользователю"}</p>
                <p className="text-xs text-gray-600 truncate">{replyTo.content?.substring(0, 100)}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Editing preview */}
          {editingMsg && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
              <span className="text-[10px] font-semibold text-amber-700">Редактирование</span>
              <p className="text-xs text-gray-600 truncate flex-1">{editingMsg.content?.substring(0, 80)}</p>
              <button onClick={() => setEditingMsg(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editingMsg ? "Редактировать..." : "Сообщение..."}
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm max-h-28 py-1"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMutation.isPending}
                className="p-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-full transition-colors text-white flex-shrink-0"
              >
                {sendMutation.isPending ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 rotate-45" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 hidden sm:flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-1">Your messages</h3>
            <p className="text-sm text-gray-400">Select a conversation to start chatting</p>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowCreateRoom(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-3">Create Group</h3>
            <input placeholder="Room name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-primary-500/20" />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!newRoomName.trim()) return;
                  try {
                    await chatAPI.createRoom(newRoomName, []);
                    setShowCreateRoom(false);
                    setNewRoomName("");
                    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
                  } catch (err) { console.error("Failed to create room:", err); }
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium"
              >Create</button>
              <button onClick={() => setShowCreateRoom(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}


      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]" style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 200) }} onClick={() => setContextMenu(null)}>
          <button onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Копировать
          </button>
          <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            Ответить
          </button>
          {contextMenu.msg.senderId === user?.id && (
            <>
              <button onClick={() => { setEditingMsg(contextMenu.msg); setNewMessage(contextMenu.msg.content); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Редактировать
              </button>
              <button onClick={() => { if (confirm("Удалить сообщение?")) { deleteMutation.mutate(contextMenu.msg.id); } setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 text-red-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Удалить
              </button>
            </>
          )}
        </div>
      )}

      {/* Upload overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-xl flex items-center gap-3">
            <svg className="w-6 h-6 animate-spin text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-700">Uploading file...</span>
          </div>
        </div>
      )}
    </div>
  );
}
