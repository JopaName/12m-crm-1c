import React, { useState, useEffect, useCallback } from "react";
import { dealActionsAPI } from "../api";
import {
  MessageSquare, Paperclip, User, Clock, Plus, Send, CheckCircle,
  Activity, Edit3, Target, X, ChevronDown, ChevronUp
} from "lucide-react";

interface ActionsWorkflowProps {
  dealId: string;
}

const STEP_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PLAN:     { label: "План",       color: "text-amber-600", bg: "bg-amber-50" },
  COMPLETED:{ label: "Готово",     color: "text-emerald-600",bg: "bg-emerald-50" },
  CANCELLED:{ label: "Отменено",  color: "text-gray-400",   bg: "bg-gray-50" },
};

const ACTION_COLORS: Record<string, string> = {
  AUTO: "text-blue-500",
  MANUAL: "text-violet-500",
  CALL: "text-emerald-500",
  MEETING: "text-amber-500",
  NOTE: "text-gray-400",
};

const ACTION_DOT_BG: Record<string, string> = {
  AUTO: "bg-blue-100 border-blue-300",
  MANUAL: "bg-violet-100 border-violet-300",
  CALL: "bg-emerald-100 border-emerald-300",
  MEETING: "bg-amber-100 border-amber-300",
  NOTE: "bg-gray-100 border-gray-300",
};

const ACTION_ICON_BG: Record<string, string> = {
  AUTO: "bg-blue-100",
  MANUAL: "bg-violet-100",
};

