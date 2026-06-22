import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatAPI } from "../api";
import { useAuth } from "../context/AuthContext";
;

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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function formatFullTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getInitials(u: { firstName: string; lastName: string }) {
  return (u.firstName?.[0] || "") + (u.lastName?.[0] || "");
}

const COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500",
  "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-cyan-500",
];

function Avatar({ user, size = "md" }: { user: { firstName: string; lastName: string }; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };
  const colorIdx = (user.firstName?.length || 0) % COLORS.length;
  return (
    <div className={`${sizes[size]} ${COLORS[colorIdx]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {getInitials(user)}
    </div>
  );
}

function formatMessageDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

function FilePreview({ msg }: { msg: ChatMessage }) {
  const isImage = msg.mimeType?.startsWith("image/");
  if (isImage) {
    return (
      <a href={msg.fileUrl!} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
        <img src={msg.fileUrl!} alt={msg.fileName || ""} className="rounded-lg max-h-60 object-cover" />
      </a>
    );
  }
  return (
    <a
      href={msg.fileUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm hover:bg-gray-200 transition-colors"
    >
      <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <div className="min-w-0">
        <div className="text-gray-800 font-medium truncate">{msg.fileName}</div>
        <div className="text-gray-400 text-xs">{formatFileSize(msg.fileSize || 0)}</div>
      </div>
    </a>
  );
}

function usePrevious<T>(value: T) {
  const ref = useRef<T>(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
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

  const prevMessagesLength = usePrevious(messages?.length || 0);

  const sendMutation = useMutation({
    mutationFn: (data: { receiverId: string; content: string }) => chatAPI.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      refetchMessages();
    },
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
    if (!newMessage.trim() || !selectedUserId) return;
    sendMutation.mutate({ receiverId: selectedUserId, content: newMessage.trim() });
    setNewMessage("");
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

  const selectedUser = conversations.find((c) => c.user.id === selectedUserId)?.user || null;

  const filteredConversations = conversations.filter((c) => {
    const name = `${c.user.firstName} ${c.user.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  if (messages) {
    let currentDate = "";
    for (const msg of messages) {
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
            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
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
              const isActive = selectedUserId === conv.user.id;
              return (
                <button
                  key={conv.user.id}
                  onClick={() => setSelectedUserId(conv.user.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 ${
                    isActive ? "bg-blue-50 hover:bg-blue-50" : ""
                  }`}
                >
                  <Avatar user={conv.user} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {conv.user.firstName} {conv.user.lastName}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-500 truncate">
                        {conv.lastMessage?.fileUrl ? "\u{1F4CE} " : ""}
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
      {selectedUserId && selectedUser ? (
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
                {selectedUser.firstName} {selectedUser.lastName}
              </div>
              <div className="text-xs text-gray-400">{selectedUser.role?.name || "User"}</div>
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
                          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            isMine
                              ? "bg-blue-500 text-white rounded-br-md"
                              : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                          }`}
                        >
                          {msg.fileUrl ? (
                            <div className={isMine ? "" : ""}>
                              <FilePreview msg={msg} />
                              {!msg.mimeType?.startsWith("image/") && (
                                <div className={`mt-1 text-xs ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                                  {msg.content}
                                </div>
                              )}
                            </div>
                          ) : (
                            msg.content
                          )}
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

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
                placeholder="Message..."
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
