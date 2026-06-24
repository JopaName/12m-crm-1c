import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { referralAPI } from "../api";
import { cn } from "./cn";
import { Check, ChevronDown, ChevronRight, Circle, Copy, GitBranch, Mail, Plus, TreeNode, TrendingUp, User, UserPlus, Users, X } from "lucide-react";;
import toast from "react-hot-toast";

interface TreeNode {
  id: string; name: string; email: string; active: boolean;
  sales: { count: number; total: number }; children: TreeNode[]; level: number; parentName?: string;
}

export default function ReferralWorkflow() {
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showInvite, setShowInvite] = useState<string | null>(null);

  const { data: tree, isLoading, refetch } = useQuery({ queryKey: ["referral-tree"], queryFn: () => referralAPI.getTree() });
  const { data: invite } = useQuery({ queryKey: ["referral-invite"], queryFn: () => referralAPI.getInviteLink() });

  // Convert API tree to flat list with parent refs
  const flatTree = useMemo(() => {
    if (!tree?.tree) return [];
    const result: TreeNode[] = [];
    const walk = (nodes: any[], level: number, parentName?: string) => {
      nodes.forEach((n: any) => {
        result.push({ ...n, level, parentName } as TreeNode);
        if (n.children?.length) walk(n.children, level + 1, n.name);
      });
    };
    walk(tree.tree, 1, tree.user?.name || "Вы");
    return result;
  }, [tree]);

  const levelColors = ["border-blue-400 bg-blue-50", "border-emerald-400 bg-emerald-50", "border-amber-400 bg-amber-50"];
  const dotColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500"];
  const lineColors = ["border-blue-300", "border-emerald-300", "border-amber-300"];

  const copyLink = () => {
    if (invite?.link) { navigator.clipboard.writeText(invite.link); toast.success("Ссылка скопирована"); }
  };

  // Find empty slots — places where a user could invite someone (max 3 per level visible)
  const emptySlotsByParent: Record<string, number> = {};
  flatTree.forEach(n => {
    const childCount = n.children?.length || 0;
    if (n.level < 3 && childCount < 3) emptySlotsByParent[n.id] = 3 - childCount;
  });

  const renderTreeNode = (node: TreeNode, isLast: boolean = false) => {
    const isOpen = expanded[node.id] !== false; // default open
    const hasChildren = node.children?.length > 0;
    const canHaveMore = node.level < 3 && (node.children?.length || 0) < 5;
    const childCount = node.children?.length || 0;
    const emptySlots = node.level < 3 ? Math.max(0, 3 - childCount) : 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node card */}
        <div
          className={cn(
            "relative border-2 rounded-xl p-3 bg-white shadow-sm min-w-[170px] cursor-pointer hover:shadow-lg transition-all group",
            levelColors[Math.min(node.level - 1, 2)],
            selected?.id === node.id ? "ring-2 ring-primary-400 scale-105" : ""
          )}
          onClick={() => setSelected(node)}
        >
          {/* Status */}
          <div className={cn("absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white", node.active ? "bg-green-500" : "bg-red-400")} />
          {/* Level badge */}
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", 
            node.level === 1 ? "bg-blue-100 text-blue-700" : node.level === 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          )}>L{node.level}</span>
          {/* Name */}
          <p className="font-semibold text-sm text-gray-800 mt-1.5 truncate">{node.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{node.email}</p>
          {/* Stats */}
          <div className="flex gap-3 mt-2 text-[10px]">
            <span className="font-medium">{node.sales?.count || 0} <span className="text-gray-400">сделок</span></span>
            <span className="text-gray-600">{(node.sales?.total || 0).toLocaleString()} ₽</span>
          </div>
          {/* Children summary */}
          {hasChildren && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[10px] text-gray-400">
              <Users className="w-3 h-3" />{childCount} рефералов
            </div>
          )}
          {/* Expand button */}
          {hasChildren && (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(e => ({ ...e, [node.id]: !isOpen })); }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm">
              {isOpen ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
            </button>
          )}
        </div>

        {/* Empty invite slots under this node */}
        {isOpen && emptySlots > 0 && (
          <div className="flex gap-2 mt-4">
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${node.id}-${i}`} className="flex flex-col items-center">
                {/* Connector line */}
                <div className="w-px h-4 bg-gray-300" />
                {/* Empty slot */}
                <div className="w-[130px] h-[60px] border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50/50 hover:border-primary-400 hover:bg-primary-50/30 cursor-pointer transition-all group/slot"
                  onClick={(e) => { e.stopPropagation(); setShowInvite(invite?.link || ""); }}>
                  <div className="text-center">
                    <Plus className="w-5 h-5 text-gray-300 group-hover/slot:text-primary-500 mx-auto transition-colors" />
                    <p className="text-[10px] text-gray-400 group-hover/slot:text-primary-600 mt-0.5">Пригласить</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Children */}
        {isOpen && hasChildren && (
          <div className="flex flex-col items-center">
            {/* Vertical line down */}
            <div className="w-px h-4 bg-gray-300" />
            {/* Horizontal connector */}
            {node.children.length > 1 && (
              <div className="h-px bg-gray-300" style={{ width: `${node.children.length * 180}px`, maxWidth: '100%' }} />
            )}
            {/* Children row */}
            <div className="flex gap-4 flex-wrap justify-center pt-1">
              {node.children.map((child: any, i: number) => {
                const childNode: TreeNode = { ...child, level: node.level + 1, parentName: node.name };
                return (
                  <div key={child.id} className="flex flex-col items-center">
                    {/* Vertical line from connector */}
                    {node.children.length > 1 && <div className="w-px h-3 bg-gray-300" />}
                    {renderTreeNode(childNode)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Загрузка...</div>;

  return (
    <div className="flex h-[calc(100vh-14rem)]">
      {/* LEFT PANEL — Legend + Quick invite */}
      <div className="w-52 shrink-0 border-r border-gray-200 p-3 text-xs space-y-3">
        <h4 className="font-semibold text-gray-700 text-sm">Реферальное дерево</h4>
        <div className="space-y-1.5">
          {[
            { l: 1, color: "bg-blue-500", label: "Прямые рефералы", rate: "5%" },
            { l: 2, color: "bg-emerald-500", label: "Рефералы 2-го уровня", rate: "2%" },
            { l: 3, color: "bg-amber-500", label: "Рефералы 3-го уровня", rate: "—" },
          ].map(l => (
            <div key={l.l} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", l.color)} />
              <span>{l.label}</span>
              <span className="text-gray-400 ml-auto">{l.rate}</span>
            </div>
          ))}
        </div>
        <hr className="border-gray-100" />
        <div className="space-y-1">
          {[
            { label: "В команде", value: tree?.totalReferrals || 0 },
            { label: "Мой уровень", value: tree?.referrer ? "2+" : "1" },
          ].map((s, i) => (
            <div key={i} className="flex justify-between"><span className="text-gray-400">{s.label}</span><span className="font-medium">{s.value}</span></div>
          ))}
        </div>
        <hr className="border-gray-100" />
        {/* Quick invite */}
        <button onClick={() => { const link = invite?.link; if (link) { navigator.clipboard.writeText(link); toast.success("Ссылка скопирована!"); } }}
          className="w-full py-2 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 flex items-center justify-center gap-1.5 transition-colors">
          <UserPlus className="w-3.5 h-3.5" />Пригласить менеджера
        </button>
        <p className="text-[10px] text-gray-400 text-center">Ссылка скопируется в буфер</p>

        {/* Invite popup */}
        {showInvite && (
          <div className="mt-2 p-2.5 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-primary-700">Ссылка готова</span>
              <button onClick={() => setShowInvite(null)} className="text-primary-400 hover:text-primary-600"><X className="w-3 h-3" /></button>
            </div>
            <input readOnly value={invite?.link || ""} className="w-full text-[10px] bg-white border border-primary-200 rounded px-2 py-1 text-gray-600 mb-1.5" />
            <button onClick={copyLink} className="w-full py-1 bg-primary-600 text-white rounded text-[10px] flex items-center justify-center gap-1"><Copy className="w-3 h-3" />Копировать</button>
          </div>
        )}
      </div>

      {/* CENTER — Tree canvas */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary-500" />
          Дерево реферальной сети
        </h3>

        <div className="flex flex-col items-center min-w-max">
          {/* Root node */}
          <div className="flex flex-col items-center">
            <div className="border-2 border-primary-400 rounded-xl p-4 bg-white shadow-md min-w-[200px] text-center">
              <div className="w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white text-xl font-bold shadow-sm">Вы</div>
              <p className="font-semibold text-sm text-gray-800">{tree?.user?.name || "Вы"}</p>
              <p className="text-[10px] text-gray-400">Корневой менеджер</p>
              <div className="flex justify-center gap-3 mt-2 text-[10px]">
                <span className="text-gray-500">{tree?.user?.sales?.count || 0} продаж</span>
                <span className="font-bold text-primary-600">{(tree?.user?.sales?.total || 0).toLocaleString()} ₽</span>
              </div>
            </div>

            {/* Root invite slots if no referrals yet */}
            {(!tree?.tree || tree.tree.length === 0) && (
              <div className="mt-4 flex gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} onClick={() => setShowInvite(invite?.link || "")}
                    className="w-[150px] h-[70px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-white/50 hover:border-primary-400 hover:bg-primary-50/30 cursor-pointer transition-all group">
                    <Plus className="w-6 h-6 text-gray-300 group-hover:text-primary-500 transition-colors" />
                    <p className="text-xs text-gray-400 group-hover:text-primary-600 mt-1">Пригласить</p>
                  </div>
                ))}
              </div>
            )}

            {/* Level connectors */}
            {tree?.tree && tree.tree.length > 0 && (
              <div className="flex flex-col items-center mt-2">
                {/* Vertical line from root */}
                <div className="w-0.5 h-6 bg-blue-300" />
                {/* Horizontal connector for L1 */}
                {tree.tree.length > 1 && (
                  <div className="h-0.5 bg-blue-300" style={{ width: `${Math.min(tree.tree.length * 200, 800)}px` }} />
                )}
                {/* L1 nodes */}
                <div className="flex gap-4 flex-wrap justify-center pt-0">
                  {tree.tree.map((n: any, i: number) => (
                    <div key={n.id} className="flex flex-col items-center">
                      {tree.tree.length > 1 && <div className="w-0.5 h-3 bg-blue-300" />}
                      {renderTreeNode({ ...n, level: 1, parentName: tree?.user?.name || "Вы" } as TreeNode)}
                    </div>
                  ))}
                  {/* Empty invite slots at L1 level if less than 3 */}
                  {tree.tree.length < 3 && Array.from({ length: 3 - tree.tree.length }).map((_, i) => (
                    <div key={`root-empty-${i}`} className="flex flex-col items-center">
                      {tree.tree.length > 0 && <div className="w-0.5 h-3 bg-blue-300" />}
                      <div onClick={() => setShowInvite(invite?.link || "")}
                        className="w-[150px] h-[70px] border-2 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center bg-blue-50/30 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group">
                        <Plus className="w-6 h-6 text-blue-300 group-hover:text-blue-500 transition-colors" />
                        <p className="text-xs text-blue-400 group-hover:text-blue-600 mt-1 font-medium">Пригласить</p>
                        <p className="text-[9px] text-blue-300">L1 · 5%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Selected node details */}
      {selected && (
        <div className="w-64 shrink-0 border-l border-gray-200 bg-white p-4 text-sm overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 truncate">{selected.name}</h4>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              {[
                { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: selected.email || "—" },
                { icon: <GitBranch className="w-3.5 h-3.5" />, label: "Уровень", value: `L${selected.level}` },
                { icon: <Circle className="w-3.5 h-3.5" />, label: "Статус", value: selected.active ? "Активен" : "Неактивен", color: selected.active ? "text-green-600" : "text-red-500" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-500">
                  {f.icon}<span className="text-gray-400 text-xs">{f.label}:</span>
                  <span className={cn("text-xs font-medium", f.color || "text-gray-700")}>{f.value}</span>
                </div>
              ))}
            </div>
            <hr className="border-gray-100" />
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{selected.sales?.count || 0}</p><p className="text-[10px] text-gray-400">сделок</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-primary-700">{(selected.sales?.total || 0).toLocaleString()}</p><p className="text-[10px] text-gray-400">₽</p>
              </div>
            </div>
            {selected.level <= 2 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-[10px] text-amber-600 font-medium">Ваша комиссия: <strong>{selected.level === 1 ? "5%" : "2%"}</strong></p>
                <p className="text-[10px] text-amber-500">~{((selected.sales?.total || 0) * (selected.level === 1 ? 0.05 : 0.02)).toLocaleString()} ₽</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}