export function ActionsWorkflow({ dealId }: ActionsWorkflowProps) {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [msgText, setMsgText] = useState("");

  const load = useCallback(async () => {
    if (!dealId) return;
    try {
      setLoading(true);
      const res = await dealActionsAPI.getByDeal(dealId);
      setActions(Array.isArray(res) ? res.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ) : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [dealId]);

  useEffect(() => { if (dealId) load(); }, [dealId, load]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await dealActionsAPI.create(dealId, {
        type: "MANUAL", title: newTitle,
        description: newDescription || undefined,
        status: "PLAN",
      });
      setNewTitle(""); setNewDescription(""); setShowAddForm(false);
      load();
    } catch { /* ignore */ }
  };

  const handleComplete = async (id: string) => {
    try { await dealActionsAPI.update(dealId, id, { status: "COMPLETED" }); load(); }
    catch { /* ignore */ }
  };

  const loadMessages = async (actionId: string) => {
    if (messages[actionId]) return;
    try {
      const res = await dealActionsAPI.getMessages(dealId, actionId);
      setMessages(p => ({ ...p, [actionId]: Array.isArray(res) ? res : [] }));
    } catch { /* ignore */ }
  };

  const handleSendMsg = async (actionId: string) => {
    if (!msgText.trim()) return;
    try {
      await dealActionsAPI.sendMessage(dealId, actionId, { content: msgText });
      setMsgText("");
      const res = await dealActionsAPI.getMessages(dealId, actionId);
      setMessages(p => ({ ...p, [actionId]: Array.isArray(res) ? res : [] }));
    } catch { /* ignore */ }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadMessages(id);
  };

  const fmtRelative = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "только что";
    if (mins < 60) return mins + " мин. назад";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + " ч. назад";
    const days = Math.floor(hours / 24);
    if (days < 7) return days + " дн. назад";

    return date.toLocaleDateString("ru-RU", {
      day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const fmtDateGroup = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return "Сегодня";
    if (days === 1) return "Вчера";
    if (days < 7) return days + " дн. назад";

    return date.toLocaleDateString("ru-RU", {
      day: "numeric", month: "long",
    });
  };

  const renderAutoDesc = (desc: string) =>
    desc.length > 60 ? desc.substring(0, 60) + "..." : desc;

  // Group by date
  const grouped = actions.reduce<Record<string, any[]>>((acc, a) => {
    const key = new Date(a.createdAt).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Активность
          </h3>
          {!loading && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
              {actions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded-lg transition-all"
        >
          {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAddForm ? "Отмена" : "Добавить"}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-4 bg-white border border-gray-200 rounded-xl p-3.5 space-y-2.5 shadow-sm">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Название действия"
            className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/30 transition-all placeholder:text-gray-300"
            autoFocus
          />
          <textarea
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/30 transition-all placeholder:text-gray-300 resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="px-3.5 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Создать
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewTitle(""); setNewDescription(""); }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && actions.length === 0 && (
        <div className="flex flex-col items-center py-10 text-gray-300">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-xs text-gray-400 mb-3">Нет действий</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            + Добавить первое действие
          </button>
        </div>
      )}

      {/* Timeline */}
      {!loading && actions.length > 0 && (
        <div className="relative space-y-3">
          {Object.entries(grouped).map(([dateKey, items]) => (
            <div key={dateKey}>
              {/* Date label */}
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em]">
                  {fmtDateGroup(items[0].createdAt)}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>

              <div className="space-y-1.5">
                {items.map((action: any) => {
                  const isAuto = action.type === "AUTO";
                  const isCompleted = action.status === "COMPLETED";
                  const isPlan = action.status === "PLAN";
                  const statusMeta = STEP_STATUS_LABELS[action.status] || STEP_STATUS_LABELS.PLAN;
                  const iconColor = ACTION_COLORS[action.type] || "text-gray-400";
                  const dotBg = ACTION_DOT_BG[action.type] || "bg-gray-100 border-gray-300";
                  const iconBg = ACTION_ICON_BG[action.type] || "bg-gray-100";
                  const expanded = expandedId === action.id;

                  return (
                    <div key={action.id} className="relative pl-8">
                      {/* Vertical line connector */}
                      <div className="absolute left-[10px] top-[14px] bottom-[-8px] w-px bg-gradient-to-b from-gray-200 to-gray-100 last:hidden" />

                      {/* Timeline dot */}
                      <div className={`absolute left-[6px] top-[10px] w-[9px] h-[9px] rounded-full border-2 z-10 ${dotBg}`}>
                        {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mx-auto mt-[1px]" />}
                      </div>

                      {/* Body */}
                      {isAuto ? (
                        /* Auto: subtle system message style */
                        <div className="py-1.5">
                          <div className="flex items-start gap-2">
                            <div className="shrink-0 w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                              <Activity className="w-3 h-3 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                {action.createdBy && (
                                  <button
                                    onClick={e => { e.stopPropagation(); window.location.href = "/users?id=" + action.createdBy.id; }}
                                    className="text-[11px] font-semibold text-gray-700 hover:text-primary-600"
                                  >
                                    {action.createdBy.firstName} {action.createdBy.lastName}
                                  </button>
                                )}
                                <span className="text-[11px] text-gray-500">
                                  {action.title === "Создание лида" ? "создал(а) лид" :
                                   action.title === "Редактирование лида" ? "внёс(ла) изменения" :
                                   action.title.toLowerCase()}
                                </span>
                              </div>
                              {action.description && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{renderAutoDesc(action.description)}</p>
                              )}
                              <span className="text-[9px] text-gray-300 mt-0.5 block">
                                {fmtRelative(action.completedAt || action.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Manual action: card style */
                        <div
                          className={`rounded-xl border transition-all ${
                            expanded
                              ? "bg-white border-gray-200 shadow-sm"
                              : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-pointer"
                          }`}
                          onClick={() => toggleExpand(action.id)}
                        >
                          <div className="px-3 py-2.5">
                            <div className="flex items-start gap-2.5">
                              {/* Icon */}
                              <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${statusMeta.bg}`}>
                                <Edit3 className={`w-3.5 h-3.5 ${iconColor}`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {action.createdBy && (
                                    <button
                                      onClick={e => { e.stopPropagation(); window.location.href = "/users?id=" + action.createdBy.id; }}
                                      className="text-xs font-semibold text-gray-800 hover:text-primary-600 hover:underline"
                                    >
                                      {action.createdBy.firstName} {action.createdBy.lastName}
                                    </button>
                                  )}
                                  <span className="text-xs text-gray-700 font-medium">{action.title}</span>
                                </div>

                                {action.description && (
                                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                                    {action.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${statusMeta.color} ${statusMeta.bg}`}>
                                    {isCompleted && <CheckCircle className="w-2.5 h-2.5" />}
                                    {statusMeta.label}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {fmtRelative(action.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {/* Right actions */}
                              <div className="shrink-0 flex items-center gap-0.5">
                                {isPlan && (
                                  <button
                                    onClick={e => { e.stopPropagation(); handleComplete(action.id); }}
                                    className="p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Завершить"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={e => { e.stopPropagation(); toggleExpand(action.id); }}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    expanded ? "text-gray-500 bg-gray-100" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                  }`}
                                >
                                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded comments */}
                          {expanded && (
                            <div className="px-3 pb-3">
                              <div className="border-t border-gray-100 pt-2.5 space-y-2">
                                {(messages[action.id] || []).length > 0 && (
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {(messages[action.id] || []).map((msg: any, mi: number) => (
                                      <div key={msg.id || mi} className="flex items-start gap-2 py-1">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                                          <User className="w-3 h-3 text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-baseline gap-1.5">
                                            <span className="text-[11px] font-semibold text-gray-700">
                                              {msg.sender
                                                ? [msg.sender.firstName, msg.sender.lastName].filter(Boolean).join(" ")
                                                : "Пользователь"}
                                            </span>
                                            <span className="text-[9px] text-gray-400">{fmtRelative(msg.createdAt)}</span>
                                          </div>
                                          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{msg.content}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex gap-1.5 pt-1">
                                  <input
                                    value={msgText}
                                    onChange={e => setMsgText(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMsg(action.id);
                                      }
                                    }}
                                    placeholder="Комментарий..."
                                    className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-gray-300"
                                  />
                                  <button
                                    onClick={() => handleSendMsg(action.id)}
                                    disabled={!msgText.trim()}
                                    className="p-1.5 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
