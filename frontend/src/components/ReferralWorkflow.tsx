import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { referralAPI } from "../api";
import { cn } from "./cn";
import { Users, TrendingUp, DollarSign, User, Mail, ChevronLeft, X, Activity, Target, Circle, ArrowRight } from "lucide-react";

interface TreeNode {
  id: string;
  name: string;
  email: string;
  active: boolean;
  sales: { count: number; total: number };
  children: TreeNode[];
  level: number;
  parentName?: string;
}

export default function ReferralWorkflow() {
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [zoom, setZoom] = useState(1);

  const { data: tree, isLoading } = useQuery({
    queryKey: ["referral-tree"],
    queryFn: () => referralAPI.getTree(),
  });

  const flatTree = useMemo(() => {
    if (!tree?.tree) return [];
    const result: TreeNode[] = [];
    const walk = (nodes: any[], level: number, parentName?: string) => {
      nodes.forEach((n: any) => {
        const node: TreeNode = { ...n, level, parentName };
        result.push(node);
        if (n.children?.length) walk(n.children, level + 1, n.name);
      });
    };
    walk(tree.tree, 1, tree.user?.name || "Вы");
    return result;
  }, [tree]);

  const levelColors = ["bg-blue-500", "bg-green-500", "bg-gray-400"];
  const levelBorders = ["border-blue-400", "border-green-400", "border-gray-300"];
  const levelBg = ["bg-blue-50", "bg-green-50", "bg-gray-50"];
  const levelText = ["text-blue-700", "text-green-700", "text-gray-600"];

  const commissionRates = { 1: 5, 2: 2 }; // default rates

  // Build tree rows: each node at its level with connecting lines
  const renderTree = () => {
    if (!tree?.tree?.length) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Дерево пусто</p>
            <p className="text-xs mt-1">Пригласите первого реферала через вкладку «Пригласить»</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-4" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
        {/* Root node (current user) */}
        <div className={cn("rounded-xl border-2 px-5 py-3 bg-white shadow-md min-w-[200px] text-center cursor-pointer hover:shadow-lg transition-shadow", "border-primary-400")}
          onClick={() => setSelected({ id: tree.user?.id || "", name: tree.user?.name || "Вы", email: "", active: true, sales: tree.user?.sales || { count: 0, total: 0 }, children: [], level: 0 })}>
          <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white text-lg font-bold">Вы</div>
          <p className="font-semibold text-sm text-gray-800">{tree.user?.name || "Вы"}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Корневой менеджер</p>
          <div className="flex justify-center gap-3 mt-2 text-[10px]">
            <span className="text-gray-500">{tree.user?.sales?.count || 0} продаж</span>
            <span className="font-medium text-primary-600">{(tree.user?.sales?.total || 0).toLocaleString()} ₽</span>
          </div>
        </div>

        {/* Level connectors and nodes */}
        {[1, 2, 3].map(level => {
          const nodes = flatTree.filter(n => n.level === level);
          if (!nodes.length) return null;

          return (
            <div key={level} className="w-full">
              {/* Connecting lines */}
              <div className="flex justify-center">
                <div className={cn("w-0.5 h-6", level === 1 ? "bg-blue-300" : level === 2 ? "bg-green-300" : "bg-gray-300")} />
              </div>
              {/* Level label */}
              <div className="flex justify-center mb-2">
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", levelBg[level - 1], levelText[level - 1])}>
                  Уровень {level} · {nodes.length} чел. · {commissionRates[level as 1 | 2] || 0}%
                </span>
              </div>
              {/* Nodes grid */}
              <div className="flex flex-wrap justify-center gap-3">
                {nodes.map(n => (
                  <React.Fragment key={n.id}>
                    {/* Line from above */}
                    <div className="w-full flex justify-center -mb-2">
                      <div className={cn("w-0.5 h-4", level === 1 ? "bg-blue-300" : level === 2 ? "bg-green-300" : "bg-gray-300")} />
                    </div>
                    <div
                      className={cn(
                        "rounded-lg border p-3 bg-white shadow-sm min-w-[160px] cursor-pointer hover:shadow-md transition-all relative group",
                        levelBorders[level - 1],
                        selected?.id === n.id ? "ring-2 ring-primary-400" : ""
                      )}
                      onClick={() => setSelected(n)}
                    >
                      {/* Status dot */}
                      <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full", n.active ? "bg-green-400" : "bg-red-400")} />
                      {/* Level badge */}
                      <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full mb-1.5 inline-block", levelBg[level - 1], levelText[level - 1])}>
                        L{level}
                      </span>
                      <p className="font-medium text-sm text-gray-800 truncate">{n.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{n.email}</p>
                      <div className="flex gap-2 mt-1.5 text-[10px]">
                        <span className={cn("font-medium", levelText[level - 1])}>{n.sales?.count || 0} продаж</span>
                        <span className="text-gray-500">{(n.sales?.total || 0).toLocaleString()} ₽</span>
                      </div>
                      {/* Has children indicator */}
                      {n.children?.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center gap-1 text-[9px] text-gray-400">
                          <Users className="w-3 h-3" />
                          {n.children.length} рефералов
                          <span className="ml-auto text-gray-300">
                            {n.children.reduce((s: number, c: any) => s + (c.sales?.count || 0), 0)} продаж
                          </span>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-14rem)]">
      {/* Left panel — Legend / Stats */}
      <div className="w-48 shrink-0 border-r border-gray-200 p-3 text-xs space-y-3">
        <h4 className="font-semibold text-gray-700 text-sm mb-2">Легенда</h4>
        {[1, 2, 3].map(l => (
          <div key={l} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", levelColors[l - 1])} />
            <span>Уровень {l}</span>
            <span className="text-gray-400 ml-auto">{l <= 2 ? commissionRates[l as 1 | 2] + "%" : "—"}</span>
          </div>
        ))}
        <hr className="border-gray-100" />
        <div className="space-y-1">
          <p className="text-gray-500">Статистика</p>
          {[
            { label: "Всего в команде", value: tree?.totalReferrals || 0 },
            { label: "Уровней", value: flatTree.length > 0 ? Math.max(...flatTree.map(n => n.level)) : 0 },
            { label: "Мой уровень", value: tree?.referrer ? "2+" : "1" },
          ].map((s, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-400">{s.label}</span>
              <span className="font-medium">{s.value}</span>
            </div>
          ))}
        </div>
        <hr className="border-gray-100" />
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200 text-xs">−</button>
          <span className="text-gray-500 flex-1 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200 text-xs">+</button>
          <button onClick={() => setZoom(1)} className="px-1.5 py-0.5 text-gray-400 hover:text-gray-600 text-[10px]">Сброс</button>
        </div>
        {selected && (
          <button onClick={() => setSelected(null)} className="w-full mt-2 px-2 py-1.5 bg-gray-100 rounded text-gray-500 hover:bg-gray-200 text-xs flex items-center gap-1">
            <X className="w-3 h-3" /> Снять выбор
          </button>
        )}
      </div>

      {/* Center — Canvas */}
      <div className="flex-1 overflow-auto bg-gray-50/50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary-500" />
          Воркфлоу реферальной сети
        </h3>
        {renderTree()}
      </div>

      {/* Right panel — Selected node details */}
      {selected && (
        <div className="w-64 shrink-0 border-l border-gray-200 bg-white p-4 text-sm overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 truncate">{selected.name}</h4>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-3">
            {/* Basic info */}
            <div className="space-y-1.5">
              {[
                { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: selected.email || "—" },
                { icon: <Target className="w-3.5 h-3.5" />, label: "Уровень", value: selected.level === 0 ? "Вы" : `L${selected.level}` },
                { icon: <Circle className="w-3.5 h-3.5" />, label: "Статус", value: selected.active ? "Активен" : "Неактивен", color: selected.active ? "text-green-600" : "text-red-500" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-500">
                  {f.icon}
                  <span className="text-gray-400 text-xs">{f.label}:</span>
                  <span className={cn("text-xs font-medium", f.color || "text-gray-700")}>{f.value}</span>
                </div>
              ))}
            </div>

            <hr className="border-gray-100" />

            {/* Sales stats */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Продажи</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-800">{selected.sales?.count || 0}</p>
                  <p className="text-[10px] text-gray-400">сделок</p>
                </div>
                <div className="bg-primary-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-primary-700">{(selected.sales?.total || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">₽</p>
                </div>
              </div>
            </div>

            {/* Commission you earn */}
            {selected.level > 0 && selected.level <= 2 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-[10px] text-amber-600 font-medium mb-1">Ваша комиссия</p>
                <p className="text-sm font-bold text-amber-700">
                  {commissionRates[selected.level as 1 | 2]}% от продаж
                </p>
                <p className="text-[10px] text-amber-500 mt-0.5">
                  ~{((selected.sales?.total || 0) * (commissionRates[selected.level as 1 | 2] || 0) / 100).toLocaleString()} ₽ потенциально
                </p>
              </div>
            )}

            {/* Children count */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-3.5 h-3.5" />
              <span>Рефералов: <strong>{selected.children?.length || 0}</strong></span>
            </div>

            {/* Parent */}
            {selected.parentName && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ArrowRight className="w-3 h-3 rotate-180" />
                <span>Приглашён: <strong>{selected.parentName}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}