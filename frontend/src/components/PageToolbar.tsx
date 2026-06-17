import React, { useState, useRef, useEffect } from "react";
import { cn } from "./cn";
import type { StatusDef } from "./KanbanView";
import { X, Search, ChevronDown, Plus, LayoutDashboard, List, Archive } from "lucide-react";

type PageToolbarProps = {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  view: "kanban" | "list";
  onViewChange: (v: "kanban" | "list") => void;
  onCreate: () => void;
  createLabel?: string;
  archiveCount?: number;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  children?: React.ReactNode;
};

export function PageToolbar({
  searchValue, onSearchChange, searchPlaceholder = "Поиск...",
  view, onViewChange, onCreate, createLabel = "Создать",
  archiveCount, showArchived, onToggleArchived, children
}: PageToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input type="text" placeholder={searchPlaceholder} value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
        {searchValue && (
          <button onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
      <div className="flex-1" />
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button onClick={() => onViewChange("kanban")}
          className={cn("p-1.5 rounded-md transition-all", view === "kanban" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          title="Канбан"><LayoutDashboard className="w-4 h-4" /></button>
        <button onClick={() => onViewChange("list")}
          className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          title="Список"><List className="w-4 h-4" /></button>
      </div>
      {archiveCount != null && archiveCount > 0 && (
        <button onClick={onToggleArchived}
          className={cn("flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg border transition-all",
            showArchived ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          )}><Archive className="w-3.5 h-3.5" />{archiveCount}</button>
      )}
      <button onClick={onCreate}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm hover:shadow-md">
        <Plus className="w-3.5 h-3.5" />{createLabel}</button>
    </div>
  );
}
