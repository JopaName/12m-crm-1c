import { cn } from "./cn";

export type StatusDef = {
  key: string;
  label: string;
  color: string;     // text class
  bg: string;        // background class  
  lightBg: string;   // light background
  icon: any;
};

type KanbanViewProps<T> = {
  items: T[];
  statuses: StatusDef[];
  getStatus: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  activeFilter?: string;
  className?: string;
};

export function KanbanView<T>({ items, statuses, getStatus, renderCard, activeFilter, className }: KanbanViewProps<T>) {
  const columns = statuses.map((s) => ({
    ...s,
    items: items.filter((item) => getStatus(item) === s.key),
  }));

  const visible = activeFilter
    ? columns.filter((c) => c.key === activeFilter)
    : columns;

  return (
    <div className={cn(
      "grid gap-3",
      activeFilter ? "grid-cols-1 max-w-xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      className
    )}>
      {visible.map((col) => {
        const Icon = col.icon;
        return (
          <div key={col.key} className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
            <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 rounded-t-xl", col.lightBg)}>
              {Icon && <Icon className={cn("w-4 h-4", col.color)} />}
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1 truncate">{col.label}</h3>
              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white", col.bg)}>
                {col.items.length}
              </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
              {col.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  <p className="text-xs">Пусто</p>
                </div>
              )}
              {col.items.map((item: any, i: number) => (
                <div key={item.id || i}>{renderCard(item)}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
