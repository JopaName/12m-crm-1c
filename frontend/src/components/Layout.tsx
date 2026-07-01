import React, { useCallback, useEffect, useState } from "react";
import AiFloatPanel from "./AiFloatPanel";
import ProfileModal from "./ProfileModal";
import NotificationBell from "./NotificationBell";
import Breadcrumbs from "./Breadcrumbs";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ALL_MENU_ITEMS = [
  { path: "/", label: "Дашборд", icon: "📊", permission: "dashboard:view" },
  { path: "/chat", label: "Чат", icon: "💬", permission: "chat:view" },
  { path: "/deals", label: "Лиды", icon: "🤝", permission: "deals:view" },
  { path: "/warehouse", label: "Склад", icon: "🏭", permission: "warehouse:view" },
  { path: "/procurement", label: "Закупки", icon: "📥", permission: "procurement:view" },
  { path: "/legal", label: "Договоры", icon: "📄", permission: "legal:view" },
  { path: "/tasks", label: "Задачи", icon: "✅", permission: "tasks:view" },
  { path: "/referrals", label: "Рефералы", icon: "🤝" },
  { path: "/calculator", label: "Калькулятор", icon: "🧮" },
  { path: "/users", label: "Пользователи", icon: "👤", permission: "users:view" },
  { path: "/roles", label: "Роли", icon: "🔐", permission: "roles:view" },
];

function getStorageKey(userId: string) { return `menu_prefs_${userId}`; }
function loadPrefs(userId: string): { pinned: string[]; order: string[] } {
  try { const raw = localStorage.getItem(getStorageKey(userId)); if (raw) return JSON.parse(raw); } catch {}
  return { pinned: [], order: [] };
}
function savePrefs(userId: string, pinned: string[], order: string[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify({ pinned, order }));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const userId = user?.id || "anon";

  useEffect(() => { const prefs = loadPrefs(userId); setPinned(prefs.pinned); setOrder(prefs.order); }, [userId]);
  useEffect(() => { savePrefs(userId, pinned, order); }, [pinned, order, userId]);

  const visibleItems = ALL_MENU_ITEMS.filter(i => !i.permission || user?.permissions?.includes(i.permission));

  const buildOrdered = useCallback(() => {
    const ordered: typeof ALL_MENU_ITEMS = []; const added = new Set<string>();
    for (const path of order) { const item = visibleItems.find(i => i.path === path); if (item) { ordered.push(item); added.add(item.path); } }
    for (const item of visibleItems) { if (!added.has(item.path)) { ordered.push(item); added.add(item.path); } }
    return ordered;
  }, [visibleItems, order]);

  const orderedItems = buildOrdered();
  const pinnedItems = orderedItems.filter(i => pinned.includes(i.path));
  const unpinnedItems = orderedItems.filter(i => !pinned.includes(i.path));

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const newOrder = orderedItems.map(i => i.path); const [moved] = newOrder.splice(dragIdx, 1); newOrder.splice(targetIdx, 0, moved);
    setOrder(newOrder); setDragIdx(null); setDragOverIdx(null);
  };
  const togglePin = (path: string) => setPinned(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  const handleLogout = () => { logout(); navigate("/login"); };

  const renderNavItem = (item: typeof ALL_MENU_ITEMS[0], isPinned: boolean) => (
    <div key={item.path} draggable onDragStart={() => handleDragStart(orderedItems.findIndex(i => i.path === item.path))}
      onDragOver={(e) => handleDragOver(e, orderedItems.findIndex(i => i.path === item.path))}
      onDrop={() => handleDrop(orderedItems.findIndex(i => i.path === item.path))}
      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }} className="group relative">
      <NavLink to={item.path} end={item.path === "/"} className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl text-sm transition-all duration-200 ${
          isActive ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"
        } ${dragOverIdx === orderedItems.findIndex(i => i.path === item.path) ? "ring-1 ring-blue-400" : ""}`}>
        <span className="text-base shrink-0">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(item.path); }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${isPinned ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
              title={isPinned ? "Открепить" : "Закрепить"}>
              <svg className="w-3 h-3" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </>
        )}
      </NavLink>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ====== DARK SIDEBAR ====== */}
      <aside className={`${collapsed ? "w-[68px]" : "w-60"} bg-slate-900 transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">12</div>
          {!collapsed && <span className="text-sm font-bold text-white tracking-tight">12M CRM</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {!collapsed && pinnedItems.length > 0 && (
            <>
              <div className="px-5 py-2 text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Избранное</div>
              {pinnedItems.map(item => renderNavItem(item, true))}
              <div className="mx-4 my-2 border-t border-slate-800" />
            </>
          )}
          {!collapsed && pinnedItems.length === 0 && (
            <div className="px-5 py-2 text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Меню</div>
          )}
          {unpinnedItems.map(item => renderNavItem(item, pinned.includes(item.path)))}
          {/* Collapsed icons */}
          {collapsed && orderedItems.map(item => (
            <div key={item.path + "-drag"} draggable onDragStart={() => handleDragStart(orderedItems.findIndex(i => i.path === item.path))}
              onDragOver={(e) => handleDragOver(e, orderedItems.findIndex(i => i.path === item.path))}
              onDrop={() => handleDrop(orderedItems.findIndex(i => i.path === item.path))}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}>
              <NavLink to={item.path} end={item.path === "/"} className={({ isActive }) =>
                `flex items-center justify-center py-3 mx-2 rounded-xl text-base transition-all ${isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                title={item.label}>
                <span>{item.icon}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setShowProfile(true)} className="shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700 hover:ring-blue-400 transition-all" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-slate-700 flex items-center justify-center text-xs font-bold text-white hover:ring-blue-400 transition-all">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
            </button>
            {!collapsed && (
              <button onClick={() => setShowProfile(true)} className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-gray-500">{user?.role?.name}</p>
              </button>
            )}
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors" title="Выйти">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2"><div><Breadcrumbs /></div><NotificationBell /></div>
          <Outlet />
        </div>
      </main>
      <AiFloatPanel />
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
