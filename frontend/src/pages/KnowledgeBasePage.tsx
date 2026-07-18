import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Search, Plus, X, Edit3, Trash2, ChevronLeft, ChevronRight,
  Menu, Sun, Eye, Clock, User, Tag, FolderOpen, FileText,
  Sparkles, Check, AlertCircle, Loader2, List, Layout, ArrowLeft,
  MessageSquare, Calendar, Link2, Copy, MoreHorizontal, Save, Undo2,
  GripVertical, PanelLeftClose, PanelLeft,
  Upload, Download, File, Paperclip, Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { knowledgeAPI } from "../api";
import { cn } from "../components/cn";

// Types
interface Category {
  id: string; name: string; slug: string; description?: string; icon?: string; color?: string;
  sortOrder: number; parentId?: string | null; _count?: { articles: number };
  children?: Category[];
}

interface Article {
  id: string; title: string; content: string; excerpt?: string;
  categoryId: string; tags?: string; isPublished: boolean; viewCount: number;
  createdById: string; createdAt: string; updatedAt: string;
  category: { id: string; name: string; slug: string; icon?: string; color?: string };
  createdBy: { id: string; firstName: string; lastName: string; avatar?: string };
  updatedBy?: { id: string; firstName: string; lastName: string; avatar?: string };
}

interface ArticleFile {
  id: string; originalName: string; storageName: string;
  mimeType: string; sizeBytes: number; createdAt: string;
  items?: ArticleFile[];
}

// Default Solar/SES Categories
const DEFAULT_CATEGORIES = [
  { name: "Солнечные панели", slug: "solar-panels", icon: "☀️", color: "#f59e0b", description: "Фотоэлектрические модули, монтирование, характеристики" },
  { name: "Инверторы", slug: "inverters", icon: "⚡", color: "#3b82f6", description: "Инверторы, преобразователи, выбор оборудования" },
  { name: "Аккумуляторы", slug: "batteries", icon: "🔋", color: "#10b981", description: "Накопители энергии, батареи, зарядка" },
  { name: "Контроллеры", slug: "controllers", icon: "🎛️", color: "#8b5cf6", description: "MPPT, PWM контроллеры заряда" },
  { name: "Монтаж и установка", slug: "installation", icon: "🔧", color: "#ef4444", description: "Процесс монтажа, крепежные системы" },
  { name: "Проектирование", slug: "design", icon: "📐", color: "#06b6d4", description: "Расчёты, планирование, проектирование систем" },
  { name: "Обучение", slug: "training", icon: "📚", color: "#f97316", description: "Образовательные материалы, курсы" },
  { name: "Руководства", slug: "manuals", icon: "📖", color: "#6366f1", description: "Инструкции по эксплуатации оборудования" },
  { name: "Шаблоны", slug: "templates", icon: "📋", color: "#14b8a6", description: "Готовые шаблоны документов и договоров" },
  { name: "FAQ", slug: "faq", icon: "❓", color: "#ec4899", description: "Часто задаваемые вопросы и ответы" },
];

// Helpers
const fmtDate = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "Только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}м назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}ч назад`;
  if (diff < 172800000) return "Вчера";
  return date.toLocaleDateString("ru-RU");
};

const CAT_ICONS: Record<string, string> = {
  "solar-panels": "☀️", inverters: "⚡", batteries: "🔋", controllers: "🎛️",
  installation: "🔧", design: "📐", training: "📚", manuals: "📖",
  templates: "📋", faq: "❓",
};

const CAT_COLORS: Record<string, string> = {
  "solar-panels": "#f59e0b", inverters: "#3b82f6", batteries: "#10b981",
  controllers: "#8b5cf6", installation: "#ef4444", design: "#06b6d4",
  training: "#f97316", manuals: "#6366f1", templates: "#14b8a6", faq: "#ec4899",
};

