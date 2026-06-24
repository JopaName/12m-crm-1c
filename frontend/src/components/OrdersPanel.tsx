import React, { useState, useMemo } from "react";
import { Calendar, Package, Search, Truck } from "lucide-react";;

function OrdersPanel({ data }: { data: any }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const items = data?.orders || [];
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((o: any) => (o.orderNumber || "").toLowerCase().includes(q) || (o.supplier?.name || "").toLowerCase().includes(q) || (o.status || "").toLowerCase().includes(q));
  }, [data, searchQuery]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-100">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Поиск заказов..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
        </div>
      </div>
      {filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
          <Truck className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет заказов"}</p>
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {filteredOrders.map((o: any) => (
          <div key={o.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-primary-600" /></div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900">{o.orderNumber}</p>
                <p className="text-xs text-gray-500 truncate">{o.supplier?.name}{o.status ? ` — ${o.status}` : ""}{o.totalAmount ? ` — ${o.totalAmount.toLocaleString()} ₽` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {o.createdAt && <span>{fmtDate(o.createdAt)}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrdersPanel;
