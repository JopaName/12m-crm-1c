import React, { useState, useEffect } from "react";
import { X, RefreshCw, Download, Printer, FileText, Edit3, Eye } from "lucide-react";

interface DocPreviewProps {
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

export default function DocumentPreviewModal({
  dealId, template, label, clientName, clientInn, clientPhone, clientEmail,
  dealNumber, amount, onClose
}: DocPreviewProps) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    clientName, clientInn, clientPhone, clientEmail, dealNumber,
    date: new Date().toLocaleDateString("ru-RU"),
    amount: (amount || 0).toLocaleString(),
  });

  const fetchDocument = async (useFormData = false) => {
    setLoading(true);
    try {
      const params = useFormData
        ? `?clientName=${encodeURIComponent(form.clientName)}&clientInn=${encodeURIComponent(form.clientInn)}&clientPhone=${encodeURIComponent(form.clientPhone)}&clientEmail=${encodeURIComponent(form.clientEmail)}`
        : "";
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/deals/${dealId}/generate/${template}${params}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const text = await resp.text();
      setHtml(text);
    } catch { setHtml("<p>Error loading document</p>"); }
    setLoading(false);
  };

  useEffect(() => { fetchDocument(); }, [dealId, template]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
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
              <p className="text-[11px] text-gray-500">Сделка {dealNumber} · предпросмотр</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditMode(!editMode)}
              className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " + (editMode ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {editMode ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              {editMode ? "Предпросмотр" : "Править данные"}
            </button>
            <button onClick={() => fetchDocument(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />Обновить
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              <Download className="w-3.5 h-3.5" />Скачать
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors">
              <Printer className="w-3.5 h-3.5" />Печать
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Edit panel */}
        {editMode && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { k: "clientName", l: "Клиент" },
                { k: "clientInn", l: "ИНН" },
                { k: "clientPhone", l: "Телефон" },
                { k: "clientEmail", l: "Email" },
                { k: "dealNumber", l: "Номер сделки" },
                { k: "date", l: "Дата" },
                { k: "amount", l: "Сумма" },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{f.l}</label>
                  <input
                    value={(form as any)[f.k]}
                    onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Измените данные и нажмите «Обновить» для перегенерации документа</p>
          </div>
        )}

        {/* Document preview */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <iframe
              srcDoc={html}
              className="w-full h-full border-0"
              title="Document preview"
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </div>
    </div>
  );
}