import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { legalAPI, dealsAPI, clientsAPI } from "../api";
import DetailView from "../components/LegalDetailView";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

type DocStatus = "Draft" | "Approved" | "Sent" | "Signed" | "Archived";

const STATUS_LABELS: Record<DocStatus, string> = {
  Draft: "Черновик",
  Approved: "Утверждён",
  Sent: "Отправлен",
  Signed: "Подписан",
  Archived: "Архив",
};

const STATUS_COLORS: Record<DocStatus, string> = {
  Draft: "bg-yellow-100 text-yellow-700",
  Approved: "bg-purple-100 text-purple-700",
  Sent: "bg-blue-100 text-blue-700",
  Signed: "bg-green-100 text-green-700",
  Archived: "bg-gray-100 text-gray-500",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  Contract_Sale: "Купли-продажи",
  Contract_Rental: "Аренды",
  Contract_Rental_Service: "Аренды + сервис",
  Contract_Installation_Client: "Монтажа (с клиентом)",
  Contract_Installation_Agent: "Монтажа (с агентом)",
  Contract_Supply: "Поставки",
  Invoice: "Счёт на оплату",
  InvoiceUFPS: "УПД",
  Invoice_Rental: "Счёт арендатору",
  Goods_Delivery_Note: "Товарная накладная",
  Materials_WriteOff: "Акт списания",
  Receipt_Note: "Приходная накладная",
  Act_Transfer: "Приёма-передачи",
  Act_Installation: "Монтажных работ",
  Act_Return: "Возврата из аренды",
  Act_Service: "Сервисных работ",
  Act_Defect: "О браке",
  Addendum_Price: "Изменение цены",
  Addendum_Terms: "Изменение сроков",
  Addendum_Rental: "Продление аренды",
  Specification: "Спецификация",
  Project_PDF: "Проект СЭС",
  Warranty_Certificate: "Гарантийный талон",
  Claim_Client: "Претензия клиента",
  Claim_Supplier: "Претензия поставщику",
  Claim_Installer: "Претензия монтажникам",
  Task_Order: "Наряд-заказ",
  Internal_Act: "Внутренний акт",
};

const TAB_ICONS: Record<string, string> = {
  Contract: "\u{1F4DC}",
  Invoice: "\u{1F4B0}",
  Act: "\u{1F4CB}",
  Addendum: "\u{1F4DD}",
  Claim: "\u26A0\uFE0F",
  Technical: "\u{1F4D1}",
  Internal: "\u{1F4C2}",
};

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
}

export default function LegalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Contract");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [form, setForm] = useState({
    documentType: "Contract_Sale",
    clientId: "",
    dealId: "",
    documentNumber: "",
    description: "",
    amount: "",
  });

  const { data: categories } = useQuery({
    queryKey: ["legal-categories"],
    queryFn: () => legalAPI.getCategories().then((r) => r.data),
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["legal", activeTab],
    queryFn: () => legalAPI.getAll(activeTab).then((r) => r.data),
  });

  const { data: docTypes } = useQuery({
    queryKey: ["legal-types", activeTab],
    queryFn: () => legalAPI.getTypes(activeTab).then((r) => r.data),
  });

  const { data: deals } = useQuery({
    queryKey: ["deals"],
    queryFn: () => dealsAPI.getAll().then((r) => r.data),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsAPI.getAll().then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ["legal-detail", selectedDoc],
    queryFn: () => (selectedDoc ? legalAPI.getById(selectedDoc).then((r) => r.data) : null),
    enabled: !!selectedDoc,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => legalAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal"] });
      toast.success("Документ создан");
      setShowCreate(false);
      setForm({ documentType: "Contract_Sale", clientId: "", dealId: "", documentNumber: "", description: "", amount: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка создания"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => legalAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal"] });
      queryClient.invalidateQueries({ queryKey: ["legal-detail"] });
      toast.success("Обновлено");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => legalAPI.addComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-detail"] });
      setCommentText("");
      toast.success("Комментарий добавлен");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { toast.error("Выберите клиента"); return; }
    createMutation.mutate(form);
  };

  const advanceStatus = (doc: any) => {
    const flow: DocStatus[] = ["Draft", "Approved", "Sent", "Signed"];
    const idx = flow.indexOf(doc.status as DocStatus);
    if (idx < flow.length - 1) {
      updateMutation.mutate({ id: doc.id, data: { status: flow[idx + 1] } });
    }
  };

  const currentCategory = categories?.find((c: any) => c.key === activeTab);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{"\u{1F4C4}"} Документы</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center gap-1"
        >
          <span>+</span> Новый документ
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {(categories || []).map((cat: any) => (
          <button
            key={cat.key}
            onClick={() => { setActiveTab(cat.key); setSelectedDoc(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === cat.key
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {TAB_ICONS[cat.key] || ""} {cat.label}
          </button>
        ))}
      </div>

      {/* Main content: table or detail */}
      {selectedDoc && detail ? (
        <DetailView
          doc={detail}
          onBack={() => setSelectedDoc(null)}
          onStatusChange={(status: string) => updateMutation.mutate({ id: detail.id, data: { status } })}
          commentText={commentText}
          onCommentChange={setCommentText}
          onCommentSend={() => commentMutation.mutate({ id: detail.id, content: commentText })}
          currentUser={user}
        />
      ) : (
        <>
          {/* Create modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
                <h2 className="text-lg font-semibold mb-4">Новый документ</h2>
                <form onSubmit={handleCreate} className="space-y-3">
                  <select
                    value={form.documentType}
                    onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {(docTypes || []).map((t: string) => (
                      <option key={t} value={t}>{t} — {DOC_TYPE_LABELS[t] || t}</option>
                    ))}
                  </select>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  >
                    <option value="">Выберите клиента</option>
                    {(clients || []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={form.dealId}
                    onChange={(e) => setForm({ ...form, dealId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Связать с лидом</option>
                    {(deals || []).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.dealNumber || d.id.slice(0, 8)}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Номер документа"
                      value={form.documentNumber}
                      onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      placeholder="Сумма"
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="Описание"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Создать</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Documents table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Номер</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Лид</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Версия</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Загрузка...</td></tr>
                ) : documents?.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Нет документов</td></tr>
                ) : (
                  documents?.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDoc(doc.id)}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">{doc.documentType}</div>
                        <div className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.documentType] || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doc.documentNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doc.client?.name || doc.deal?.client?.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doc.deal?.dealNumber || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatDate(doc.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status as DocStatus] || "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABELS[doc.status as DocStatus] || doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">v{doc.versionNumber}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {doc.status === "Draft" && (
                            <button onClick={() => advanceStatus(doc)} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                              {"\u2713"} Утвердить
                            </button>
                          )}
                          {doc.status === "Approved" && (
                            <button onClick={() => advanceStatus(doc)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                              {"\u2192"} Отправить
                            </button>
                          )}
                          {doc.status === "Sent" && (
                            <button onClick={() => advanceStatus(doc)} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                              {"\u{1F4CB}"} Подписать
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

