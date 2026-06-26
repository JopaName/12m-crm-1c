import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatAPI } from "../api";
import { Send, MessageCircle } from "lucide-react";

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function DealChatPanel({ dealId, dealNumber }: { dealId: string; dealNumber?: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["deal-chat", dealId],
    queryFn: () => chatAPI.getEntityMessages("Deal", dealId).then(r => Array.isArray(r) ? r : []),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatAPI.sendEntityMessage({
      entityType: "Deal",
      entityId: dealId,
      content,
      entityTitle: dealNumber || dealId,
    }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["deal-chat", dealId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col border-t border-gray-100 bg-gray-50/30">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white">
        <MessageCircle className="w-4 h-4 text-primary-500" />
        <span className="text-xs font-semibold text-gray-700">Обсуждение сделки</span>
        <span className="text-[10px] text-gray-400 ml-auto">{messages.length} сообщений</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: "280px", minHeight: "120px" }}>
        {isLoading ? (
          <p className="text-xs text-gray-400 text-center py-4">Загрузка...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Нет сообщений. Начните обсуждение.</p>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold text-gray-600">{m.sender?.firstName} {m.sender?.lastName}</span>
                <span className="text-[9px] text-gray-400">{formatTime(m.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-800 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 shadow-sm">{m.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Комментарий..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
