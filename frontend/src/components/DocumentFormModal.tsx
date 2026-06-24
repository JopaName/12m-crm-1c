import React, { useState } from "react";
import { X, RefreshCw, Download, Printer, FileText, Edit3, Eye, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface DocFormProps {
  dealId: string;
  template: string;
  label: string;
  clientName: string;
  clientInn: string;
  clientPhone: string;
  clientEmail: string;
  dealNumber: string;
  amount: number;
  onClose: () => void;
}

const TEMPLATE_FIELDS: Record<string, Array<{key: string; label: string; type: string; required: boolean}>> = {
  kp: [
    { key: "clientName", label: "Клиент", type: "text", required: true },
    { key: "clientInn", label: "ИНН клиента", type: "text", required: true },
    { key: "clientPhone", label: "Телефон", type: "text", required: false },
    { key: "clientEmail", label: "Email", type: "text", required: false },
    { key: "date", label: "Дата", type: "text", required: true },
    { key: "amount", label: "Сумма (₽)", type: "text", required: false },
  ],
  dogovor: [
    { key: "clientName", label: "Покупатель", type: "text", required: true },
    { key: "clientInn", label: "ИНН покупателя", type: "text", required: true },
    { key: "clientPhone", label: "Телефон", type: "text", required: false },
    { key: "clientEmail", label: "Email", type: "text", required: false },
    { key: "dealNumber", label: "Номер договора", type: "text", required: true },
    { key: "date", label: "Дата договора", type: "text", required: true },
    { key: "amount", label: "Сумма договора (₽)", type: "text", required: true },
  ],
  schet: [
    { key: "clientName", label: "Плательщик", type: "text", required: true },
    { key: "clientInn", label: "ИНН", type: "text", required: true },
    { key: "date", label: "Дата счёта", type: "text", required: true },
    { key: "amount", label: "Сумма (₽)", type: "text", required: true },
  ],
  commercial_offer: [
    { key: "clientName", label: "Клиент", type: "text", required: true },
    { key: "clientInn", label: "ИНН", type: "text", required: true },
    { key: "clientPhone", label: "Телефон", type: "text", required: false },
    { key: "clientEmail", label: "Email", type: "text", required: false },
    { key: "date", label: "Дата", type: "text", required: true },
    { key: "amount", label: "Сумма (₽)", type: "text", required: false },
  ],
  default: [
    { key: "clientName", label: "Клиент", type: "text", required: true },
    { key: "clientInn", label: "ИНН", type: "text", required: true },
    { key: "date", label: "Дата", type: "text", required: true },
  ],
};

export default function DocumentFormModal({
  dealId, template, label, clientName, clientInn, clientPhone, clientEmail,
  dealNumber, amount, onClose
}: DocFormProps) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientName, clientInn, clientPhone, clientEmail, dealNumber,
    date: new Date().toLocaleDateString("ru-RU"),
    amount: (amount || 0).toLocaleString(),
  });

  const fields = TEMPLATE_FIELDS[template] || TEMPLATE_FIELDS.default;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      fields.forEach(f => { if ((form as any)[f.key]) params.set(f.key, (form as any)[f.key]); });
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/deals/${dealId}/generate/${template}?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const text = await resp.text();
      setHtml(text);
      setStep("preview");
    } catch { setHtml("<p>Ошибка генерации</p>"); }
    setLoading(false);
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${template}-${dealNumber}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0 bg-gradient-to-r from-primary-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">{label}</h3>
              <p className="text-[11px] text-gray-500">
                {step === "form" ? "Шаг 1: заполните данные" : "Шаг 2: предпросмотр"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === "form" ? (
              <button onClick={handleGenerate} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-sm">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? "Генерация..." : "Сгенерировать"}
              </button>
            ) : (
              <>
                <button onClick={() => setStep("form")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />Назад к форме
                </button>
                <button onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                  <Download className="w-3.5 h-3.5" />Скачать
                </button>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors">
                  <Printer className="w-3.5 h-3.5" />Печать
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {step === "form" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-lg mx-auto space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-blue-700 mb-1">{label}</p>
                <p className="text-xs text-blue-600">Сделка: {dealNumber} · Сумма: {(amount || 0).toLocaleString()} ₽</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(f => (
                  <div key={f.key} className={f.key === "clientName" || f.key === "amount" ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={f.type}
                      value={(form as any)[f.key] || ""}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white"
                      placeholder={f.label}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleGenerate} disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-sm">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {loading ? "Генерация..." : "Сгенерировать документ"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <iframe srcDoc={html} className="w-full h-full border-0" title="Preview" sandbox="allow-same-origin" />
          </div>
        )}
      </div>
    </div>
  );
}