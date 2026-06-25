import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { notificationAPI } from "../api";
import { Bell, Check, X, ExternalLink, Settings } from "lucide-react";
import { cn } from "./cn";

const TYPE_ICONS: Record<string, string> = {
  deal_created: "\u{1F91D}",
  deal_status: "\u{1F504}",
  task_assigned: "\u{1F4CB}",
  task_due: "\u23F0",
  service_new: "\u{1F527}",
  installation_scheduled: "\u{1F3D7}",
  legal_approval: "\u{1F4C4}",
  legal_reject: "\u274C",
  referral_joined: "\u{1F389}",
  default: "\u{1F514}",
};

const TYPE_COLORS: Record<string, string> = {
  deal_created: "bg-blue-50 border-blue-200",
  deal_status: "bg-indigo-50 border-indigo-200",
  referral_joined: "bg-green-50 border-green-200",
  legal_approval: "bg-emerald-50 border-emerald-200",
  legal_reject: "bg-red-50 border-red-200",
  default: "bg-gray-50 border-gray-200",
};

const NOTIF_TYPES: { key: string; label: string; icon: string }[] = [
  { key: "deal_created", label: "Новая сделка", icon: "\u{1F91D}" },
  { key: "deal_status", label: "Смена статуса сделки", icon: "\u{1F504}" },
  { key: "task_assigned", label: "Назначена задача", icon: "\u{1F4CB}" },
  { key: "task_due", label: "Дедлайн задачи", icon: "\u23F0" },
  { key: "service_new", label: "Новое обращение", icon: "\u{1F527}" },
  { key: "installation_scheduled", label: "Назначен монтаж", icon: "\u{1F3D7}" },
  { key: "legal_approval", label: "Документ утверждён", icon: "\u{1F4C4}" },
  { key: "legal_reject", label: "Документ отклонён", icon: "\u274C" },
  { key: "referral_joined", label: "Новый реферал", icon: "\u{1F389}" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return mins + " мин.";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " ч.";
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: () => notificationAPI.getUnreadCount(),
    refetchInterval: 20000,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationAPI.getAll(),
    enabled: open,
  });

  const { data: prefsData } = useQuery({
    queryKey: ["notif-preferences"],
    queryFn: () => notificationAPI.getPreferences(),
  });

  const prefsMap: Record<string, boolean> = {};
  (prefsData?.preferences || []).forEach(function (p: any) { prefsMap[p.type] = p.enabled; });

  const togglePref = useMutation({
    mutationFn: function (data: { type: string; enabled: boolean }) { return notificationAPI.updatePreference(data.type, data.enabled); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["notif-preferences"] }); },
  });

  const markRead = useMutation({
    mutationFn: function (id: string) { return notificationAPI.markRead(id); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["notif-unread"] }); },
  });

  const markAllRead = useMutation({
    mutationFn: function () { return notificationAPI.markAllRead(); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["notif-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(function () {
    var handler = function (e: MouseEvent) { var target = e.target as Node; if (ref.current && !ref.current.contains(target) && panelRef.current && !panelRef.current.contains(target)) { setOpen(false); setShowPrefs(false); } };
    document.addEventListener("mousedown", handler);
    return function () { document.removeEventListener("mousedown", handler); };
  }, []);

  var handleClick = function (notif: any) {
    markRead.mutate(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  var notifications = notifData?.notifications || [];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={function () { if (!open && ref.current) { var r = ref.current.getBoundingClientRect(); setPanelStyle({ right: window.innerWidth - r.right + 16, top: r.bottom + 8 }); } setOpen(!open); setShowPrefs(false); }}
        className={cn(
          "relative p-2 rounded-xl transition-all duration-200",
          open ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        )}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[19px] h-[19px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && !showPrefs && createPortal(
        <div ref={panelRef} style={panelStyle} className="fixed w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-800">Уведомления</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={function () { markAllRead.mutate(); }} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />Прочитать все
                </button>
              )}
              <button onClick={function () { setShowPrefs(true); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" title="Настройки">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(function (n: any) {
                return (
                  <div
                    key={n.id}
                    onClick={function () { handleClick(n); }}
                    className={cn(
                      "px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors",
                      !n.isRead && "bg-blue-50/50",
                      TYPE_COLORS[n.type] || TYPE_COLORS.default
                    )}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] || TYPE_ICONS.default}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium truncate", !n.isRead && "text-gray-900")}>
                            {n.title}
                          </p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
                        </div>
                        {n.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                          {n.link && (
                            <span className="text-[10px] text-primary-500 flex items-center gap-0.5 font-medium">
                              <ExternalLink className="w-3 h-3" />Перейти
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}

      {open && showPrefs && createPortal(
        <div ref={panelRef} style={panelStyle} className="fixed w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-800">Настройка уведомлений</h3>
            <button onClick={function () { setShowPrefs(false); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {NOTIF_TYPES.map(function (t) {
              var enabled = prefsMap[t.type] !== false;
              return (
                <div key={t.key} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm text-gray-700">{t.label}</span>
                  </div>
                  <button
                    onClick={function () { togglePref.mutate({ type: t.key, enabled: !enabled }); }}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors duration-200",
                      enabled ? "bg-primary-500" : "bg-gray-300"
                    )}>
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                      enabled ? "left-5" : "left-0.5"
                    )} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
