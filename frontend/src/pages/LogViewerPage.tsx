import React, { useState, useEffect } from "react";
import { logsAPI } from "../api";
import toast from "react-hot-toast";
import { AlertCircle, X, Search, Trash2, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const LEVELS = ["error", "warn", "info", "debug"];

export default function LogViewerPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 };
      if (level) params.level = level;
      if (search) params.search = search;
      const res = await logsAPI.getLogs(params);
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      toast.error("Failed to fetch logs");
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, level]);

  const handleSearch = () => { setPage(1); fetchLogs(); };

  const handleClean = async () => {
    if (!confirm("Delete logs older than 30 days?")) return;
    try {
      await logsAPI.cleanLogs(30);
      toast.success("Old logs deleted");
      fetchLogs();
    } catch { toast.error("Failed to clean logs"); }
  };

  const levelColor = (lvl: string) => {
    switch (lvl) {
      case "error": return "text-red-600 bg-red-50 border-red-200";
      case "warn": return "text-amber-600 bg-amber-50 border-amber-200";
      case "info": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-red-500" />Логирование
        </h1>
        <div className="flex items-center gap-2">
          <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none">
            <option value="">Все уровни</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Поиск..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-48 pl-9 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <button onClick={handleClean}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
            <Trash2 className="w-3.5 h-3.5" />Очистить старые
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 mb-3">Всего записей: {total}</div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-300">
          <AlertCircle className="w-12 h-12 mb-3" />
          <p className="text-sm text-gray-400">Нет записей</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log: any) => (
            <div key={log.id}
              onClick={() => setSelected(selected?.id === log.id ? null : log)}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-sm ${levelColor(log.level)}`}>
              <div className="shrink-0 mt-0.5">
                {log.level === "error" ? <AlertCircle className="w-4 h-4" /> :
                 log.level === "warn" ? <AlertCircle className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium uppercase text-[10px]">{log.level}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500">{log.source}</span>
                  {log.url && <><span className="text-gray-400">|</span><span className="text-gray-500 truncate">{log.url}</span></>}
                </div>
                <p className="text-sm mt-0.5 break-words">{log.message}</p>
                {selected?.id === log.id && (
                  <div className="mt-2 pt-2 border-t border-current/10 text-xs space-y-1 font-mono">
                    {log.stack && <pre className="whitespace-pre-wrap text-red-700 bg-red-50/50 p-2 rounded">{log.stack}</pre>}
                    {log.metadata && <pre className="whitespace-pre-wrap text-gray-600 bg-gray-50/50 p-2 rounded">{JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre>}
                    <div className="flex items-center gap-2 text-gray-400 pt-1">
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      {log.userId && <span>User: {log.userId}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
