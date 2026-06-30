import { useState } from "react";
import { X, Plus, Trash2, GripVertical, Check, Palette } from "lucide-react";

interface StageConfig {
  key: string;
  label: string;
  color: string; // tailwind color prefix: "blue", "emerald", "purple", etc.
}

const COLOR_OPTIONS = [
  { name: "Синий", value: "blue", class: "bg-blue-500" },
  { name: "Изумрудный", value: "emerald", class: "bg-emerald-500" },
  { name: "Фиолетовый", value: "purple", class: "bg-purple-500" },
  { name: "Янтарный", value: "amber", class: "bg-amber-500" },
  { name: "Красный", value: "red", class: "bg-red-500" },
  { name: "Розовый", value: "pink", class: "bg-pink-500" },
  { name: "Индиго", value: "indigo", class: "bg-indigo-500" },
  { name: "Бирюзовый", value: "teal", class: "bg-teal-500" },
  { name: "Оранжевый", value: "orange", class: "bg-orange-500" },
  { name: "Серый", value: "slate", class: "bg-slate-500" },
];

const DEFAULT_STAGES: StageConfig[] = [
  { key: "Lead_Created", label: "Лид", color: "blue" },
  { key: "Invoice_Generation", label: "Счёт", color: "amber" },
  { key: "Legal_Review", label: "Юристы", color: "purple" },
  { key: "Doc_Sending", label: "Доки", color: "indigo" },
  { key: "Waiting_Payment", label: "Оплата", color: "orange" },
  { key: "Paid_And_Reserved", label: "Резерв", color: "teal" },
  { key: "Issuing_Goods", label: "Отгрузка", color: "cyan" },
  { key: "Deal_Closed", label: "Закрыто", color: "emerald" },
];

function loadPipeline(): StageConfig[] {
  try {
    const raw = localStorage.getItem("crm_pipeline_config");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_STAGES;
}

export function getPipelineConfig(): StageConfig[] {
  return loadPipeline();
}

export function savePipeline(stages: StageConfig[]) {
  localStorage.setItem("crm_pipeline_config", JSON.stringify(stages));
}

export default function PipelineEditor({ onClose }: { onClose: () => void }) {
  const [stages, setStages] = useState<StageConfig[]>(() => loadPipeline());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const addStage = () => {
    const key = "Stage_" + Date.now();
    setStages([...stages, { key, label: "Новый этап", color: "slate" }]);
    setEditingIdx(stages.length);
  };

  const removeStage = (idx: number) => {
    if (stages.length <= 2) return;
    setStages(stages.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const moveStage = (from: number, to: number) => {
    const next = [...stages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setStages(next);
    setDragIdx(null);
  };

  const handleSave = () => {
    savePipeline(stages);
    onClose();
    window.location.reload(); // Refresh to apply new pipeline
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Настройка воронки</h3>
              <p className="text-xs text-white/60 mt-0.5">Редактируйте этапы, названия и цвета</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {stages.map((stage, idx) => {
            const colorClass = COLOR_OPTIONS.find(c => c.value === stage.color) || COLOR_OPTIONS[0];
            return (
              <div key={idx}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) moveStage(dragIdx, idx); }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${editingIdx === idx ? "border-blue-300 bg-blue-50/30" : "border-gray-200 hover:border-gray-300"}`}
              >
                <button className="cursor-grab text-gray-300 hover:text-gray-500" title="Перетащить">
                  <GripVertical className="w-4 h-4" />
                </button>

                <div className={`w-8 h-8 rounded-lg ${colorClass.class} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {idx + 1}
                </div>

                {editingIdx === idx ? (
                  <div className="flex-1 space-y-2">
                    <input
                      value={stage.label}
                      onChange={e => setStages(stages.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Название этапа"
                      autoFocus
                    />
                    <input
                      value={stage.key}
                      onChange={e => setStages(stages.map((s, i) => i === idx ? { ...s, key: e.target.value.replace(/\s/g, "_") } : s))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-500 outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ключ (например: Lead_Created)"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c.value} onClick={() => setStages(stages.map((s, i) => i === idx ? { ...s, color: c.value } : s))}
                          className={`w-7 h-7 rounded-lg ${c.class} transition-all ${stage.color === c.value ? "ring-2 ring-offset-1 ring-blue-400 scale-110" : "opacity-60 hover:opacity-100"}`}
                          title={c.name}
                        />
                      ))}
                    </div>
                    <button onClick={() => setEditingIdx(null)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Check className="w-3 h-3" /> Готово
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0" onClick={() => setEditingIdx(idx)}>
                      <p className="text-sm font-medium text-gray-800 cursor-pointer hover:text-blue-600">{stage.label}</p>
                      <p className="text-[10px] text-gray-400">{stage.key}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingIdx(idx)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Редактировать">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {stages.length > 2 && (
                        <button onClick={() => removeStage(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Удалить">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-4 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <button onClick={addStage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Добавить этап
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm">
            <Check className="w-4 h-4" /> Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
