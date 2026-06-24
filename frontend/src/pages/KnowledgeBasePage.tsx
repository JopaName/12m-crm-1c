import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, DocPreview, Download, Editor, ExternalLink, Eye, FileText, Search, User, X } from "lucide-react";;
import { cn } from "../components/cn";
import axios from "axios";
import Editor from "@monaco-editor/react";

const api = axios.create({ baseURL: "" });
const kmAPI = { getAll: () => api.get("/api/knowledge/list") };

const fmtDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");
const fmtSize = (b: number) => b < 1024 ? b + " B" : b < 1024*1024 ? (b/1024).toFixed(1)+" KB" : (b/(1024*1024)).toFixed(1)+" MB";
const CAT_ICONS: Record<string, string> = { contract: "📄", invoice: "💰", act: "📋", spec: "📐", manual: "📖", project: "📁", other: "📎" };
const CAT_LABELS: Record<string, string> = { contract: "Договоры", invoice: "Счета", act: "Акты", spec: "Спецификации", manual: "Инструкции", project: "Проекты", other: "Прочее" };
const TEXT_EXTS = ["txt","md","json","csv","xml","yaml","yml","log","js","ts","jsx","tsx","css","html","sql","py","env","cfg"];
const IMG_EXTS = ["png","jpg","jpeg","gif","webp","svg","bmp"];

function getExt(name: string) { return (name || "").split(".").pop()?.toLowerCase() || ""; }
function canPreviewText(ext: string) { return TEXT_EXTS.includes(ext); }
function canPreviewImage(ext: string) { return IMG_EXTS.includes(ext); }

function DocPreview({ doc, onClose }: { doc: any; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ext = getExt(doc.originalName);
  const fileUrl = `http://95.81.114.106${doc.filePath}`;
  const isText = canPreviewText(ext);
  const isImage = canPreviewImage(ext);

  // Fetch text content
  useEffect(() => {
    if (isText) {
      fetch(fileUrl).then(r => r.text()).then(t => { setContent(t); setLoading(false); }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fileUrl, isText]);

  const langMap: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", json: "json", css: "css", html: "html", xml: "xml",
    sql: "sql", yaml: "yaml", yml: "yaml", md: "markdown", csv: "plaintext",
    sh: "shell", bat: "shell", ps1: "powershell", env: "plaintext", cfg: "ini"
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1520] rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,229,255,0.06)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{CAT_ICONS[doc.category] || "📎"}</span>
            <div className="min-w-0"><h3 className="font-semibold text-gray-200 text-sm truncate">{doc.originalName}</h3>
              <span className="text-[10px] text-gray-500">{fmtSize(doc.fileSize)} — {doc.fileName?.split(".").pop()?.toUpperCase()}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <a href={fileUrl} download className="p-1.5 text-gray-500 hover:text-neon-cyan hover:bg-[#111927] rounded-lg" title="Скачать"><Download className="w-4 h-4" /></a>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-500 hover:bg-[#111927] rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {loading && <div className="flex items-center justify-center h-64 text-gray-500 text-sm">Загрузка...</div>}
          {!loading && isText && content !== null && (
            <div className="h-full min-h-[60vh]">
              <Editor height="100%" language={langMap[ext] || "plaintext"} value={content}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, wordWrap: "on" }} />
            </div>
          )}
          {!loading && isImage && (
            <div className="flex items-center justify-center p-4"><img src={fileUrl} alt={doc.originalName} className="max-w-full max-h-[70vh] object-contain rounded-lg" /></div>
          )}
          {!loading && !isText && !isImage && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Предпросмотр недоступен</p>
              <a href={fileUrl} download className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Скачать файл</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const { data: docs } = useQuery({ queryKey: ["knowledge-base"], queryFn: () => kmAPI.getAll().then(r => r.data), refetchInterval: 30000 });
  const allDocs = docs || [];
  const documents = searchQuery ? allDocs.filter((d: any) => {
    const q = searchQuery.toLowerCase();
    return (d.originalName || "").toLowerCase().includes(q) || (d.tags || "").toLowerCase().includes(q) || (d.category || "").toLowerCase().includes(q) || (d.employeeName || "").toLowerCase().includes(q);
  }) : allDocs;
  const cats = [...new Set(documents.map((d: any) => d.category))];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-200 flex items-center gap-2.5"><BookOpen className="w-6 h-6 text-neon-cyan" />База знаний</h1>
        <span className="text-xs text-gray-500">{documents.length} документов</span>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input placeholder="Поиск по названию, тегам, категории..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#0d1520] border border-[rgba(0,229,255,0.08)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-primary-400 shadow-card transition-all" />
      </div>

      {cats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {cats.map(c => (
            <span key={c} className="text-xs bg-[#0d1520] border border-[rgba(0,229,255,0.08)] rounded-full px-3 py-1.5 text-gray-500 flex items-center gap-1.5">
              {CAT_ICONS[c] || "📎"} {CAT_LABELS[c] || c} ({documents.filter((d: any) => d.category === c).length})</span>))}
        </div>)}

      {documents.length === 0 ? (
        <div className="bg-[#0d1520] rounded-xl border border-[rgba(0,229,255,0.08)] p-16 text-center text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">{searchQuery ? "Ничего не найдено" : "База знаний пуста"}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc: any) => (
            <div key={doc.id} onClick={() => setPreviewDoc(doc)}
              className="bg-[#0d1520] rounded-xl border border-[rgba(0,229,255,0.08)] p-4 shadow-card hover:shadow-card-hover hover:border-primary-200 transition-all group cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-lg shrink-0 group-hover:bg-primary-500/15 transition-colors">{CAT_ICONS[doc.category] || "📎"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-200 truncate group-hover:text-neon-cyan transition-colors">{doc.originalName}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-gray-500">
                    {doc.employeeName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.employeeName}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(doc.createdAt)}</span>
                    <span>{fmtSize(doc.fileSize)}</span></div>
                  {doc.tags && <div className="flex flex-wrap gap-1 mt-2">{doc.tags.split(",").filter(Boolean).slice(0, 5).map((t: string) => (
                    <span key={t} className="text-[9px] bg-[#111927] text-gray-500 px-1.5 py-0.5 rounded-full">{t.trim()}</span>))}</div>}
                </div>
                <Eye className="w-4 h-4 text-gray-300 group-hover:text-neon-cyan shrink-0 mt-1" /></div>
            </div>))}
        </div>)}

      {previewDoc && <DocPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}
