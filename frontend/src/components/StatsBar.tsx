import { cn } from "./cn";
import type { StatusDef } from "./KanbanView";

type StatsBarProps = {
  stats: { key: string; label: string; count: number; def: StatusDef }[];
  activeFilter: string;
  onFilter: (key: string) => void;
  total?: { label: string; count: number; icon: any };
};

export function StatsBar({ stats, activeFilter, onFilter, total }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mb-4">
      {total && (
        <div onClick={() => onFilter("")}
          className={cn("bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md",
            !activeFilter ? "ring-2 ring-offset-2 ring-primary-500 shadow-lg" : ""
          )}>
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
            {total.icon && <total.icon className="w-4 h-4 text-primary-600" />}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{total.count}</p>
            <p className="text-[11px] text-gray-500">{total.label}</p>
          </div>
        </div>
      )}
      {stats.map((s) => {
        const Icon = s.def.icon;
        return (
          <div key={s.key}
            onClick={() => onFilter(activeFilter === s.key ? "" : s.key)}
            className={cn("rounded-xl border p-3 flex items-center gap-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
              s.def.lightBg,
              activeFilter === s.key ? "ring-2 ring-offset-2 ring-gray-900 shadow-lg" : activeFilter ? "opacity-40 grayscale" : ""
            )}>
            {Icon && <Icon className={cn("w-4 h-4", s.def.color)} />}
            <div>
              <p className="text-sm font-bold text-gray-900">{s.count}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
