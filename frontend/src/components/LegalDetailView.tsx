import React from "react";
import { ArrowLeft, FileText, Calendar, User, Check, X, Shield } from "lucide-react";

function DetailView({
  doc, onBack, onStatusChange, commentText, onCommentChange, onCommentSend, currentUser,
}: {
  doc: any;
  onBack: () => void;
  onStatusChange: (status: string) => void;
  commentText: string;
  onCommentChange: (v: string) => void;
  onCommentSend: () => void;
  currentUser: any;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
        {"\u2190"} Назад к списку
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{doc.documentType}</h2>
              <p className="text-sm text-gray-400">{DOC_TYPE_LABELS[doc.documentType] || ""}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status as DocStatus] || "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABELS[doc.status as DocStatus] || doc.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Номер:</span>
              <span className="ml-2 text-gray-800 font-medium">{doc.documentNumber || "-"}</span>
            </div>
            <div>
              <span className="text-gray-400">Дата:</span>
              <span className="ml-2 text-gray-800">{formatDate(doc.documentDate || doc.createdAt)}</span>
            </div>
            <div>
              <span className="text-gray-400">Клиент:</span>
              <span className="ml-2 text-gray-800">{doc.client?.name || doc.deal?.client?.name || "-"}</span>
            </div>
            <div>
              <span className="text-gray-400">Сделка:</span>
              <span className="ml-2 text-gray-800">{doc.deal?.dealNumber || "-"}</span>
            </div>
            <div>
              <span className="text-gray-400">Сумма:</span>
              <span className="ml-2 text-gray-800 font-semibold">{doc.amount ? `${doc.amount.toLocaleString()} \u20BD` : "-"}</span>
            </div>
            <div>
              <span className="text-gray-400">Версия:</span>
              <span className="ml-2 text-gray-800">v{doc.versionNumber}</span>
            </div>
            <div>
              <span className="text-gray-400">Ответственный:</span>
              <span className="ml-2 text-gray-800">{doc.responsibleLawyer ? `${doc.responsibleLawyer.firstName} ${doc.responsibleLawyer.lastName}` : "-"}</span>
            </div>
            <div>
              <span className="text-gray-400">Подписание:</span>
              <span className="ml-2 text-gray-800">{doc.signatureMethod || "-"}</span>
            </div>
          </div>

          {doc.description && (
            <div>
              <span className="text-sm text-gray-400">Описание:</span>
              <p className="text-sm text-gray-700 mt-1">{doc.description}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {doc.status === "Draft" && (
              <button onClick={() => onStatusChange("Approved")} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                {"\u2713"} Утвердить
              </button>
            )}
            {doc.status === "Approved" && (
              <button onClick={() => onStatusChange("Sent")} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {"\u{1F4E8}"} Отправить
              </button>
            )}
            {doc.status === "Sent" && (
              <button onClick={() => onStatusChange("Signed")} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                {"\u{1F4CB}"} Подписать
              </button>
            )}
          </div>
        </div>

        {/* Right: files + comments */}
        <div className="space-y-4">
          {/* Files */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Файлы</h3>
            {doc.fileDraft ? (
              <a href={doc.fileDraft} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                {"\u{1F4C4}"} Черновик (v{doc.versionNumber - 1})
              </a>
            ) : <span className="text-xs text-gray-400">Нет файлов</span>}
            {doc.fileSigned && (
              <a href={doc.fileSigned} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-600 hover:underline mt-1">
                {"\u{1F4C4}"} Подписанный
              </a>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Комментарии</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
              {(doc.comments || []).length === 0 && (
                <p className="text-xs text-gray-400">Нет комментариев</p>
              )}
              {(doc.comments || []).map((c: any) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-400">
                    {c.user?.firstName} {c.user?.lastName}
                  </div>
                  <div className="text-sm text-gray-700">{c.content}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Комментарий..."
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={onCommentSend}
                disabled={!commentText.trim()}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                {"\u2192"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailView;
