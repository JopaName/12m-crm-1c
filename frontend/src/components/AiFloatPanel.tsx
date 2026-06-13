import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import toast from "react-hot-toast";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function AiFloatPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/ai/coordinator", {
        sessionId,
        content: text,
      });
      if (res.data.sessionId) setSessionId(res.data.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.response || "No response." }]);
    } catch (err: any) {
      console.error("AI Error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => { setOpen(false); setMinimized(false); initialized.current = false; }}
        />
      )}

      {open && !minimized && (
        <div
          className="fixed bottom-24 right-6 w-96 h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <p className="text-sm font-semibold">AI Assistant</p>
          </div>
            <div className="flex gap-1">
              <button onClick={() => setMinimized(true)} className="p-1 hover:bg-white/20 rounded-lg text-sm">─</button>
              <button onClick={() => { setOpen(false); initialized.current = false; }} className="p-1 hover:bg-white/20 rounded-lg text-sm">✕</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 text-sm">
            {messages.length === 0 && !loading && (
              <div className="text-center text-gray-400 mt-8">
                <p className="text-lg mb-2">🤖</p>
                <p>Ask me anything about the CRM</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap " +
                    (msg.role === "user"
                      ? "bg-primary-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100")
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-3 py-2 rounded-xl rounded-bl-sm shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-100 bg-white">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50 font-medium"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {open && minimized && (
        <div
          className="fixed bottom-24 right-6 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 cursor-pointer"
          onClick={() => setMinimized(false)}
        >
          <div className="px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl text-sm font-medium">
            🤖 AI Assistant
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-full shadow-lg hover:shadow-xl z-50 flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95"
      >
        {open ? "✕" : "🤖"}
      </button>
    </>
  );
}
