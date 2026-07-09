import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { dealsAPI } from "../api";
import { formatTime } from "../utils/chat";
import toast from "react-hot-toast";
import { Send, User, FileText, DollarSign, CheckCircle, RefreshCw, Megaphone } from "lucide-react";

const fmtShort = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const wallRef = useRef<HTMLDivElement>(null);

  const { data: myDealsData } = useQuery({ queryKey: ["deals"], queryFn: () => dealsAPI.getAll().then(r => Array.isArray(r.data) ? r.data : (r.data?.data || [])) });
  const myDeals = myDealsData || [];
  const myActive = myDeals.filter((d: any) => d.status !== "Deal_Closed" && d.responsibleAgentId === user?.id);
  const myClosed = myDeals.filter((d: any) => d.status === "Deal_Closed" && d.responsibleAgentId === user?.id);
  const myAmount = myActive.reduce((s: number, d: any) => s + (d.expectedAmount || 0), 0);

  const { data: wallPosts } = useQuery({
    queryKey: ["wall"],
    queryFn: () => fetch("/api/wall", { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const token = localStorage.getItem("token");
      const r = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ content: newPost.trim() })
      });
      if (r.ok) {
        setNewPost("");
        queryClient.invalidateQueries({ queryKey: ["wall"] });
        toast.success("Опубликовано");
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка");
    }
    setPosting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          👋 {user?.firstName || "Гость"}, добро пожаловать!
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{myActive.length}</p>
              <p className="text-[10px] text-gray-400 uppercase">Активных</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{myClosed.length}</p>
              <p className="text-[10px] text-gray-400 uppercase">Закрыто</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{myAmount.toLocaleString()} ₽</p>
              <p className="text-[10px] text-gray-400 uppercase">В работе</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{myDeals.length}</p>
              <p className="text-[10px] text-gray-400 uppercase">Всего</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <Megaphone className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-700">Доска объявлений</h2>
          <span className="text-[10px] text-gray-400 ml-auto">{(wallPosts || []).length} сообщ.</span>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-primary-600">{user?.firstName?.[0] || "?"}</span>
            </div>
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                placeholder="Что нового? Поделитесь с коллегами..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none bg-white"
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePost(); }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">Ctrl+Enter чтобы отправить</span>
                <button onClick={handlePost} disabled={!newPost.trim() || posting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-all shadow-sm">
                  {posting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Опубликовать
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={wallRef} className="divide-y divide-gray-50">
          {(wallPosts || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Megaphone className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm text-gray-400">Пока нет публикаций</p>
              <p className="text-xs text-gray-300 mt-1">Напишите первое сообщение для всех</p>
            </div>
          ) : (
            (wallPosts || []).map((post: any) => (
              <div key={post.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">
                      {(post.user?.firstName?.[0] || "") + (post.user?.lastName?.[0] || "")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{post.user?.firstName} {post.user?.lastName}</span>
                      <span className="text-[10px] text-gray-400">{fmtShort(post.createdAt)} в {fmtTime(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}