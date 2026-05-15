import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  { path: "/", label: "Дашборд", icon: "📊" },
  { path: "/clients", label: "Клиенты", icon: "👥" },
  { path: "/leads", label: "Лиды", icon: "📋" },
  { path: "/deals", label: "Сделки", icon: "🤝" },
  { path: "/products", label: "Товары", icon: "📦" },
  { path: "/warehouse", label: "Склад", icon: "🏭" },
  { path: "/production", label: "Производство", icon: "⚙️" },
  { path: "/procurement", label: "Закупки", icon: "📥" },
  { path: "/rent", label: "Аренда", icon: "🔑" },
  { path: "/installation", label: "Монтажи", icon: "🔧" },
  { path: "/legal", label: "Договоры", icon: "📄" },
  { path: "/service", label: "Сервис", icon: "🛠️" },
  { path: "/tasks", label: "Задачи", icon: "✅" },
  { path: "/users", label: "Пользователи", icon: "👤" },
  { path: "/roles", label: "Роли", icon: "🔐" },
  { path: "/audit", label: "Журнал", icon: "📝" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`${collapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <h1 className="text-lg font-bold text-blue-600">12M CRM</h1>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
            >
              {collapsed ? "→" : "←"}
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              <span className="text-lg mr-3">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
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
              ⏻
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
