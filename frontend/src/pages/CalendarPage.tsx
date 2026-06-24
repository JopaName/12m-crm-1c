import React, { useEffect, useMemo, useNavigate, useState } from "react";;
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { tasksAPI } from "../api";
import { cn } from "../components/cn";
import toast from "react-hot-toast";
import { ArrowRight, Calendar, CalendarEvent, CheckCircle2, ChevronLeft, ChevronRight, Clock, Icon, Plus, QuickCreateModal, Save, Trash2, X } from "lucide-react";;

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("ru-RU") : "";
const toDateStr = (y: number, m: number, d: number) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

const TYPE_META: Record<string, { color: string; bg: string; icon: any; label: string; path: string }> = {
  task: { color: "text-amber-400", bg: "bg-amber-500/100", icon: CheckCircle2, label: "Задача", path: "/tasks" },
};

interface CalendarEvent { id: string; type: string; title: string; date: string; subtitle: string; status?: string; entity: any; }
function getWeekDay(d: Date) { let w = d.getDay(); return w === 0 ? 6 : w - 1; }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set(Object.keys(TYPE_META)));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<"month" | "list">("month");
  const [quickCreate, setQuickCreate] = useState<{ type: string; date: string } | null>(null);

  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksAPI.getAll().then(r => r.data) });


  const allEvents = useMemo(() => {
    const ev: CalendarEvent[] = [];
    (tasks || []).forEach((t: any) => { if (t.dueDate && !t.isArchived) ev.push({ id: t.id, type: "task", title: t.title, date: t.dueDate, subtitle: t.status || "", status: t.status, entity: t }); });
    return ev.filter(e => filterTypes.has(e.type)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tasks, filterTypes]);

  const dim = daysInMonth(year, month);
  const firstDay = new Date(year, month, 1);
  const startOffset = getWeekDay(firstDay);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const eventsByDay: Record<string, CalendarEvent[]> = {};
  allEvents.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString();
      if (!eventsByDay[key]) eventsByDay[key] = [];
      eventsByDay[key].push(e);
    }
  });

  const todayStr = today.toDateString();
  const isToday = (d: number) => new Date(year, month, d).toDateString() === todayStr;
  const upcoming = allEvents.filter(e => { const diff = (new Date(e.date).getTime() - today.getTime()) / 86400000; return diff >= -1 && diff <= 30; });

  const delTask = useMutation({ mutationFn: (id: string) => tasksAPI.update(id, { isArchived: true }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Задача удалена"); setSelectedEvent(null); } });

  const handleDelete = (e: CalendarEvent) => {
    if (!window.confirm(`Удалить «${e.title}»?`)) return;
    if (e.type === "task") delTask.mutate(e.id);
    else if (e.type === "installation") delInstall.mutate(e.id);
    else if (e.type === "rent") delRent.mutate(e.id);
    else if (e.type === "legal") delLegal.mutate(e.id);
    else toast.error("Удаление не поддерживается");
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-200 flex items-center gap-2.5"><Calendar className="w-6 h-6 text-neon-cyan" />Календарь</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#111927] rounded-lg p-0.5 text-sm">
            <button onClick={() => setView("month")} className={cn("px-3 py-1 rounded-md", view === "month" ? "bg-[#0d1520] shadow-card font-medium" : "text-gray-500")}>Месяц</button>
            <button onClick={() => setView("list")} className={cn("px-3 py-1 rounded-md", view === "list" ? "bg-[#0d1520] shadow-card font-medium" : "text-gray-500")}>Список</button>
          </div>
          
          <button onClick={() => setQuickCreate({ type: "task", date: toDateStr(year, month, today.getDate()) })}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-card"><Plus className="w-3.5 h-3.5" />Создать</button>
        </div>
      </div>

      {view === "month" && (
        <div className="bg-[#0d1520] rounded-xl border border-[rgba(0,229,255,0.08)] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,229,255,0.06)]">
            <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }} className="p-1.5 hover:bg-[#111927] rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
            <h2 className="text-lg font-bold text-gray-200">{MONTHS[month]} {year}</h2>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }} className="p-1.5 hover:bg-[#111927] rounded-lg"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-[rgba(0,229,255,0.06)]">
            {DAYS.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const evts = d ? (eventsByDay[d.toString()] || []) : [];
              return (
                <div key={i} onClick={() => d && setQuickCreate({ type: "task", date: toDateStr(year, month, d) })}
                  className={cn("min-h-[80px] border-b border-r border-[rgba(0,229,255,0.04)] p-1.5 transition-colors cursor-pointer",
                    d && isToday(d) ? "bg-primary-500/10/50" : "hover:bg-[#111927]", !d ? "bg-[#111927]/30" : "")}>
                  {d && <span className={cn("text-xs font-semibold inline-block w-6 h-6 rounded-full text-center leading-6", isToday(d) ? "bg-primary-600 text-white" : "text-gray-500")}>{d}</span>}
                  <div className="space-y-0.5 mt-0.5">
                    {evts.slice(0, 3).map(e => (
                      <div key={e.id} onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                        className={cn("flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium cursor-pointer truncate hover:opacity-80", TYPE_META[e.type]?.bg + " text-gray-100")}>
                        <span className="truncate">{e.title}</span></div>
                    ))}
                    {evts.length > 3 && <span className="text-[9px] text-gray-500 px-1">+{evts.length - 3}</span>}
                  </div></div>);
            })}
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="bg-[#0d1520] rounded-xl border border-[rgba(0,229,255,0.08)] shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(0,229,255,0.06)] flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /><h3 className="text-sm font-semibold text-gray-300">Ближайшие события ({upcoming.length})</h3></div>
          {upcoming.length === 0 ? <div className="py-12 text-center text-gray-500 text-sm">Нет событий</div> : (
            <div className="divide-y divide-gray-50">{upcoming.map((e, i) => {
              const ed = new Date(e.date); const diff = Math.ceil((ed.getTime() - today.getTime()) / 86400000);
              return (
                <div key={e.id + i} onClick={() => setSelectedEvent(e)} className="flex items-center gap-4 px-4 py-3 hover:bg-[#111927] cursor-pointer group">
                  <div className="w-12 text-center shrink-0"><div className={cn("text-lg font-bold", diff < 0 ? "text-red-500" : "text-gray-200")}>{ed.getDate()}</div>
                    <div className={cn("text-[10px] uppercase", diff < 0 ? "text-red-400" : "text-gray-500")}>{MONTHS[ed.getMonth()].substring(0, 3)}</div></div>
                  <div className={cn("w-2 h-2 rounded-full shrink-0", TYPE_META[e.type]?.bg)} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-200 truncate">{e.title}</p>
                    <p className="text-xs text-gray-500">{e.subtitle} {diff === 0 ? "• Сегодня" : diff < 0 ? `• Просрочено (${-diff} дн.)` : `• Через ${diff} дн.`}</p></div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-neon-cyan shrink-0" /></div>);
            })}</div>)}
        </div>
      )}

      {/* Event detail */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="bg-[#0d1520] rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,229,255,0.06)]">
              <div className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", TYPE_META[selectedEvent.type]?.bg || "bg-[#111927]0")}>
                  {(() => { const Icon = TYPE_META[selectedEvent.type]?.icon; return Icon ? <Icon className="w-4 h-4 text-gray-100" /> : null; })()}</div>
                <div><h3 className="font-semibold text-gray-200 text-sm">{selectedEvent.title}</h3><span className="text-[10px] text-gray-500">{TYPE_META[selectedEvent.type]?.label} • {fmtDate(selectedEvent.date)}</span></div></div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 text-gray-500 rounded-lg"><X className="w-4 h-4" /></button></div>
            <div className="px-5 py-4 space-y-3">
              {selectedEvent.subtitle && <div className="text-sm text-gray-500">{selectedEvent.subtitle}</div>}
              {selectedEvent.status && <div className="text-sm"><span className="text-gray-500">Статус: </span><span className="font-medium">{selectedEvent.status}</span></div>}
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[rgba(0,229,255,0.06)] bg-[#111927]/50">
              <button onClick={() => handleDelete(selectedEvent)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-neon-red hover:bg-neon-red/10 rounded-lg"><Trash2 className="w-3 h-3" />Удалить</button>
              <div className="flex-1" />
              <button onClick={() => { setSelectedEvent(null); navigate(TYPE_META[selectedEvent.type]?.path || "/"); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Перейти <ArrowRight className="w-3.5 h-3.5" /></button>
              <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-sm text-gray-500">Закрыть</button></div>
          </div></div>)}

      {/* Quick create modal */}
      {quickCreate && <QuickCreateModal type={quickCreate.type} date={quickCreate.date} onClose={() => setQuickCreate(null)} />}
    </div>
  );
}

function QuickCreateModal({ type, date, onClose }: { type: string; date: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(type);
  const [f, setF] = useState({ title: "", subtitle: "", dueDate: date || "", installDate: date || "", startDate: date || "", monthlyPayment: 0, documentNumber: "", amount: "", documentType: "Contract_Sale", clientId: "" });

  const createTask = useMutation({
    mutationFn: (d: any) => tasksAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Задача создана"); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Ошибка"),
  });
  const createInstall = useMutation({
    mutationFn: (d: any) => installationAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["installation"] }); toast.success("Монтаж создан"); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Ошибка"),
  });
  const createRent = useMutation({
    mutationFn: (d: any) => rentAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rent"] }); toast.success("Договор создан"); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Ошибка"),
  });
  const createLegal = useMutation({
    mutationFn: (d: any) => legalAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["legal"] }); toast.success("Документ создан"); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Ошибка"),
  });

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, []);

  const handleSubmit = () => {
    if (!f.title.trim() && selectedType === "task") { toast.error("Введите название"); return; }
    if (selectedType === "task") createTask.mutate({ title: f.title, dueDate: f.dueDate || undefined });
    else if (selectedType === "installation") createInstall.mutate({ dealId: undefined, installDate: f.installDate || undefined, notes: f.subtitle || undefined });
    else if (selectedType === "rent") createRent.mutate({ contractNumber: f.title || "R-" + Date.now(), clientId: f.clientId || undefined, startDate: f.startDate || undefined, monthlyPayment: f.monthlyPayment || 0 });
    else if (selectedType === "legal") createLegal.mutate({ documentType: f.documentType, title: f.title || "Документ", documentNumber: f.documentNumber || undefined });
  };

  const meta = TYPE_META[selectedType];
  const Icon = meta?.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1520] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,229,255,0.06)]">
          <h3 className="font-semibold text-sm flex items-center gap-2">{Icon && <Icon className="w-4 h-4" />}Новый {meta?.label || "элемент"}</h3>
          <button onClick={onClose} className="p-1 text-gray-500 rounded-lg"><X className="w-4 h-4" /></button></div>
        <div className="px-5 py-4 space-y-3">
          {/* Type selector */}
          <div className="flex gap-2">
            {Object.entries(TYPE_META).filter(([k]) => k !== "deal" && k !== "installation").map(([k, m]) => (
              <button key={k} onClick={() => setSelectedType(k)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", selectedType === k ? m.bg + " text-gray-100 border-transparent" : "bg-[#0d1520] text-gray-500 border-[rgba(0,229,255,0.08)]")}>{m.label}</button>))}
          </div>

          {/* Task fields */}
          {selectedType === "task" && <>
            <input placeholder="Название задачи" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-cyan/20" autoFocus />
            <input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" />
          </>}

          {/* Installation fields */}
          {selectedType === "installation" && <>
            <input placeholder="Описание монтажа" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" autoFocus />
            <input type="date" value={f.installDate} onChange={e => setF({ ...f, installDate: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" />
          </>}

          {/* Rent fields */}
          {selectedType === "rent" && <>
            <input placeholder="Номер договора" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} className="px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" />
              <select value={f.clientId} onChange={e => setF({ ...f, clientId: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none mt-2"><option value="">Выберите клиента</option></select>
              <input type="number" placeholder="Платёж/мес" value={f.monthlyPayment || ""} onChange={e => setF({ ...f, monthlyPayment: +e.target.value })} className="px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" /></div>
          </>}

          {/* Legal fields */}
          {selectedType === "legal" && <>
            <input placeholder="Название документа" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" autoFocus />
            <input placeholder="Номер" value={f.documentNumber} onChange={e => setF({ ...f, documentNumber: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none" />
            <select value={f.documentType} onChange={e => setF({ ...f, documentType: e.target.value })} className="w-full px-3 py-2 border border-[rgba(0,229,255,0.12)] rounded-lg text-sm outline-none">
              <option value="Contract_Sale">Купли-продажи</option><option value="Contract_Rental">Аренды</option><option value="Contract_Installation_Client">Монтажа</option></select>
          </>}

          {/* Date display for all */}
          <div className="text-xs text-gray-500 flex items-center gap-1.5"><Calendar className="w-3 h-3" />{fmtDate(date)}</div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[rgba(0,229,255,0.06)] bg-[#111927]/50">
          <div className="flex-1" /><button onClick={onClose} className="px-4 py-2 text-sm text-gray-500">Отмена</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-card"><Save className="w-3.5 h-3.5 mr-1 inline" />Создать</button></div>
      </div></div>);
}
