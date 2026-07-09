import React, { useCallback, useEffect, useNavigate, useRef, useState } from "react";;
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Building2, CreditCard, Factory, FileText, Icon, Loader2, Package, Search, ShoppingCart, User, Wrench, X } from "lucide-react";;
import { dealsAPI, clientsAPI, tasksAPI, productsAPI, procurementAPI, warehouseAPI } from "../api";

interface SearchResult {
  type: string;
  label: string;
  title: string;
  subtitle: string;
  url: string;
}

const TYPE_ICONS: Record<string, any> = {
  deal: Briefcase, client: Building2, user: User, task: FileText,
  product: Package, procurement: ShoppingCart, warehouse: Package,
  installation: Wrench, rent: CreditCard, production: Factory,
};

const TYPE_COLORS: Record<string, string> = {
  deal: "bg-blue-100 text-blue-600", client: "bg-green-100 text-neon-green",
  user: "bg-purple-100 text-purple-600", task: "bg-amber-100 text-amber-400",
  product: "bg-emerald-100 text-neon-green", procurement: "bg-rose-100 text-rose-600",
  warehouse: "bg-teal-100 text-teal-600", installation: "bg-indigo-100 text-neon-purple",
  rent: "bg-orange-100 text-orange-600", production: "bg-cyan-100 text-cyan-600",
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 100); } else { setQuery(""); setResults([]); } }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const ql = q.toLowerCase();
    const all: SearchResult[] = [];

    try {
      // Deals
      const deals = await dealsAPI.getAll().then(r => r.data);
      (deals || []).forEach((d: any) => {
        if (d.dealNumber?.toLowerCase().includes(ql) || d.description?.toLowerCase().includes(ql))
          all.push({ type: "deal", label: "Лида", title: d.dealNumber, subtitle: `${d.expectedAmount?.toLocaleString() || 0} ₽`, url: `/deals#${encodeURIComponent(d.dealNumber)}` });
      });

      // Clients
      const clients = await clientsAPI.getAll().then(r => r.data);
      (clients || []).forEach((c: any) => {
        if (c.name?.toLowerCase().includes(ql) || c.phone?.includes(q) || c.inn?.includes(q))
          all.push({ type: "client", label: "Клиент", title: c.name, subtitle: `${c.phone || ""} ${c.inn ? "ИНН " + c.inn : ""}`, url: `/clients#${encodeURIComponent(c.name)}` });
      });

      // Tasks
      const tasks = await tasksAPI.getAll().then(r => r.data);
      (tasks || []).forEach((t: any) => {
        if (t.title?.toLowerCase().includes(ql) || t.description?.toLowerCase().includes(ql))
          all.push({ type: "task", label: "Задача", title: t.title, subtitle: t.status || "", url: `/tasks` });
      });

      // Products
      const prods = await productsAPI.getAll().then(r => r.data);
      (prods || []).forEach((p: any) => {
        if (p.name?.toLowerCase().includes(ql) || p.sku?.toLowerCase().includes(ql))
          all.push({ type: "product", label: "Товар", title: p.name, subtitle: `${p.sku || ""} ${p.salePrice ? p.salePrice + " ₽" : ""}`, url: `/products` });
      });
    } catch {}

    // Sort and limit
    all.sort((a, b) => a.title.localeCompare(b.title));
    const limited = all.slice(0, 15);
    setResults(limited);
    setSelectedIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query) debounceRef.current = setTimeout(() => search(query), 200);
    else { setResults([]); setLoading(false); }
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) { handleSelect(results[selectedIdx]); }
  };

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach(r => { if (!grouped[r.type]) grouped[r.type] = []; grouped[r.type].push(r); });

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-[#0d1520] border border-[rgba(0,229,255,0.08)] rounded-full shadow-glow flex items-center justify-center hover:shadow-xl hover:border-[rgba(0,229,255,0.12)] transition-all group"
      title="Поиск (Ctrl+K)">
      <Search className="w-5 h-5 text-gray-500 group-hover:text-neon-cyan transition-colors" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-[#0d1520] rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,229,255,0.06)]">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          <input ref={inputRef} type="text" placeholder="Поиск по всем разделам... (лиды, задачи, товары)"
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            className="flex-1 text-base outline-none bg-transparent placeholder:text-gray-500" />
          {loading && <Loader2 className="w-5 h-5 text-neon-cyan animate-spin shrink-0" />}
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-[#111927] rounded-lg text-gray-500 shrink-0"><X className="w-4 h-4" /></button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.length < 2 && !loading && (
            <div className="py-8 text-center text-gray-500 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Начните вводить — минимум 2 символа</p>
              <p className="text-xs mt-1 text-gray-300">Поиск по лидам, задачам, товарам</p>
            </div>
          )}

          {loading && results.length === 0 && (
            <div className="py-8 text-center text-gray-500"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="py-8 text-center text-gray-500 text-sm">Ничего не найдено</div>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type] || Search;
            return (
              <div key={type} className="mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">
                  <Icon className="w-3 h-3" />{items[0].label}
                </div>
                {items.map((r, i) => {
                  const globalIdx = Object.values(grouped).flat().indexOf(r);
                  return (
                    <button key={i}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${globalIdx === selectedIdx ? "bg-primary-500/10" : "hover:bg-[#111927]"}`}
                      onClick={() => handleSelect(r)} onMouseEnter={() => setSelectedIdx(globalIdx)}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[r.type]}`}>
                        <Icon className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{r.title}</p>
                        <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[rgba(0,229,255,0.06)] bg-[#111927] text-[10px] text-gray-500">
          <span><kbd className="px-1.5 py-0.5 bg-[#0d1520] border border-[rgba(0,229,255,0.08)] rounded text-[10px]">↑↓</kbd> навигация</span>
          <span><kbd className="px-1.5 py-0.5 bg-[#0d1520] border border-[rgba(0,229,255,0.08)] rounded text-[10px]">↵</kbd> выбрать</span>
          <span><kbd className="px-1.5 py-0.5 bg-[#0d1520] border border-[rgba(0,229,255,0.08)] rounded text-[10px]">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}