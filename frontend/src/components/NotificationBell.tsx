import React, { useEffect, useNavigate, useRef, useState } from "react";;
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { notificationAPI } from "../api";
import { Bell, Check, X, ExternalLink } from "lucide-react";
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч.`;
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const markRead = useMutation({
    mutationFn: (id: string) => notificationAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notif-unread"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notif-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (notif: any) => {
    markRead.mutate(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  const notifications = notifData?.notifications || [];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
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

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-800">Уведомления</h3>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead.mutate()} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}