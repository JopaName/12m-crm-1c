import React, { useState, useEffect, useCallback } from "react";
import { dealActionsAPI } from "../api";
import { MessageSquare, Paperclip, User, Clock, Plus, Send, CheckCircle } from "lucide-react";

interface ActionsWorkflowProps {
  dealId: string;
}

export function ActionsWorkflow({ dealId }: ActionsWorkflowProps) {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [newMessage, setNewMessage] = useState("");

  const loadActions = useCallback(async () => {
    if (!dealId) return;
    try {
      setLoading(true);
      const res = await dealActionsAPI.getByDeal(dealId);
      setActions(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load actions:", e);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (dealId) loadActions();
  }, [dealId, loadActions]);

  const handleAddAction = async () => {
    if (!newTitle.trim()) return;
    try {
      await dealActionsAPI.create(dealId, {
        type: "MANUAL",
        title: newTitle,
        description: newDescription || undefined,
        status: "PLAN",
      });
      setNewTitle("");
      setNewDescription("");
      setAdding(false);
      loadActions();
    } catch (e) {
      console.error("Failed to create action:", e);
    }
  };

  const handleComplete = async (actionId: string) => {
    try {
      await dealActionsAPI.update(dealId, actionId, { status: "COMPLETED" });
      loadActions();
    } catch (e) {
      console.error("Failed to complete action:", e);
    }
  };

  const loadMessages = async (actionId: string) => {
    if (messages[actionId]) return;
    try {
      const res = await dealActionsAPI.getMessages(dealId, actionId);
      setMessages((prev) => ({ ...prev, [actionId]: Array.isArray(res) ? res : [] }));
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  };

  const handleSendMessage = async (actionId: string) => {
    if (!newMessage.trim()) return;
    try {
      await dealActionsAPI.sendMessage(dealId, actionId, { content: newMessage });
      setNewMessage("");
      const res = await dealActionsAPI.getMessages(dealId, actionId);
      setMessages((prev) => ({ ...prev, [actionId]: Array.isArray(res) ? res : [] }));
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Рабочий процесс</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-primary-600 hover:bg-primary-50/50 rounded-lg transition-all border border-gray-200 border-dashed hover:border-primary-300 bg-white/60 hover:bg-white"
        >
          <Plus className="w-3 h-3" />
          Добавить
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2 shadow-sm">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Что нужно сделать?"
            className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddAction}
              disabled={!newTitle.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Добавить
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle(""); setNewDescription(""); }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-300">
          <Clock className="w-8 h-8 mb-2" />
          <p className="text-xs">Нет действий</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />

          <div className="space-y-0">
            {actions.map((action, idx) => {
              const isAuto = action.type === "AUTO";
              const isCompleted = action.status === "COMPLETED";
              const isExpanded = expandedAction === action.id;

              return (
                <div key={action.id || idx} className="relative pl-8 pb-3">
                  {/* Timeline dot */}
                  <div
                    className={
                      "absolute left-[5px] top-[5px] w-[13px] h-[13px] rounded-full border-2 flex items-center justify-center " +
                      (isAuto
                        ? "border-blue-300 bg-blue-50"
                        : isCompleted
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-300 bg-white")
                    }
                  >
                    {isCompleted && (
                      <CheckCircle className="w-[10px] h-[10px] text-emerald-500" />
                    )}
                  </div>

                  <div
                    className={
                      "rounded-xl p-3 border transition-all " +
                      (isAuto
                        ? "bg-blue-50/30 border-blue-100"
                        : isExpanded
                        ? "bg-white border-gray-200 shadow-sm"
                        : "bg-white border-gray-100 hover:border-gray-200 cursor-pointer")
                    }
                    onClick={() => {
                      if (!isAuto) {
                        if (isExpanded) {
                          setExpandedAction(null);
                        } else {
                          setExpandedAction(action.id);
                          loadMessages(action.id);
                        }
                      }
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {action.createdBy && (
                            <a
                              href={"/users?id=" + action.createdBy.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                // navigate to user profile - use window.location for now
                                window.location.href = "/users?id=" + action.createdBy.id;
                              }}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              {action.createdBy.firstName} {action.createdBy.lastName}
                            </a>
                          )}
                          <span className="text-xs text-gray-700 font-medium">
                            {isAuto ? (
                              action.title === "Создание лида" ? "создал лида" :
                              action.title === "Редактирование лида" ? "редактировал лида" :
                              action.title === "Конвертация в сделку" ? "конвертировал в сделку" :
                              action.title.toLowerCase()
                            ) : (
                              action.title
                            )}
                          </span>
                          {isAuto && action.description && (
                            <span className="text-xs text-gray-500">
                              — {action.description}
                            </span>
                          )}
                        </div>
                        {!isAuto && action.description && (
                          <p className="text-[11px] text-gray-500 mt-1">{action.description}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {fmtDate(isAuto ? action.completedAt || action.createdAt : action.createdAt)}
                        </p>
                      </div>

                      {/* Complete button for manual actions */}
                      {!isAuto && !isCompleted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(action.id);
                          }}
                          className="shrink-0 p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Завершить"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Expanded: messages and files */}
                    {!isAuto && isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {/* Messages */}
                        <div className="space-y-1.5">
                          {(messages[action.id] || []).map((msg: any, mi: number) => (
                            <div key={msg.id || mi} className="flex items-start gap-2 text-xs">
                              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                                <User className="w-3 h-3 text-gray-400" />
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  {msg.sender?.firstName || msg.sender?.lastName
                                    ? (msg.sender.firstName || "") + " " + (msg.sender.lastName || "")
                                    : "Пользователь"}
                                </span>
                                <span className="text-gray-400 ml-1">{fmtDate(msg.createdAt)}</span>
                                <p className="text-gray-600 mt-0.5">{msg.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Message input */}
                        <div className="flex gap-1.5">
                          <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(action.id);
                              }
                            }}
                            placeholder="Написать комментарий..."
                            className="flex-1 px-2.5 py-1.5 bg-gray-50 border-0 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/30"
                          />
                          <button
                            onClick={() => handleSendMessage(action.id)}
                            disabled={!newMessage.trim()}
                            className="p-1.5 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
