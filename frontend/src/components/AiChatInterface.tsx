import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
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

const ADMIN_SUGGESTIONS = [
  "\u041F\u043E\u043A\u0430\u0436\u0438 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432",
  "\u0421\u043E\u0437\u0434\u0430\u0439 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F",
  "\u0427\u0442\u043E \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0435?",
];

const USER_SUGGESTIONS = [
  "\u0427\u0442\u043E \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0435?",
  "\u041D\u0430\u0439\u0434\u0438 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432",
  "\u041A\u0430\u043A\u0438\u0435 \u0435\u0441\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0438?",
];

export default function AiChatInterface() {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === "Administrator" || user?.role?.name === "Director";
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Здравствуйте, ${user?.firstName}! Я AI-Координатор 12M CRM.${isAdmin ? "\nВы вошли как администратор \u2014 можете управлять сотрудниками через чат." : ""}\n\nПримеры запросов:\n${isAdmin ? "\u2022 Покажи сотрудников\n\u2022 Создай пользователя\n\u2022 " : ""}\u2022 Что лежит на складе?\n\u2022 Найди клиентов\n\u2022 Какие есть задачи?` },
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
      const res = await api.post("/ai/coordinator", {
        messages: [...messages, userMsg],
      });
      const data = res.data;

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Ошибка: ${data.error}` },
        ]);
        return;
      }

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
    } catch (err: any) {
      console.error("AI Error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка при обработке запроса. Попробуйте ещё раз." }]);
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
      const res = await api.post("/ai/execute-action", {
        action: pendingAction.action,
        payload: pendingAction.payload,
      });
      const data = res.data;
      if (data.success) {
        toast.success(data.message);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `\u2705 ${data.message}` },
        ]);
      } else {
        toast.error(data.error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `\u274C Ошибка: ${data.error}` },
        ]);
      }
    } catch (err) {
      toast.error("Ошибка выполнения действия");
    } finally {
      setPendingAction(null);
    }
  };

  const suggestions = isAdmin ? ADMIN_SUGGESTIONS : USER_SUGGESTIONS;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-2xl">\uD83E\uDD16</span> AI-Координатор
            </h2>
            <p className="text-sm text-primary-100">Умный помощник для управления CRM</p>
          </div>
          {isAdmin && (
            <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
              Admin
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary-600 text-white rounded-br-sm"
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

      {isAdmin && messages.length <= 2 && (
        <div className="px-4 py-2 bg-primary-50 border-t border-primary-100">
          <p className="text-xs text-primary-700 font-medium mb-2">Админ-действия:</p>
          <div className="flex flex-wrap gap-2">
            {["Создай пользователя", "Покажи сотрудников", "Удали пользователя"].map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="px-3 py-1 bg-primary-100 text-primary-700 text-xs rounded-full hover:bg-primary-200 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200 transition"
            >
              {s}
            </button>
          ))}
        </div>
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50 font-medium"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}
