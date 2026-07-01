import { useState, useRef, useEffect } from "react";
import api from "../api";
import FilePreviewModal from "../components/FilePreviewModal";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Zap, Sun, Home, User, Phone, FileText, Calculator, RefreshCw, Check, Copy, Minus, Plus, Download, Printer, Save, Eye, Trash2 } from "lucide-react";

const PANEL_POWER = 400; // Ватт на панель
const EQUIPMENT_TYPES = ["СЭС под ключ", "Солнечные панели", "Инвертор", "АКБ", "Гибридная СЭС", "Сетевая СЭС", "Автономная СЭС"];
const ROOF_TYPES = ["Скатная", "Плоская", "Металлочерепица", "Мягкая кровля", "Фальцевая"];
const PANEL_PRICE = 9500; // Цена за панель 400W (розница)

export default function CalculatorPage() {
  const { user } = useAuth();
  const STORAGE_KEY = "12m_cp_form";
  const loadForm = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { equipment: "СЭС под ключ", roofType: "Скатная", clientName: "", clientPhone: "", clientAddress: "" };
  };
  const savedForm = loadForm();
  const [customPower, setCustomPower] = useState(savedForm.power || "30");
  const [form, setForm] = useState(savedForm);

  const saveForm = (p: string, f: typeof form) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ power: p, ...f }));
  };

  const updateForm = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    saveForm(customPower, next);
  };

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedKps, setSavedKps] = useState<any[]>([]);
  const [selectedKp, setSelectedKp] = useState<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const power = parseInt(customPower) || 30;
  const panelCount = Math.ceil((power * 1000) / PANEL_POWER);
  const estimatedMin = Math.round(power * 45000);
  const estimatedMax = Math.round(power * 70000);

  const adjustPower = (delta: number) => {
    const next = Math.max(1, power + delta);
    setCustomPower(String(next));
    saveForm(String(next), form);
  };

  const generateProposal = async () => {
    setGenerating(true); setResult("");
    try {
      const prompt = `Ты — эксперт по солнечной энергетике компании 12M. Создай КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ на основе данных:

ВАЖНЫЕ ПАРАМЕТРЫ:
- Мощность: ${power} кВт
- Используются панели мощностью ${PANEL_POWER}W (400 Вт)
- Необходимое количество панелей: ${panelCount} шт
- Ориентировочная цена панели: ${PANEL_PRICE} руб/шт
- Стоимость панелей: ${(panelCount * PANEL_PRICE).toLocaleString()} руб
- Тип: ${form.equipment}
- Кровля: ${form.roofType}
- Клиент: ${form.clientName || "Частное лицо"}
- Адрес: ${form.clientAddress || "будет уточнён"}
- Телефон: ${form.clientPhone || "не указан"}

ФОРМАТ КП (строго):
1. ЗАГОЛОВОК: "Коммерческое предложение"
2. ИНФОРМАЦИЯ О КЛИЕНТЕ
3. ТЕХНИЧЕСКОЕ РЕШЕНИЕ для ${power} кВт
4. ТАБЛИЦА (реальные позиции с цифрами):
   - Солнечные панели 400W: ${panelCount} шт × ${PANEL_PRICE}₽ = ${(panelCount * PANEL_PRICE).toLocaleString()}₽
   - Инвертор (подходящий для ${power} кВт)
   - Крепления для ${form.roofType} кровли
   - Кабель и коммутация
   - Монтажные работы
   - Пусконаладка
5. СРОКИ
6. ГАРАНТИЯ
7. ИТОГО: примерная стоимость ${estimatedMin.toLocaleString()}–${estimatedMax.toLocaleString()} ₽
8. КОНТАКТЫ: 12M Engineering, +7 861 200-00-12, sales@12m-energy.ru

Цены в рублях, реалистичные. НДС включён. Стиль деловой. НЕ используй инструменты CRM — просто напиши текст КП.`;

      const res = await api.post("/ai/coordinator", { content: prompt, skipTools: true, maxTokens: 3000 });
      setResult(res.data?.response || "Не удалось сгенерировать.");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e) {
      setResult("Ошибка генерации.");
    }
    setGenerating(false);
  };

  
  const downloadDoc = () => {
    const style = "@page { size: A4; margin: 2cm 3cm 2cm 2cm; } body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.15; } h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12pt; color: #000; text-transform: uppercase; } h2 { font-size: 13pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; color: #000; } h3 { font-size: 12pt; font-weight: bold; margin-top: 8pt; margin-bottom: 4pt; color: #000; } p { margin: 0 0 6pt 0; text-indent: 1.25cm; } p.no-indent { text-indent: 0; } table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; } td, th { border: 1px solid #000; padding: 4pt 8pt; } th { background: #e0e0e0; font-weight: bold; text-align: center; } .right { text-align: right; } .center { text-align: center; } .bold { font-weight: bold; } .signature { margin-top: 40pt; display: flex; justify-content: space-between; } .signature div { width: 200pt; }";

    const lines = result.split('\n');
    let bodyHtml = '';
    let inTable = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) { bodyHtml += '<br>'; return; }

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (!inTable) { bodyHtml += '<table>'; inTable = true; }
        const cells = trimmed.split('|').filter(c => c.trim());
        if (cells.every(c => c.match(/^[-:]+$/))) return;
        bodyHtml += '<tr>' + cells.map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
        return;
      } else if (inTable) {
        bodyHtml += '</table>';
        inTable = false;
      }

      if (trimmed.match(/^(# |\\d+\\.)/)) {
        bodyHtml += '<p class="no-indent bold">' + trimmed.replace(/^# /, '') + '</p>';
      } else if (trimmed.match(/^(КОММЕРЧЕСКОЕ|ТЕХНИЧЕСКОЕ|ТАБЛИЦА|СРОКИ|ГАРАНТИЯ|ИТОГО|КОНТАКТЫ|ИНФОРМАЦИЯ|ПРЕДЛОЖЕНИЕ)/i)) {
        bodyHtml += '<h2>' + trimmed + '</h2>';
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        bodyHtml += '<p class="no-indent">• ' + trimmed.substring(2) + '</p>';
      } else {
        bodyHtml += '<p>' + trimmed + '</p>';
      }
    });
    if (inTable) bodyHtml += '</table>';

    const html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Коммерческое предложение</title><style>" + style + "</style></head><body>" + bodyHtml + "</body></html>";

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'КП_12M_' + power + 'kW.doc';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDoc = () => {
    const style = "@page { size: A4; margin: 2cm 3cm 2cm 2cm; } body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.15; } h2 { font-size: 13pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; color: #000; } table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; } td, th { border: 1px solid #000; padding: 4pt 8pt; } th { background: #e0e0e0; font-weight: bold; text-align: center; } @media print { body { margin: 0; } }";

    const lines = result.split('\n');
    let bodyHtml = '';
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) { bodyHtml += '<br>'; return; }
      if (trimmed.match(/^(КОММЕРЧЕСКОЕ|ТЕХНИЧЕСКОЕ|ТАБЛИЦА|СРОКИ|ГАРАНТИЯ|ИТОГО|КОНТАКТЫ|ИНФОРМАЦИЯ|ПРЕДЛОЖЕНИЕ)/i)) {
        bodyHtml += '<h2>' + trimmed + '</h2>';
      } else {
        bodyHtml += '<p style="margin: 0 0 6pt 0; text-indent: 1.25cm;">' + trimmed + '</p>';
      }
    });

    const html = '<html><head><meta charset="utf-8"><title>КП</title><style>' + style + '</style></head><body>' + bodyHtml + '</body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const loadKps = async () => {
    try {
      const res = await api.get("/calculator/kps");
      setSavedKps(res.data || []);
    } catch {}
  };

  useEffect(() => { loadKps(); }, []);

  const saveKp = async () => {
    setSaving(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const safePower = String(power);
      const fileName = "KP_12M_" + safePower + "kW_" + dateStr + ".doc";

      const style = "@page { size: A4; margin: 2cm 3cm 2cm 2cm; } body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.15; } h2 { font-size: 13pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; color: #000; } table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; } td, th { border: 1px solid #000; padding: 4pt 8pt; } th { background: #e0e0e0; font-weight: bold; text-align: center; }";

      const lines = result.split("\n");
      let bodyHtml = "";
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) { bodyHtml += "<br>"; return; }
        if (trimmed.match(/^(КОММЕРЧЕСКОЕ|ТЕХНИЧЕСКОЕ|ТАБЛИЦА|СРОКИ|ГАРАНТИЯ|ИТОГО|КОНТАКТЫ|ИНФОРМАЦИЯ|ПРЕДЛОЖЕНИЕ)/i)) {
          bodyHtml += "<h2>" + trimmed + "</h2>";
        } else {
          bodyHtml += "<p style='text-indent:1.25cm;margin:0 0 6pt 0;'>" + trimmed + "</p>";
        }
      });
      const docContent = "<html><head><meta charset='utf-8'><style>" + style + "</style></head><body>" + bodyHtml + "</body></html>";

      await api.post("/calculator/save-kp", { fileName, content: docContent });
      loadKps();
    } catch (e) {
      // fallback: save anyway
    }
    setSaving(false);
  };

  const deleteKp = async (fileName: string) => {
    try {
      await api.delete("/calculator/kp/" + encodeURIComponent(fileName));
      setSavedKps(prev => prev.filter(k => k.fileName !== fileName));
    } catch {}
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Калькулятор КП</h1>
            <p className="text-sm text-gray-400">AI-генератор коммерческих предложений • панели {PANEL_POWER}W</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Power selector — always custom input */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-500" /> Мощность СЭС
            </h3>
            
            {/* Custom power input — big and prominent */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => adjustPower(-5)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={customPower}
                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setCustomPower(v); saveForm(v, form); }}
                  className="w-full py-3 text-center text-3xl font-bold text-gray-800 bg-amber-50 border-2 border-amber-200 rounded-2xl outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-lg">кВт</span>
              </div>
              <button onClick={() => adjustPower(5)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-calculated info — inline compact */}
            <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-400 bg-amber-50/30 rounded-lg px-3 py-2">
              <span>Панелей 400W: <b className="text-gray-700">{panelCount} шт</b></span>
              <span className="text-gray-300">|</span>
              <span>Стоимость: <b className="text-gray-700">{(panelCount * PANEL_PRICE).toLocaleString()} ₽</b></span>
              <span className="text-gray-300">|</span>
              <span>Бюджет: <b className="text-amber-600">{estimatedMin.toLocaleString()} – {estimatedMax.toLocaleString()} ₽</b></span>
            </div>
          </div>

          {/* Equipment + Roof */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <select value={form.equipment} onChange={e => updateForm({ equipment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 bg-gray-50">
                  {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <select value={form.roofType} onChange={e => updateForm({ roofType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 bg-gray-50">
                  {ROOF_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Client info — compact single row */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              <input value={form.clientName} onChange={e => updateForm({ clientName: e.target.value })}
                placeholder="Имя / Компания" className="px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20" />
              <input value={form.clientPhone} onChange={e => updateForm({ clientPhone: e.target.value })}
                placeholder="Телефон" className="px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20" />
              <input value={form.clientAddress} onChange={e => updateForm({ clientAddress: e.target.value })}
                placeholder="Адрес" className="px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20" />
            </div>
          </div>

          {/* Generate button */}
          <button onClick={generateProposal} disabled={generating}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl text-sm font-bold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? "Генерирую КП..." : "Сгенерировать КП"}
          </button>
        </div>

        {/* RIGHT: Result */}
        <div className="lg:col-span-3" ref={resultRef}>
          {!result && !generating ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-12 border border-amber-100 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-amber-100 flex items-center justify-center shadow-sm">
                <FileText className="w-10 h-10 text-amber-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Коммерческое предложение</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Настройте мощность и заполните данные клиента. AI рассчитает КП на основе панелей {PANEL_POWER}W.
              </p>
              
            </div>
          ) : generating ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
              <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">AI анализирует шаблоны и формирует предложение...</p>
              <p className="text-gray-400 text-xs mt-1">Это займёт несколько секунд</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700">КП — {power} кВт</span>
                </div>
                <button onClick={copyToClipboard}
                  className={`p-1.5 rounded-lg transition-colors ${copied ? "bg-green-100 text-green-600" : "hover:bg-white text-gray-400 hover:text-gray-600"}`}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-6">
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {result}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
                <button onClick={generateProposal} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                  <Sparkles className="w-3 h-3" /> Новое КП
                </button>
                <button onClick={downloadDoc} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  <Download className="w-3 h-3" /> Скачать .doc
                </button>
                <button onClick={printDoc} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 bg-white rounded-lg hover:bg-gray-100 transition-colors text-gray-600 shadow-sm">
                  <Printer className="w-3 h-3" /> Печать
                </button>
                <button onClick={saveKp} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50">
                  <Save className="w-3 h-3" /> {saving ? "Сохраняю..." : "Сохранить"}
                </button>
                <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Скопировано" : "Копировать"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved KPs */}
      {savedKps.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" /> Сохранённые КП
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {savedKps.map(kp => (
              <div key={kp.fileName} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-amber-200 transition-colors group">
                <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{kp.fileName}</p>
                  <p className="text-[10px] text-gray-400">{new Date(kp.createdAt).toLocaleDateString("ru-RU")} • {kp.size ? Math.round(kp.size/1024) : "?"} KB</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setSelectedKp(kp)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Открыть">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <a href={kp.downloadUrl} target="_blank" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Скачать">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => deleteKp(kp.fileName)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Удалить">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedKp && (
        <FilePreviewModal file={selectedKp} onClose={() => setSelectedKp(null)} token={localStorage.getItem("token")} />
      )}
    </div>
  );
}
