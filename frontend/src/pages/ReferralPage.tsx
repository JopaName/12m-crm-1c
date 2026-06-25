import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { referralAPI } from "../api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Users, DollarSign, TrendingUp, Copy, Check, ChevronRight, ChevronDown, UserPlus, Inbox, Settings, LayoutGrid, GitBranch, Gift, ArrowUp, ArrowDown, Crown, Star, Sparkles, Eye, BadgeCheck, Clock, Target, Layers, Share2 } from "lucide-react";
import ReferralWorkflow from "../components/ReferralWorkflow";
import { cn } from "../components/cn";

type Tab = "tree" | "workflow" | "sales" | "earnings" | "invite" | "config";

const SUB_NAV = [
  { k: "workflow", l: "Воркфлоу", i: GitBranch, path: "/referrals/workflow" },
  { k: "tree", l: "Моя команда", i: Users, path: "/referrals" },
  { k: "sales", l: "Мои продажи", i: TrendingUp, path: "/referrals/sales" },
  { k: "earnings", l: "Реф. доход", i: DollarSign, path: "/referrals/earnings" },
  { k: "invite", l: "Пригласить", i: UserPlus, path: "/referrals/invite" },
] as { k: Tab; l: string; i: any; path: string }[];

export default function ReferralPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathSegments = location.pathname.split("/");
  const lastSeg = pathSegments[pathSegments.length - 1] || "tree";
  const tab: Tab = (lastSeg === "referrals" ? "tree" : lastSeg) as Tab;
  
  const currentTab: Tab = SUB_NAV.find(s => s.k === tab) ? tab : "tree";
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [period, setPeriod] = useState<"month" | "quarter" | "year" | "all">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const { data: tree, isLoading: treeLoading } = useQuery({ queryKey: ["referral-tree"], queryFn: () => referralAPI.getTree() });
  const { data: sales } = useQuery({ queryKey: ["referral-sales"], queryFn: () => { const pd = period !== "all" ? getPeriodDates() : {}; return referralAPI.getMySales(pd.start, pd.end); } });
  const { data: earnings } = useQuery({ queryKey: ["referral-earnings"], queryFn: () => { const pd = period !== "all" ? getPeriodDates() : {}; return referralAPI.getEarnings(pd.start, pd.end); } });
  const { data: invite } = useQuery({ queryKey: ["referral-invite"], queryFn: () => referralAPI.getInviteLink() });
  const { data: configs } = useQuery({ queryKey: ["referral-config"], queryFn: () => referralAPI.getConfig() });

  const sortedEarnings = useMemo(() => {
    if (!earnings?.earnings) return [];
    return [...earnings.earnings].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return 0;
    });
  }, [earnings, sortKey, sortDir]);

  const sortedSales = useMemo(() => {
    if (!sales?.deals) return [];
    return [...sales.deals].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return 0;
    });
  }, [sales, sortKey, sortDir]);
  const [configEditor, setConfigEditor] = useState<Record<number, { pct: number; active: boolean }>>({});

  const configMutation = useMutation({ mutationFn: (data: any) => referralAPI.updateConfig(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["referral-config"] }); toast.success("Настройки сохранены"); } });
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Director";

  const toggleSort = function(key) {
    if (sortKey === key) { setSortDir(function(d) { return d === 'asc' ? 'desc' : 'asc'; }); }
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sortIcon = function(key) { return sortKey === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : ''; };

  const getPeriodDates = () => {
    const now = new Date();
    if (period === "month") { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { start: s.toISOString().slice(0,10), end: now.toISOString().slice(0,10) }; }
    if (period === "quarter") { const q = Math.floor(now.getMonth() / 3); const s = new Date(now.getFullYear(), q * 3, 1); return { start: s.toISOString().slice(0,10), end: now.toISOString().slice(0,10) }; }
    if (period === "year") { const s = new Date(now.getFullYear(), 0, 1); return { start: s.toISOString().slice(0,10), end: now.toISOString().slice(0,10) }; }
    if (period === "custom" && customStart && customEnd) return { start: customStart, end: customEnd };
    return {};
  };

  const copyLink = () => {
    if (invite?.link) {
      navigator.clipboard.writeText(invite.link);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (configs && configs.length > 0) {
      const ed: Record<number, { pct: number; active: boolean }> = {};
      [1, 2].forEach(level => {
        const cfg = configs.find((c: any) => c.level === level);
        ed[level] = { pct: cfg?.percentage || (level === 1 ? 5 : 2), active: cfg?.isActive !== false };
      });
      setConfigEditor(prev => (Object.keys(prev).length === 0 ? ed : prev));
    }
  }, [configs]);

  const toggleExpand = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const renderTreeNode = (node: any, depth: number = 0) => {
    const isOpen = expanded[node.id] !== false;
    const hasChildren = node.children && node.children.length > 0;
    const colors = ["border-l-blue-400", "border-l-green-400", "border-l-gray-300"];
    const bgColors = ["bg-blue-50/50", "bg-green-50/50", "bg-gray-50/50"];

    return (
      <div key={node.id}>
        <div className={"flex items-center gap-2 py-2 px-3 rounded-lg " + bgColors[Math.min(depth, 2)] + " border-l-2 " + colors[Math.min(depth, 2)] + " ml-" + (depth * 4)} style={{ marginLeft: depth * 16 }}>
          {hasChildren && (
            <button onClick={() => toggleExpand(node.id)} className="text-gray-400 hover:text-gray-600">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          {!hasChildren && <div className="w-3.5" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 truncate">{node.name}</span>
              {!node.active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-2">неактивен</span>}
            </div>
            <div className="flex gap-3 text-[10px] text-gray-400 mt-0.5">
              <span>{node.email}</span>
              <span>{node.sales?.count || 0} продаж</span>
              <span>{(node.sales?.total || 0).toLocaleString()} ₽</span>
            </div>
          </div>
        </div>
        {hasChildren && isOpen && (
          <div>{node.children.map((c: any) => renderTreeNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Реферальная система</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Рефералов", value: tree?.totalReferrals || 0, icon: <Users className="w-4 h-4" />, color: "bg-blue-500" },
          { label: "Доход от команды", value: (earnings?.total || 0).toLocaleString() + " ₽", icon: <DollarSign className="w-4 h-4" />, color: "bg-green-500" },
          { label: "Мои продажи", value: (sales?.stats?.total || 0).toLocaleString() + " ₽", icon: <TrendingUp className="w-4 h-4" />, color: "bg-purple-500" },
          { label: "Уровень", value: tree?.referrer ? "2+" : "1", icon: <Users className="w-4 h-4" />, color: "bg-amber-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className={"w-2 h-2 rounded-full " + s.color} />
              <span className="text-[10px] text-gray-500 uppercase">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Hero Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { icon: <Users className="w-4 h-4 text-white" />, label: "Команда", value: tree?.totalReferrals || 0, sub: "человек", color: "from-blue-600 to-blue-500", link: "/referrals" },
          { icon: <DollarSign className="w-4 h-4 text-white" />, label: "Доход", value: (earnings?.total || 0).toLocaleString() + " \u20bd", sub: earnings?.trend !== undefined && earnings.trend !== 0 ? (earnings.trend > 0 ? "+" : "") + earnings.trend.toLocaleString() + " \u20bd" : undefined, color: "from-emerald-600 to-emerald-500", link: "/referrals/earnings" },
          { icon: <TrendingUp className="w-4 h-4 text-white" />, label: "Продажи", value: (sales?.stats?.total || 0).toLocaleString() + " \u20bd", sub: (sales?.stats?.count || 0) + " сделок", color: "from-violet-600 to-violet-500", link: "/referrals/sales" },
          { icon: <Crown className="w-4 h-4 text-white" />, label: "Уровень", value: tree?.referrer ? "2" : "1", sub: tree?.referrer ? "Приглашён" : "Корневой", color: "from-amber-600 to-amber-500" },
          { icon: <Gift className="w-4 h-4 text-white" />, label: "Приглашено", value: tree?.totalReferrals || 0, sub: "человек", color: "from-rose-600 to-rose-500", link: "/referrals/invite" },
        ].map((s, i) => (
          <div key={i} onClick={() => s.link && navigate(s.link)}
            className={cn(
              "relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer group",
              "bg-gradient-to-br " + s.color
            )}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">{s.icon}</div>
                <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              {s.sub && <p className="text-[11px] text-white/60 mt-0.5">{s.sub}</p>}
            </div>
            {s.link && <div className="absolute bottom-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-3.5 h-3.5 text-white" /></div>}
          </div>
        ))}
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
        {SUB_NAV.map(t => (
          <button key={t.k} onClick={() => navigate(t.path)} className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200", currentTab === t.k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/50")}><t.i className="w-3.5 h-3.5" />{t.l}</button>
        ))}
        {isAdmin && (
          <button onClick={() => navigate("/referrals/config")} className={"flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all " + (currentTab === "config" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}><Settings className="w-3.5 h-3.5" />Комиссии</button>
        )}
      </div>

      {/* Period filter */}
      {(currentTab === "sales" || currentTab === "earnings") && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400">Период:</span>
          {[
            { k: "month", l: "Месяц" },
            { k: "quarter", l: "Квартал" },
            { k: "year", l: "Год" },
            { k: "all", l: "Всё время" },
          ].map(p => (
            <button key={p.k} onClick={() => setPeriod(p.k as any)}
              className={"px-2.5 py-1 rounded-md text-xs font-medium transition-colors " + (period === p.k ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{p.l}</button>
          ))}
          <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setPeriod("custom"); }}
            className="px-2 py-1 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-primary-500/20" />
          <span className="text-xs text-gray-300">—</span>
          <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setPeriod("custom"); }}
            className="px-2 py-1 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-primary-500/20" />
        </div>
      )}

      {/* Tab content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* WORKFLOW TAB */}
        <div className={currentTab === "workflow" ? "" : "hidden"}><ReferralWorkflow tree={tree} isLoading={treeLoading} invite={invite} /></div>

        {/* TREE TAB */}
        <div className={currentTab === "tree" ? "" : "hidden"}>
          {treeLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />)}</div>
          ) : tree?.tree?.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">У вас пока нет рефералов</p><p className="text-xs mt-1">Пригласите коллег через вкладку «Пригласить»</p></div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs text-gray-400 mb-2">
                {tree?.referrer ? "Вы приглашены: " + tree.referrer : "Вы корневой менеджер"}
                {" · "}{tree?.totalReferrals || 0} чел. в команде
              </div>
              {tree?.tree?.map((n: any) => renderTreeNode(n, 0))}
            </div>
          )}
        </div>

        {/* SALES TAB */}
        {currentTab === "sales" && (
          <div>
            {sales?.deals?.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Нет продаж за период</p></div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50"><tr className="text-left text-[11px] font-semibold text-gray-500 uppercase"><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("dealNumber")}>Сделка{sortIcon("dealNumber")}</th><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("client")}>Клиент{sortIcon("client")}</th><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("expectedAmount")}>Сумма{sortIcon("expectedAmount")}</th><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("status")}>Статус{sortIcon("status")}</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedSales.map((d: any) => (
                    <tr key={d.id} className="text-sm hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{d.dealNumber}</td>
                      <td className="px-3 py-2 text-gray-500">{d.client?.name || "-"}</td>
                      <td className="px-3 py-2">{(d.expectedAmount || 0).toLocaleString()} ₽</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* EARNINGS TAB */}
        {currentTab === "earnings" && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 font-medium">Прямые (уровень 1)</p>
                <p className="text-xl font-bold text-blue-700">{(earnings?.byLevel?.[1] || 0).toLocaleString()} ₽{earnings?.trendPct !== undefined && earnings.trendPct !== 0 ? <span className={"text-[10px] ml-1 " + (earnings.trendPct > 0 ? "text-green-500" : "text-red-500")}>{earnings.trendPct > 0 ? "+" : ""}{earnings.trendPct}%</span> : null}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-600 font-medium">Уровень 2</p>
                <p className="text-xl font-bold text-green-700">{(earnings?.byLevel?.[2] || 0).toLocaleString()} ₽</p>
              </div>
            </div>
            {!earnings?.earnings?.length ? (
              <div className="text-center py-8 text-gray-400 text-sm">Нет начислений</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50"><tr className="text-left text-[11px] font-semibold text-gray-500 uppercase"><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("level")}>Уровень{sortIcon("level")}</th><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("amount")}>Сумма{sortIcon("amount")}</th><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("percentage")}>Ставка{sortIcon("percentage")}</th><th className="px-3 py-2.5 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort("status")}>Статус{sortIcon("status")}</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedEarnings.map((e: any) => (
                    <tr key={e.id} className="text-sm">
                      <td className="px-3 py-2">{e.level}</td>
                      <td className="px-3 py-2 font-medium">{e.amount.toLocaleString()} ₽</td>
                      <td className="px-3 py-2 text-gray-500">{e.percentage}%</td>
                      <td className="px-3 py-2"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (e.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ADMIN CONFIG TAB */}
        {currentTab === "config" && (
          <div className="max-w-md">
            <h3 className="text-sm font-semibold mb-3">Настройка комиссий</h3>
            <div className="space-y-3">
              {[1, 2].map(level => {
                const ed = configEditor[level] || { pct: level === 1 ? 5 : 2, active: true };
                return (
                  <div key={level} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Уровень {level}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={ed.active} onChange={e => { configMutation.mutate({ level, percentage: ed.pct, isActive: e.target.checked }); setConfigEditor(prev => ({ ...prev, [level]: { ...ed, active: e.target.checked } })); }} className="rounded" />
                        <span className="text-[11px] text-gray-500">{ed.active ? "Активен" : "Отключён"}</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" step="0.5" value={ed.pct} onChange={e => setConfigEditor(prev => ({ ...prev, [level]: { ...(prev[level] || ed), pct: Number(e.target.value) } }))} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-center" />
                      <span className="text-sm text-gray-500">%</span>
                      <button onClick={() => configMutation.mutate({ level, percentage: ed.pct, isActive: ed.active })} className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700">Сохранить</button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{level === 1 ? "Прямой реферал" : "Реферал 2-го уровня"}: {ed.pct}% от продаж</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* INVITE TAB */}
        {currentTab === "invite" && (
          <div className="max-w-lg">
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-100 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-200"><Share2 className="w-6 h-6 text-white" /></div>
                <div><h3 className="font-semibold text-gray-800">Реферальная ссылка</h3><p className="text-xs text-gray-500">Отправьте коллеге — после регистрации он появится в команде</p></div>
              </div>
            <div className="flex items-center gap-2">
                <input readOnly value={invite?.link || "Загрузка..."} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 outline-none" />
              <button onClick={copyLink} className={"px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors " + (copied ? "bg-green-600 text-white" : "bg-primary-600 text-white hover:bg-primary-700")}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "Скопировано" : "Копировать"}</button>
            </div>
            </div>
              <p className="text-xs text-gray-400 mt-2">Отправьте ссылку коллеге. После регистрации он появится в вашей команде.</p>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">Как это работает:</p>
              <ul className="text-xs text-amber-600 mt-1 space-y-1 list-disc list-inside">
                <li>Вы получаете 5% от продаж прямых рефералов</li>
                <li>И 2% от продаж рефералов 2-го уровня</li>
                <li>Глубина видимости: 3 уровня вниз</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}