import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import ActionConfirmationCard from "./ActionConfirmationCard";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
}

interface ActionPayload {
  intent: "ACTION";
  action: string;
  payload: Record<string, any>;
  message: string;
}

export default function AiChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Здравствуйте! Я AI-Координатор 12M CRM. Чем могу помочь?\n\nПримеры запросов:\n• Найди клиента ООО Ромашка\n• Создай задачу позвонить Петрову\n• Какой статус сделки с Заводом Прогресс?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAction]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userId: user?.id,
        }),
      });
      const data = await res.json();

      if (data.intent === "ACTION") {
        setPendingAction(data);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || "Требуется подтверждение действия." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response || "Нет ответа." },
        ]);
      }
    } catch (err) {
      toast.error("Ошибка обращения к AI");
      setMessages((prev) => [...prev, { role: "assistant", content: "Произошла ошибка при обработке запроса." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionConfirm = async (confirmed: boolean) => {
    if (!pendingAction || !confirmed) {
      setPendingAction(null);
      setMessages((prev) => [...prev, { role: "assistant", content: "Действие отменено." }]);
      return;
    }

    try {
      const res = await fetch("/api/ai/execute-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction.action,
          payload: pendingAction.payload,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `✅ ${data.message}` },
        ]);
      } else {
        toast.error(data.error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `❌ Ошибка: ${data.error}` },
        ]);
      }
    } catch (err) {
      toast.error("Ошибка выполнения действия");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">🤖</span> AI-Координатор
        </h2>
        <p className="text-sm text-blue-100">Умный помощник для управления CRM</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-xl rounded-bl-sm shadow-sm border border-gray-100">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Confirmation */}
      {pendingAction && (
        <div className="p-4 bg-yellow-50 border-t border-yellow-200">
          <ActionConfirmationCard
            action={pendingAction.action}
            payload={pendingAction.payload}
            onConfirm={() => handleActionConfirm(true)}
            onCancel={() => handleActionConfirm(false)}
          />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Введите запрос..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 font-medium"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}
