import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatAPI, authAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function ChatPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => authAPI.getUsers().then((r) => r.data),
  });

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatAPI.getConversations().then((r) => r.data),
    refetchInterval: 5000,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", selectedUser?.id],
    queryFn: () => chatAPI.getMessages(selectedUser.id).then((r) => r.data),
    enabled: !!selectedUser,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: (data: { receiverId: string; content: string }) =>
      chatAPI.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", selectedUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessage("");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const markReadMutation = useMutation({
    mutationFn: (userId: string) => chatAPI.markRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedUser) {
      markReadMutation.mutate(selectedUser.id);
    }
  }, [selectedUser, messages]);

  const handleSelect = (user: any) => {
    setSelectedUser(user);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;
    sendMutation.mutate({ receiverId: selectedUser.id, content: message });
  };

  const otherUsers = users?.filter((u: any) => u.id !== me?.id) || [];

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Чаты</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations?.map((conv: any) => (
            <button
              key={conv.user.id}
              onClick={() => handleSelect(conv.user)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                selectedUser?.id === conv.user.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                  {conv.user.firstName} {conv.user.lastName}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-1">
                {conv.lastMessage.content}
              </p>
            </button>
          ))}
          {otherUsers
            .filter(
              (u: any) => !conversations?.some((c: any) => c.user.id === u.id),
            )
            .map((u: any) => (
              <button
                key={u.id}
                onClick={() =>
                  handleSelect({
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                  })
                }
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selectedUser?.id === u.id ? "bg-blue-50" : ""
                }`}
              >
                <span className="text-sm font-medium text-gray-800">
                  {u.firstName} {u.lastName}
                </span>
                <p className="text-xs text-gray-400 mt-1">Нет сообщений</p>
              </button>
            ))}
          {conversations?.length === 0 && otherUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Нет других пользователей
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {selectedUser.firstName} {selectedUser.lastName}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages?.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Начните диалог
                </div>
              )}
              {messages?.map((msg: any) => {
                const isMine = msg.senderId === me?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-xl text-sm ${
                        isMine
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isMine ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isMine && msg.readAt && " ✓✓"}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-gray-200 flex gap-2"
            >
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Напишите сообщение..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                Отправить
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Выберите чат для начала общения
          </div>
        )}
      </div>
    </div>
  );
}
