import React, { useCallback, useEffect, useNavigate, useState } from "react";;
import AiFloatPanel from "./AiFloatPanel";
import NotificationBell from "./NotificationBell";
import Breadcrumbs from "./Breadcrumbs";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ALL_MENU_ITEMS = [
  { path: "/", label: "Дашборд", icon: "\u{1F4CA}", permission: "dashboard:view" },
  { path: "/chat", label: "Чат", icon: "\u{1F4AC}", permission: "chat:view" },
  { path: "/clients", label: "Клиенты", icon: "\u{1F465}", permission: "clients:view" },
  { path: "/deals", label: "Сделки", icon: "\u{1F91D}", permission: "deals:view" },
  { path: "/warehouse", label: "Склад", icon: "\u{1F3ED}", permission: "warehouse:view" },
  { path: "/production", label: "Производство", icon: "\u2699\uFE0F", permission: "production:view" },
  { path: "/procurement", label: "Закупки", icon: "\u{1F4E5}", permission: "procurement:view" },
  { path: "/rent", label: "Аренда", icon: "\u{1F511}", permission: "rent:view" },
  { path: "/installation", label: "Монтажи", icon: "\u{1F527}", permission: "installation:view" },
  { path: "/legal", label: "Договоры", icon: "\u{1F4C4}", permission: "legal:view" },
  { path: "/service", label: "Сервис", icon: "\u{1F6E0}\uFE0F", permission: "service:view" },
  { path: "/tasks", label: "Задачи", icon: "\u2705", permission: "tasks:view" },
  { path: "/referrals", label: "Рефералы", icon: "\u{1F91D}" },
  { path: "/users", label: "Пользователи", icon: "\u{1F464}", permission: "users:view" },
  { path: "/roles", label: "Роли", icon: "\u{1F510}", permission: "roles:view" },
];

function getStorageKey(userId: string) {
  return `menu_prefs_${userId}`;
}

function loadPrefs(userId: string): { pinned: string[]; order: string[] } {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { pinned: [], order: [] };
}

function savePrefs(userId: string, pinned: string[], order: string[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify({ pinned, order }));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const userId = user?.id || "anon";

  // Load prefs on mount
  useEffect(() => {
    const prefs = loadPrefs(userId);
    setPinned(prefs.pinned);
    setOrder(prefs.order);
  }, [userId]);

  // Persist prefs
  useEffect(() => {
    savePrefs(userId, pinned, order);
  }, [pinned, order, userId]);

  // Filter visible items by permissions
  const visibleItems = ALL_MENU_ITEMS.filter(
    (item) => !item.permission || user?.permissions?.includes(item.permission),
  );

  // Build ordered list based on saved order + new items
  const buildOrdered = useCallback(() => {
    const ordered: typeof ALL_MENU_ITEMS = [];
    const added = new Set<string>();
    for (const path of order) {
      const item = visibleItems.find((i) => i.path === path);
      if (item) {
        ordered.push(item);
        added.add(item.path);
      }
    }
    for (const item of visibleItems) {
      if (!added.has(item.path)) {
        ordered.push(item);
        added.add(item.path);
      }
    }
    return ordered;
  }, [visibleItems, order]);

  const orderedItems = buildOrdered();
  const pinnedItems = orderedItems.filter((i) => pinned.includes(i.path));
  const unpinnedItems = orderedItems.filter((i) => !pinned.includes(i.path));

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = orderedItems.map((i) => i.path);
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    setOrder(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const togglePin = (path: string) => {
    setPinned((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderNavItem = (item: (typeof ALL_MENU_ITEMS)[0], isPinned: boolean) => (
    <div
      key={item.path}
      draggable
      onDragStart={() => {
        const idx = orderedItems.findIndex((i) => i.path === item.path);
        handleDragStart(idx);
      }}
      onDragOver={(e) => {
        const idx = orderedItems.findIndex((i) => i.path === item.path);
        handleDragOver(e, idx);
      }}
      onDrop={() => {
        const idx = orderedItems.findIndex((i) => i.path === item.path);
        handleDrop(idx);
      }}
      onDragEnd={() => {
        setDragIdx(null);
        setDragOverIdx(null);
      }}
      className="group relative"
    >
      <NavLink
        to={item.path}
        end={item.path === "/"}
        className={({ isActive }) =>
          `flex items-center px-4 py-2.5 text-sm transition-colors ${
            isActive
              ? "bg-primary-50 text-primary-700 border-r-2 border-primary-600"
              : "text-gray-600 hover:bg-gray-50"
          } ${dragOverIdx === orderedItems.findIndex((i) => i.path === item.path) ? "border-t-2 border-t-blue-400" : ""}`
        }
      >
        <span className="text-lg mr-3">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePin(item.path);
              }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${
                isPinned ? "text-yellow-500" : "text-gray-300 hover:text-yellow-500"
              }`}
              title={isPinned ? "Открепить" : "Закрепить"}
            >
              <svg className="w-3.5 h-3.5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
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
      <aside
        className={`${collapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <h1 className="text-lg font-bold text-primary-600">12M CRM</h1>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
            >
              {collapsed ? "\u2192" : "\u2190"}
            </button>
          </div>
          {!collapsed && (
            <div className="mt-1.5 text-[10px] text-gray-300 text-center select-none">
              v1.0.0
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {!collapsed && pinnedItems.length > 0 && (
            <>
              <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Избранное
              </div>
              {pinnedItems.map((item) => renderNavItem(item, true))}
              <div className="mx-4 my-2 border-t border-gray-100" />
            </>
          )}
          {!collapsed && pinnedItems.length === 0 && (
            <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              Меню
            </div>
          )}
          {unpinnedItems.map((item) => renderNavItem(item, pinned.includes(item.path)))}
          {/* Hidden drag targets when collapsed */}
          {collapsed &&
            orderedItems.map((item) => (
              <div
                key={item.path + "-drag"}
                draggable
                onDragStart={() => {
                  const idx = orderedItems.findIndex((i) => i.path === item.path);
                  handleDragStart(idx);
                }}
                onDragOver={(e) => {
                  const idx = orderedItems.findIndex((i) => i.path === item.path);
                  handleDragOver(e, idx);
                }}
                onDrop={() => {
                  const idx = orderedItems.findIndex((i) => i.path === item.path);
                  handleDrop(idx);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setDragOverIdx(null);
                }}
              >
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center justify-center px-2 py-3 text-sm transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-700 border-r-2 border-primary-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                </NavLink>
              </div>
            ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="text-sm">
                <p className="font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-gray-400 text-xs">{user?.role?.name}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 text-sm"
              title="Выйти"
            >
              {"\u23FB"}
            </button>
          </div>
          {!collapsed && (
            <div className="mt-1.5 text-[10px] text-gray-300 text-center select-none">
              v1.0.0
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-2"><Breadcrumbs /><NotificationBell /></div>
          <Outlet />
        </div>
      </main>
      <AiFloatPanel />
    </div>
  );
}
