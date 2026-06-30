import { useState, useRef } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Zap, Sun, Home, User, Phone, Mail, FileText, Download, Calculator, ArrowRight, RefreshCw, Check, Copy, ChevronDown } from "lucide-react";

const POWER_OPTIONS = [5, 10, 15, 20, 30, 40, 50, 65, 100];
const EQUIPMENT_TYPES = [
  "Солнечные панели", "Инвертор", "АКБ", "Крепления", "Кабель",
  "СЭС под ключ", "Гибридная СЭС", "Сетевая СЭС", "Автономная СЭС",
];
const ROOF_TYPES = ["Скатная", "Плоская", "Металлочерепица", "Мягкая кровля", "Фальцевая"];

export default function CalculatorPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    power: 30,
    equipment: "СЭС под ключ",
    roofType: "Скатная",
    clientName: "",
    clientPhone: "",
    clientAddress: "",
    additionalNotes: "",
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const generateProposal = async () => {
    setGenerating(true); setResult("");
    try {
      const prompt = `Ты — эксперт по солнечной энергетике компании 12M. Создай КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ на основе данных:

Мощность: ${form.power} кВт
Тип оборудования: ${form.equipment}
Тип кровли: ${form.roofType}
Клиент: ${form.clientName || "Частное лицо"}
Адрес: ${form.clientAddress || "будет уточнён"}
Телефон: ${form.clientPhone || "не указан"}
Заметки: ${form.additionalNotes || "нет"}

ФОРМАТ КП (строго следуй структуре):
1. ЗАГОЛОВОК: "Коммерческое предложение №__ от __"
2. ИНФОРМАЦИЯ О КЛИЕНТЕ: имя, адрес, телефон
3. ТЕХНИЧЕСКОЕ РЕШЕНИЕ: опиши состав оборудования для солнечной электростанции ${form.power} кВт
4. ТАБЛИЦА ОБОРУДОВАНИЯ (в столбик с ценами, примерные):
   - Солнечные панели (количество и модель)
   - Инвертор
   - Крепления для ${form.roofType} кровли
   - Кабель и коммутация
   - Монтажные работы
   - Пусконаладка
5. СРОКИ: укажи примерные сроки поставки и монтажа
6. ГАРАНТИЯ: стандартные условия
7. ИТОГО: примерная стоимость (реалистичная для ${form.power} кВт)
8. КОНТАКТЫ: 12M Engineering, телефон, email

Оформи в деловом стиле. Цены в рублях, реалистичные. Объём: 1-2 страницы.

ВАЖНО: Это творческая задача генерации текста. Не используй инструменты CRM. Просто напиши готовое КП текстом.`;

      const res = await api.post("/ai/coordinator", { content: prompt, skipTools: true, maxTokens: 3000 });
      setResult(res.data?.response || "Не удалось сгенерировать. Попробуйте снова.");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e) {
      setResult("Ошибка генерации. Проверьте подключение.");
    }
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <p className="text-sm text-gray-400">AI-генератор коммерческих предложений на основе реальных проектов</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Power selector */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" /> Мощность СЭС
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {POWER_OPTIONS.map(kw => (
                <button key={kw} onClick={() => setForm({...form, power: kw})}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    form.power === kw
                      ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}>
                  {kw} кВт
                </button>
              ))}
              <input type="number" placeholder="Свой" value={POWER_OPTIONS.includes(form.power) ? "" : form.power}
                onChange={e => setForm({...form, power: +e.target.value || 30})}
                className="py-2.5 rounded-xl text-sm text-center bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-amber-500/20" />
            </div>
          </div>

          {/* Equipment + Roof */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-amber-500" /> Параметры
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">Тип оборудования</label>
                <select value={form.equipment} onChange={e => setForm({...form, equipment: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20">
                  {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">Тип кровли</label>
                <select value={form.roofType} onChange={e => setForm({...form, roofType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20">
                  {ROOF_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-amber-500" /> Данные клиента
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})}
                  placeholder="Имя или организация" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input value={form.clientPhone} onChange={e => setForm({...form, clientPhone: e.target.value})}
                  placeholder="Телефон" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
              <div className="relative">
                <Home className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input value={form.clientAddress} onChange={e => setForm({...form, clientAddress: e.target.value})}
                  placeholder="Адрес объекта" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button onClick={generateProposal} disabled={generating}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl text-sm font-bold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
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
                Заполните параметры слева и нажмите «Сгенерировать». AI создаст профессиональное КП на основе реальных проектов и шаблонов компании.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[{ label: "5 кВт", icon: "🏠" }, { label: "30 кВт", icon: "🏭" }, { label: "100 кВт", icon: "🏢" }].map((t, i) => (
                  <button key={i} onClick={() => { setForm({...form, power: parseInt(t.label)}); generateProposal(); }}
                    className="px-4 py-2 bg-white border border-amber-200 rounded-xl text-sm text-amber-700 hover:bg-amber-50 transition-colors">
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
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
                  <span className="text-sm font-semibold text-gray-700">Коммерческое предложение</span>
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
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
                <button onClick={generateProposal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                  <Sparkles className="w-3 h-3" /> Перегенерировать
                </button>
                <button onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Скопировано" : "Копировать"}
                </button>
                <div className="flex-1" />
                <span className="text-[10px] text-gray-400">Сгенерировано AI на основе шаблонов компании</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
