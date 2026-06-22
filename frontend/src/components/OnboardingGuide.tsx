import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { X, ChevronRight, Briefcase, Building2, Package, ShoppingCart, Wrench, FileText, CreditCard, Factory, Users, Shield, User, MessageCircle } from "lucide-react";

const SECTION_INFO: Record<string, { icon: any; label: string; desc: string; color: string; path: string; perm: string }> = {
  deals: { icon: Briefcase, label: "Сделки", desc: "Воронка продаж: от лида до закрытия. Двигайте сделки по этапам, привязывайте задачи и монтажи", color: "bg-blue-100 text-blue-600", path: "/deals", perm: "deals:view" },
  clients: { icon: Building2, label: "Клиенты", desc: "База клиентов с контактами, ИНН и историей сделок. Вся информация в одном месте", color: "bg-green-100 text-neon-green", path: "/clients", perm: "clients:view" },
  warehouse: { icon: Package, label: "Склад", desc: "Учёт товаров по каталогам. Перемещение между зонами, контроль остатков", color: "bg-teal-100 text-teal-600", path: "/warehouse", perm: "warehouse:view" },
  procurement: { icon: ShoppingCart, label: "Закупки", desc: "Заявки на закупку, поставщики, заказы. Канбан по статусам с файлами", color: "bg-rose-100 text-rose-600", path: "/procurement", perm: "procurement:view" },
  production: { icon: Factory, label: "Производство", desc: "Производственные заказы по маршрутам. Отслеживание этапов", color: "bg-amber-100 text-amber-400", path: "/production", perm: "production:view" },
  installation: { icon: Wrench, label: "Монтаж", desc: "Задачи на установку оборудования. Назначение монтажников, календарь", color: "bg-indigo-100 text-neon-purple", path: "/installation", perm: "installation:view" },
  legal: { icon: FileText, label: "Договоры", desc: "Юридические документы: создание, утверждение, подписание", color: "bg-purple-100 text-purple-600", path: "/legal", perm: "legal:view" },
  rent: { icon: CreditCard, label: "Аренда", desc: "Договоры аренды, платежи, просрочки. Контроль активных контрактов", color: "bg-orange-100 text-orange-600", path: "/rent", perm: "rent:view" },
  tasks: { icon: FileText, label: "Задачи", desc: "Поручения с приоритетами и сроками. Канбан по статусам", color: "bg-amber-100 text-amber-700", path: "/tasks", perm: "tasks:view" },
  users: { icon: Users, label: "Пользователи", desc: "Управление сотрудниками, ролями и правами доступа", color: "bg-[#111927] text-gray-500", path: "/users", perm: "users:view" },
  roles: { icon: Shield, label: "Роли", desc: "Настройка прав доступа. Назначение и увольнение сотрудников", color: "bg-[#111927] text-gray-300", path: "/roles", perm: "roles:view" },
  chat: { icon: MessageCircle, label: "Чат", desc: "Общение с коллегами в реальном времени. Группы, реакции, пересылка", color: "bg-sky-100 text-sky-600", path: "/chat", perm: "chat:view" },
};

export default function OnboardingGuide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  const storageKey = `onboarding_${user?.id || "anon"}`;

  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done && user) {
      setTimeout(() => setVisible(true), 500);
    }
  }, [user, storageKey]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(storageKey, "done");
  }, [storageKey]);

  // Dismiss on any key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => dismiss();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, dismiss]);

  if (!visible || dismissed) return null;

  const userPerms = user?.permissions || [];
  const availableSections = Object.entries(SECTION_INFO).filter(([_, s]) => !s.perm || userPerms.includes(s.perm));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={dismiss}>
      <div className="bg-[#0d1520] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-600 rounded-t-2xl px-8 py-10 text-gray-100 text-center">
          <button onClick={dismiss} className="absolute top-4 right-4 p-1.5 bg-[#0d1520]/10 hover:bg-[#0d1520]/20 rounded-lg transition-colors">
            <X className="w-5 h-5" /></button>
          <div className="w-16 h-16 mx-auto mb-4 bg-[#0d1520]/15 rounded-2xl flex items-center justify-center backdrop-blur">
            <Briefcase className="w-8 h-8" /></div>
          <h2 className="text-2xl font-bold mb-2">Добро пожаловать, {user?.firstName}!</h2>
          <p className="text-gray-100/70 text-sm max-w-md mx-auto">
            Это ваш персональный обзор системы 12M CRM. Ознакомьтесь с доступными вам разделами.
          </p>
          <p className="text-gray-100/40 text-xs mt-3">Нажмите любую клавишу чтобы закрыть</p>
        </div>

        {/* Sections grid */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-primary-500/100" />
            <h3 className="text-sm font-semibold text-gray-300">Доступные разделы ({availableSections.length})</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableSections.map(([key, s]) => (
              <div key={key}
                className="flex items-start gap-3 p-4 rounded-xl border border-[rgba(0,229,255,0.06)] hover:border-primary-200 hover:bg-primary-500/10/30 cursor-pointer transition-all group"
                onClick={() => { navigate(s.path); dismiss(); }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${s.color} group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-200 flex items-center gap-1">
                    {s.label}
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-neon-cyan group-hover:translate-x-0.5 transition-all" />
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-2">💡 Советы</p>
            <ul className="text-xs text-amber-400 space-y-1.5">
              <li>• <kbd className="px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-mono">Ctrl+K</kbd> — глобальный поиск по всем разделам</li>
              <li>• Кликайте на имена и номера сделок — они ведут в связанные разделы</li>
              <li>• В карточке сделки есть быстрые действия: задача, монтаж, договор</li>
              <li>• Перетаскивайте пункты меню для удобной навигации</li>
            </ul>
          </div>

          {/* Footer */}
          <button onClick={dismiss}
            className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-all shadow-card">
            Понятно, приступить к работе
          </button>
        </div>
      </div>
    </div>
  );
}
