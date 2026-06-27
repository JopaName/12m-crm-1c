import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatAPI, authAPI } from "../api";
import { Send, MessageCircle, AtSign } from "lucide-react";

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      return <span key={i} className="text-primary-600 font-medium bg-primary-50 px-0.5 rounded">{part}</span>;
    }
    return part;
  });
}

function extractMentionedUserIds(text: string, users: any[]): string[] {
  const mentions = text.match(/@(\S+)/g) || [];
  const ids: string[] = [];
  const userMap = new Map<string, string>();
  users.forEach((u: any) => userMap.set(`${u.firstName} ${u.lastName}`, u.id));
  mentions.forEach(m => {
    const name = m.slice(1);
    // Try exact match first, then partial
    const id = userMap.get(name);
    if (id) ids.push(id);
  });
  return ids;
}

function extractMentionQuery(input: string, cursorPos: number): { query: string; start: number } | null {
  let lastAt = -1;
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (input[i] === "@") { lastAt = i; break; }
    if (input[i] === " " || input[i] === "\n") break;
  }
  if (lastAt === -1) return null;
  const query = input.slice(lastAt + 1, cursorPos);
  if (query.includes(" ")) return null;
  return { query: query.toLowerCase(), start: lastAt };
}

export default function DealChatPanel({ dealId, dealNumber }: { dealId: string; dealNumber?: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIdx, setMentionIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["deal-chat", dealId],
    queryFn: () => chatAPI.getEntityMessages("Deal", dealId).then(r => Array.isArray(r) ? r : []),
    refetchInterval: 5000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => authAPI.getUsers().then((r: any) => r.data || []),
  });

  const mentionQuery = useMemo(() => {
    if (!inputRef.current) return null;
    return extractMentionQuery(text, inputRef.current.selectionStart || 0);
  }, [text, showMentions]);

  const mentionUsers = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.query;
    return (users || [])
      .filter((u: any) => {
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return q === "" || name.includes(q);
      })
      .slice(0, 6);
  }, [mentionQuery, users]);

  useEffect(() => {
    if (mentionUsers.length > 0 && mentionQuery) {
      setShowMentions(true);
      setMentionIdx(0);
    } else {
      setShowMentions(false);
    }
  }, [mentionUsers, mentionQuery]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      const mentionedIds = extractMentionedUserIds(content, users || []);
      return chatAPI.sendEntityMessage({
        entityType: "Deal",
        entityId: dealId,
        content,
        entityTitle: dealNumber || dealId,
        mentionedUserIds: mentionedIds,
      });
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["deal-chat", dealId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const insertMention = (user: any) => {
    if (!mentionQuery) return;
    const name = `@${user.firstName} ${user.lastName}`;
    const before = text.slice(0, mentionQuery.start);
    const after = text.slice((inputRef.current?.selectionStart || 0));
    const newText = before + name + " " + after;
    setText(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionUsers.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionUsers.length) % mentionUsers.length); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionUsers[mentionIdx]);
        return;
      }
      if (e.key === "Escape") { setShowMentions(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      if (text.trim() && !sendMutation.isPending) sendMutation.mutate(text.trim());
    }
  };

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate(text.trim());
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white shrink-0">
        <MessageCircle className="w-4 h-4 text-primary-500" />
        <span className="text-xs font-semibold text-gray-700">Обсуждение сделки</span>
        <span className="text-[10px] text-gray-400 ml-auto">{messages.length} сообщ.</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ minHeight: "0" }}>
        {isLoading ? (
          <p className="text-xs text-gray-400 text-center py-4">Загрузка...</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <AtSign className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Нет сообщений</p>
            <p className="text-[10px] mt-0.5">Используйте @имя чтобы упомянуть коллегу</p>
          </div>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} className="flex gap-2 group">
              <div className="shrink-0 mt-0.5">
                {m.sender?.avatar ? (
                  <img src={m.sender.avatar} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-100 border border-gray-200 flex items-center justify-center text-[9px] font-bold text-primary-600">
                    {m.sender?.firstName?.[0]}{m.sender?.lastName?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-semibold text-gray-600">{m.sender?.firstName} {m.sender?.lastName}</span>
                  <span className="text-[9px] text-gray-400">{formatTime(m.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 shadow-sm">
                  {highlightMentions(m.content)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="relative px-3 py-2 border-t border-gray-100 bg-white shrink-0">
        {showMentions && mentionUsers.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-44 overflow-y-auto">
            {mentionUsers.map((u: any, i: number) => (
              <button
                key={u.id}
                onClick={() => insertMention(u)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 ${i === mentionIdx ? "bg-primary-50" : ""}`}
              >
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </span>
                <span>{u.firstName} {u.lastName}</span>
                <span className="text-gray-400 ml-auto text-[10px]">{u.role?.name || ""}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Комментарий... (@ для упоминания)"
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