// Stagger animation component
function Stagger({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div className={cn("animate-fade-in", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// Category Icon Picker
const ICONS = ["☀️", "⚡", "🔋", "🎛️", "🔧", "📐", "📚", "📖", "📋", "❓", "💡", "🔌", "🏠", "🏗️", "🛠️", "📊", "🎯", "🌟", "⚙️", "🔌"];

// Category Form Modal
function CategoryForm({ category, onClose, onSave }: { category?: Category; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [description, setDescription] = useState(category?.description || "");
  const [icon, setIcon] = useState(category?.icon || "📁");
  const [color, setColor] = useState(category?.color || "#6366f1");

  useEffect(() => {
    if (!category) setSlug(name.toLowerCase().replace(/[^a-zа-я0-9]+/g, "-").replace(/^-|-$/g, ""));
  }, [name, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Введите название категории"); return; }
    onSave({ name, slug: slug || name.toLowerCase().replace(/[^a-zа-я0-9]+/g, "-"), description, icon, color });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1520] rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,229,255,0.06)]">
          <h3 className="font-semibold text-gray-200 text-sm">{category ? "Редактирование категории" : "Новая категория"}</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Солнечные панели"
              className="w-full px-3 py-2.5 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              autoFocus />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Slug (URL)</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="solar-panels"
              className="w-full px-3 py-2.5 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Описание</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое описание категории"
              className="w-full px-3 py-2.5 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(i => (
                <button key={i} type="button" onClick={() => setIcon(i)}
                  className={cn("w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all", icon === i ? "bg-primary-500/20 ring-2 ring-primary-400 scale-110" : "bg-[#111927] hover:bg-[#1a2332]")}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6"].map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn("w-8 h-8 rounded-lg transition-all", color === c ? "ring-2 ring-white scale-110" : "")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-gray-400 bg-[#111927] hover:bg-[#1a2332] transition-all">Отмена</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 transition-all">
              {category ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Article Editor
function ArticleEditor({ article, categories, onClose, onSaved }: { article?: Article; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [categoryId, setCategoryId] = useState(article?.categoryId || categories[0]?.id || "");
  const [tags, setTags] = useState(article?.tags || "");
  const [isPublished, setIsPublished] = useState(article?.isPublished ?? true);
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<ArticleFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (article?.id) {
      setLoadingFiles(true);
      knowledgeAPI.getArticleFiles(article.id).then((r: any) => {
      const list = r?.files || r || [];
      setExistingFiles([...list]);
      }).catch(() => {}).finally(() => setLoadingFiles(false));
    }
  }, [article?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setPendingFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const deleteExistingFile = async (fileId: string) => {
    if (!article) return;
    try {
      await knowledgeAPI.deleteArticleFile(article.id, fileId);
      setExistingFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("Файл удалён");
    } catch { toast.error("Ошибка удаления файла"); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      setPendingFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fmtBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  const uploadFiles = async (articleId: string) => {
    if (pendingFiles.length === 0) return;
    setUploadingFiles(true);
    for (const f of pendingFiles) {
      try {
        const r = await knowledgeAPI.uploadArticleFile(articleId, f);
        setExistingFiles(prev => [...prev, { ...r, originalName: f.name, sizeBytes: f.size, mimeType: f.type }]);
      } catch (e: any) { toast.error(`Ошибка загрузки ${f.name}: ${e?.response?.data?.error || e?.message || ''}`); }
    }
    setPendingFiles([]);
    setUploadingFiles(false);
    queryClient.invalidateQueries({ queryKey: ["knowledge-article-files", articleId] });
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Введите название статьи"); return; }
    if (!categoryId) { toast.error("Выберите категорию"); return; }
    if (!content.trim()) { toast.error("Введите содержимое статьи"); return; }
    setSaving(true);
    try {
      let savedId: string;
      if (article) {
        await knowledgeAPI.updateArticle(article.id, { title, content, categoryId, tags, isPublished });
        savedId = article.id;
        toast.success("Статья обновлена");
      } else {
        const created = await knowledgeAPI.createArticle({ title, content, categoryId, tags, isPublished });
        savedId = created.id;
        toast.success("Статья создана");
      }
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-categories"] });
      if (pendingFiles.length > 0) {
        await uploadFiles(savedId);
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0d1520] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,229,255,0.06)] shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg transition-colors"><ArrowLeft className="w-4 h-4" /></button>
              <h3 className="font-semibold text-gray-200 text-sm">{article ? "Редактирование статьи" : "Новая статья"}</h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="rounded border-gray-600" />
                Опубликовать
              </label>
              <button onClick={handleSave} disabled={saving || uploadingFiles}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 transition-all disabled:opacity-50 flex items-center gap-2">
                {(saving || uploadingFiles) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {article ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок статьи..."
              className="w-full px-4 py-3 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-lg font-semibold text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Категория</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon || "📁"} {c.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Теги (через запятую)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="инверторы, монтаж, FAQ"
                  className="w-full px-3 py-2.5 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Содержимое</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={12}
                placeholder="Напишите содержимое статьи здесь. Вы можете использовать разметку markdown: **жирный**, списки, заголовки..."
                className="w-full px-4 py-3 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20 font-mono resize-none" />
            </div>

            {/* File Upload Section */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Файлы и вложения</label>
              <label
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-[rgba(0,229,255,0.12)] rounded-xl p-5 text-center cursor-pointer hover:border-primary-400/40 transition-all hover:bg-[#111927]/50 group block"
              >
                <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                <Paperclip className="w-6 h-6 text-gray-600 mx-auto mb-2 group-hover:text-primary-400 transition-colors pointer-events-none" />
                <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors pointer-events-none">
                  Перетащите файлы или нажмите, чтобы выбрать
                </p>
                <p className="text-[10px] text-gray-600 mt-1 pointer-events-none">PDF, DOCX, XLSX, изображения, ZIP · до 200 MB</p>
              </label>

              {/* Existing files (when editing) */}
              {loadingFiles && <div className="mt-2 flex items-center gap-2 text-xs text-gray-600"><Loader2 className="w-3 h-3 animate-spin" /> Загрузка файлов...</div>}
              {existingFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {existingFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#111927] rounded-xl border border-[rgba(0,229,255,0.06)] group">
                      {f.mimeType?.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-green-400 shrink-0" /> :
                       f.mimeType?.includes('pdf') ? <FileText className="w-4 h-4 text-red-400 shrink-0" /> :
                       <File className="w-4 h-4 text-blue-400 shrink-0" />}
                      <span className="text-xs text-gray-300 truncate flex-1">{f.originalName}</span>
                      <span className="text-[10px] text-gray-600 shrink-0">{fmtBytes(f.sizeBytes)}</span>
                       <a href={`/api/files/download/${f.id}?token=${token}`} target="_blank" rel="noreferrer"
                         className="text-gray-600 hover:text-primary-400 transition-colors shrink-0" title="Скачать">
                         <Download className="w-3.5 h-3.5" />
                       </a>
                       <button onClick={() => deleteExistingFile(f.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors shrink-0" title="Удалить">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending files to upload */}
              {pendingFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[#111927] rounded-xl border border-yellow-500/20">
                      <Paperclip className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span className="text-xs text-yellow-300 truncate flex-1">{f.name}</span>
                      <span className="text-[10px] text-yellow-600 shrink-0">{fmtBytes(f.size)}</span>
                      <button onClick={() => removePendingFile(i)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {!article && <p className="text-[10px] text-yellow-600/80 mt-1">Файлы будут загружены после сохранения статьи</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Article View Modal
function ArticleView({ article, onClose, onEdit, onDelete, relatedArticles }: {
  article: Article; onClose: () => void; onEdit: () => void; onDelete: () => void;
  relatedArticles: Article[];
}) {
  const [showActions, setShowActions] = useState(false);
  const [articleFiles, setArticleFiles] = useState<ArticleFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    setLoadingFiles(true);
    knowledgeAPI.getArticleFiles(article.id).then((r: any) => {
      const list = r?.files || r || [];
      setArticleFiles([...list]);
    }).catch(() => {}).finally(() => setLoadingFiles(false));
  }, [article.id]);

  const handleCreateTask = async () => {
    try {
      toast.success("Функция будет доступна в следующем обновлении");
    } catch { toast.error("Ошибка создания задачи"); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/knowledge/${article.id}`);
    toast.success("Ссылка скопирована");
  };

  const fmtView = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  const isPreviewable = (mime: string) =>
    mime.startsWith('image/') || mime.includes('pdf') || mime.startsWith('text/');

  return (
    <div className="fixed inset-0 z-[60] flex bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="flex-1 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0d1520] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-[rgba(0,229,255,0.06)] shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#111927] border border-[rgba(0,229,255,0.08)] text-gray-400"
                  style={{ borderColor: article.category?.color + "33" }}>
                  {article.category?.icon || "📁"} {article.category?.name}
                </span>
                {!article.isPublished && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Черновик</span>}
              </div>
              <h2 className="text-lg font-bold text-gray-100 mt-1">{article.title}</h2>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{article.createdBy.firstName} {article.createdBy.lastName}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(article.createdAt)}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.viewCount}</span>
                {articleFiles.length > 0 && <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{articleFiles.length}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleCopyLink} className="p-2 text-gray-500 hover:text-white hover:bg-[#111927] rounded-lg transition-all" title="Копировать ссылку">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={onEdit} className="p-2 text-gray-500 hover:text-white hover:bg-[#111927] rounded-lg transition-all" title="Редактировать">
                <Edit3 className="w-4 h-4" />
              </button>
              <div className="relative">
                <button onClick={() => setShowActions(!showActions)} className="p-2 text-gray-500 hover:text-white hover:bg-[#111927] rounded-lg transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showActions && (
                  <div className="absolute right-0 top-full mt-1 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl shadow-xl py-1 w-48 z-10">
                    <button onClick={handleCreateTask} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <Calendar className="w-4 h-4 text-primary-400" /> Создать задачу
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(article.content); toast.success("Текст скопирован"); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <Copy className="w-4 h-4 text-blue-400" /> Копировать текст
                    </button>
                    <button onClick={handleCopyLink} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <Link2 className="w-4 h-4 text-cyan-400" /> Копировать ссылку
                    </button>
                    <div className="border-t border-[rgba(0,229,255,0.06)] my-1" />
                    <button onClick={onDelete} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" /> Удалить статью
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-[#111927] rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="prose prose-sm prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
              {article.content}
            </div>

            {/* Attached Files */}
            {loadingFiles ? (
              <div className="mt-5 pt-4 border-t border-[rgba(0,229,255,0.06)] flex items-center gap-2 text-xs text-gray-600">
                <Loader2 className="w-3 h-3 animate-spin" /> Загрузка файлов...
              </div>
            ) : articleFiles.length > 0 ? (
              <div className="mt-5 pt-4 border-t border-[rgba(0,229,255,0.06)]">
                <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary-400" /> Вложения ({articleFiles.length})
                </h4>
                <div className="space-y-2">
                  {articleFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-3 px-3 py-3 bg-[#111927] rounded-xl border border-[rgba(0,229,255,0.06)] hover:border-primary-400/20 transition-all group">
                      {f.mimeType?.startsWith('image/') ? (
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5 text-green-400" />
                        </div>
                      ) : f.mimeType?.includes('pdf') ? (
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-red-400" />
                        </div>
                      ) : f.mimeType?.includes('zip') || f.mimeType?.includes('rar') ? (
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                          <File className="w-5 h-5 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <File className="w-5 h-5 text-blue-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{f.originalName}</p>
                        <p className="text-[10px] text-gray-600">{fmtView(f.sizeBytes)}</p>
                      </div>
                      {isPreviewable(f.mimeType) ? (
                         <a href={`/api/files/preview/${f.id}?token=${token}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all shrink-0">
                          <Eye className="w-3.5 h-3.5" /> Просмотр
                        </a>
                      ) : null}
                      <a href={`/api/files/download/${f.id}?token=${token}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/10 text-primary-400 text-xs hover:bg-primary-600/20 transition-all shrink-0">
                        <Download className="w-3.5 h-3.5" /> Скачать
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Tags */}
            {article.tags && (
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-[rgba(0,229,255,0.06)]">
                {article.tags.split(",").filter(Boolean).map((t, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#111927] text-gray-400 border border-[rgba(0,229,255,0.08)] flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {t.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-[rgba(0,229,255,0.06)]">
              <button onClick={handleCreateTask}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600/10 text-primary-400 border border-primary-500/20 rounded-xl text-sm hover:bg-primary-600/20 transition-all">
                <Calendar className="w-4 h-4" /> Создать задачу
              </button>
              <button onClick={() => { navigator.clipboard.writeText(article.content); toast.success("Текст скопирован"); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-sm hover:bg-blue-500/20 transition-all">
                <FileText className="w-4 h-4" /> Копировать текст
              </button>
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[rgba(0,229,255,0.06)]">
                <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" /> Похожие статьи
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedArticles.map((ra, i) => (
                    <div key={ra.id}
                      className="flex items-center gap-2 px-3 py-2 bg-[#111927] rounded-xl border border-[rgba(0,229,255,0.06)] text-sm text-gray-400 hover:text-white hover:border-primary-400/30 transition-all cursor-pointer group">
                      <span>{ra.category?.icon || "📁"}</span>
                      <span className="flex-1 truncate">{ra.title}</span>
                      <span className="text-[10px] text-gray-600 group-hover:text-gray-400 shrink-0">{ra.viewCount} просм.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function KnowledgeBasePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [articleView, setArticleView] = useState<"grid" | "list">("grid");
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  // Data
  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["knowledge-categories"],
    queryFn: () => knowledgeAPI.getCategories() as Promise<Category[]>,
  });

  const { data: articlesData, isLoading: artsLoading } = useQuery({
    queryKey: ["knowledge-articles", selectedCategoryId, searchQuery],
    queryFn: () => knowledgeAPI.getArticles({ categoryId: selectedCategoryId || undefined, search: searchQuery || undefined }) as Promise<{ items: Article[]; total: number }>,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["knowledge-search", searchQuery],
    queryFn: () => knowledgeAPI.search(searchQuery) as Promise<Article[]>,
    enabled: searchQuery.length > 0,
  });

  const articles = searchQuery ? (searchResults || []) : (articlesData?.items || []);
  const allCategories = categories || [];
  const defaultsCreated = useRef(false);

  // Related articles for current viewing article
  const { data: relatedArticles } = useQuery({
    queryKey: ["knowledge-related", viewingArticle?.id],
    queryFn: () => knowledgeAPI.getRelatedArticles(viewingArticle!.id) as Promise<Article[]>,
    enabled: !!viewingArticle,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeAPI.deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-categories"] });
      toast.success("Статья удалена");
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => knowledgeAPI.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-categories"] });
      toast.success("Категория удалена");
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  // Auto-close mobile sidebar on select
  const selectCategory = useCallback((id: string | null) => {
    setSelectedCategoryId(id);
    setMobileSidebarOpen(false);
  }, []);

  // Initialize default categories if none exist
  useEffect(() => {
    if (!catsLoading && allCategories.length === 0 && !defaultsCreated.current) {
      defaultsCreated.current = true;
      Promise.all(DEFAULT_CATEGORIES.map((cat, i) =>
        knowledgeAPI.createCategory({ ...cat, sortOrder: i })
      )).catch(() => {}).finally(() => {
        queryClient.invalidateQueries({ queryKey: ["knowledge-categories"] });
      });
    }
  }, [catsLoading, allCategories.length]);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "flex-shrink-0 bg-[#0a1120] border-r border-[rgba(0,229,255,0.06)] flex flex-col transition-all duration-300 overflow-hidden",
        sidebarOpen ? "w-64" : "w-0 lg:w-16",
        mobileSidebarOpen ? "fixed left-0 top-0 bottom-0 z-40 w-72" : "hidden lg:flex",
      )}>
        {/* Sidebar Header */}
        <div className={cn("flex items-center justify-between px-4 py-3.5 border-b border-[rgba(0,229,255,0.06)] shrink-0", !sidebarOpen && "lg:justify-center")}>
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-400" />
              <span className="text-sm font-semibold text-gray-200">Категории</span>
              <span className="text-[10px] text-gray-600 bg-[#111927] px-1.5 py-0.5 rounded-full">{allCategories.length}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => setShowCategoryForm(true)} className={cn("p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all", !sidebarOpen && "lg:block hidden")}
              title="Добавить категорию">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all hidden lg:block">
              <PanelLeftClose className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          <Stagger delay={0}>
            <button onClick={() => selectCategory(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                !selectedCategoryId ? "bg-primary-500/10 text-primary-400 font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"
              )}>
              <Layout className="w-4 h-4" />
              {sidebarOpen && <><span className="flex-1 text-left">Все статьи</span><span className="text-[10px] text-gray-600">{articlesData?.total || 0}</span></>}
            </button>
          </Stagger>

          {catsLoading ? (
            <div className="space-y-2 px-3 mt-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-9 bg-[#111927] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="mt-1 space-y-0.5">
              {allCategories.map((cat, i) => (
                <Stagger key={cat.id} delay={i * 30}>
                  <div className="group relative">
                    <button onClick={() => selectCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                        selectedCategoryId === cat.id ? "bg-primary-500/10 text-primary-400 font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}>
                      <span className="text-base shrink-0">{cat.icon || "📁"}</span>
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left truncate">{cat.name}</span>
                          <span className="text-[10px] text-gray-600">{cat._count?.articles || 0}</span>
                        </>
                      )}
                    </button>
                    {sidebarOpen && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setShowCategoryForm(true); }}
                          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteCategoryMutation.mutate(cat.id); }}
                          className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </Stagger>
              ))}
            </div>
          )}
        </div>

        {/* Collapsed state create button */}
        {!sidebarOpen && (
          <div className="p-3 border-t border-[rgba(0,229,255,0.06)]">
            <button onClick={() => setShowCategoryForm(true)} className="w-full p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center"
              title="Добавить категорию">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,229,255,0.06)] shrink-0 bg-[#0a1120]/80 backdrop-blur-sm">
          <button onClick={() => setMobileSidebarOpen(true)} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all lg:hidden">
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по статьям базы знаний..."
              className="w-full pl-10 pr-4 py-2 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl text-sm text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-gray-600" />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#111927] rounded-xl p-0.5">
            <button onClick={() => setArticleView("grid")} className={cn("p-1.5 rounded-lg transition-all", articleView === "grid" ? "bg-primary-500/20 text-primary-400" : "text-gray-500 hover:text-white")}>
              <Layout className="w-4 h-4" />
            </button>
            <button onClick={() => setArticleView("list")} className={cn("p-1.5 rounded-lg transition-all", articleView === "list" ? "bg-primary-500/20 text-primary-400" : "text-gray-500 hover:text-white")}>
              <List className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => { setEditingArticle(null); setShowEditor(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Новая статья
          </button>
        </div>

        {/* Articles Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {artsLoading ? (
            <div className={cn("gap-4", articleView === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2")}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-[#0d1520] rounded-xl p-4 border border-[rgba(0,229,255,0.06)]">
                  <div className="h-5 bg-[#111927] rounded-lg animate-pulse w-3/4 mb-3" />
                  <div className="h-3 bg-[#111927] rounded animate-pulse w-full mb-2" />
                  <div className="h-3 bg-[#111927] rounded animate-pulse w-2/3 mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-[#111927] rounded-full animate-pulse w-16" />
                    <div className="h-6 bg-[#111927] rounded-full animate-pulse w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <Stagger delay={0}>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[#111927] border border-[rgba(0,229,255,0.06)] flex items-center justify-center mb-4">
                  <BookOpen className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-400 mb-1">
                  {searchQuery ? "Ничего не найдено" : "База знаний пуста"}
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-sm">
                  {searchQuery
                    ? "Попробуйте изменить поисковый запрос"
                    : "Создайте первую статью, чтобы начать наполнять базу знаний"}
                </p>
                {!searchQuery && (
                  <button onClick={() => { setEditingArticle(null); setShowEditor(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> Создать статью
                  </button>
                )}
              </div>
            </Stagger>
          ) : articleView === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {articles.map((article: Article, i: number) => (
                <Stagger key={article.id} delay={i * 40}>
                  <ArticleCard article={article} onClick={() => setViewingArticle(article)} onEdit={() => { setEditingArticle(article); setShowEditor(true); }}
                    onDelete={() => { if (confirm("Удалить статью?")) deleteMutation.mutate(article.id); }} />
                </Stagger>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {articles.map((article: Article, i: number) => (
                <Stagger key={article.id} delay={i * 20}>
                  <ArticleRow article={article} onClick={() => setViewingArticle(article)} onEdit={() => { setEditingArticle(article); setShowEditor(true); }}
                    onDelete={() => { if (confirm("Удалить статью?")) deleteMutation.mutate(article.id); }} />
                </Stagger>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditor && (
        <ArticleEditor
          article={editingArticle || undefined}
          categories={allCategories}
          onClose={() => { setShowEditor(false); setEditingArticle(null); }}
          onSaved={() => { setShowEditor(false); setEditingArticle(null); }}
        />
      )}

      {viewingArticle && (
        <ArticleView
          article={viewingArticle}
          onClose={() => setViewingArticle(null)}
          onEdit={() => { setViewingArticle(null); setEditingArticle(viewingArticle); setShowEditor(true); }}
          onDelete={() => { if (confirm("Удалить статью?")) { deleteMutation.mutate(viewingArticle.id); setViewingArticle(null); } }}
          relatedArticles={relatedArticles || []}
        />
      )}

      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => { setShowCategoryForm(false); setEditingCategory(undefined); }}
          onSave={async (data) => {
            try {
              if (editingCategory) {
                await knowledgeAPI.updateCategory(editingCategory.id, data);
                toast.success("Категория обновлена");
              } else {
                await knowledgeAPI.createCategory(data);
                toast.success("Категория создана");
              }
              queryClient.invalidateQueries({ queryKey: ["knowledge-categories"] });
              setShowCategoryForm(false);
              setEditingCategory(undefined);
            } catch (e: any) {
              toast.error(e?.response?.data?.error || "Ошибка");
            }
          }}
        />
      )}
    </div>
  );
}

// Article Card (Grid View)
function ArticleCard({ article, onClick, onEdit, onDelete }: { article: Article; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div onClick={onClick}
      className="bg-[#0d1520] rounded-xl border border-[rgba(0,229,255,0.06)] p-4 hover:border-primary-400/30 transition-all duration-200 cursor-pointer group active:scale-[0.98]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{article.category?.icon || "📁"}</span>
          <span className="text-[10px] text-gray-600 bg-[#111927] px-2 py-0.5 rounded-full truncate"
            style={{ border: `1px solid ${article.category?.color || "transparent"}22`, color: article.category?.color || "#888" }}>
            {article.category?.name}
          </span>
        </div>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-lg text-gray-600 hover:text-white hover:bg-[#111927] transition-all opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl shadow-xl py-1 w-36 z-10">
              <button onClick={() => { setShowMenu(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Редактировать
              </button>
              <button onClick={() => { setShowMenu(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Удалить
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-medium text-sm text-gray-200 mb-1.5 line-clamp-2 group-hover:text-primary-300 transition-colors">{article.title}</h3>
      {article.excerpt && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{article.excerpt}</p>}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(article.tags || "").split(",").filter(Boolean).slice(0, 3).map((t, i) => (
          <span key={i} className="text-[9px] text-gray-600 bg-[#111927] px-1.5 py-0.5 rounded-full">{t.trim()}</span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-gray-600 pt-2 border-t border-[rgba(0,229,255,0.04)]">
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.viewCount}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(article.createdAt)}</span>
        <span className="flex items-center gap-1 ml-auto"><User className="w-3 h-3" />{article.createdBy.firstName?.[0]}.{article.createdBy.lastName?.[0]}</span>
      </div>
    </div>
  );
}

// Article Row (List View)
function ArticleRow({ article, onClick, onEdit, onDelete }: { article: Article; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-[#0d1520] rounded-xl border border-[rgba(0,229,255,0.06)] hover:border-primary-400/20 transition-all cursor-pointer group active:scale-[0.99]">
      <span className="text-lg shrink-0">{article.category?.icon || "📁"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200 truncate group-hover:text-primary-300 transition-colors">{article.title}</span>
          {!article.isPublished && <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full shrink-0">Черновик</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-600">
          <span>{article.category?.name}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.viewCount}</span>
          <span>·</span>
          <span>{fmtDate(article.createdAt)}</span>
        </div>
      </div>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#111927] transition-all opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-[#111927] border border-[rgba(0,229,255,0.08)] rounded-xl shadow-xl py-1 w-36 z-10">
            <button onClick={() => { setShowMenu(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Edit3 className="w-3.5 h-3.5 text-blue-400" /> Редактировать</button>
            <button onClick={() => { setShowMenu(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /> Удалить</button>
          </div>
        )}
      </div>
    </div>
  );
}
