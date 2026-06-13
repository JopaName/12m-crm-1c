const fs = require("fs");
const out = process.argv[2];
let src = fs.readFileSync(out || "/root/12m-crm-1c/frontend/src/pages/ProcurementPage.tsx.bak", "utf-8");
// Simple targeted replacements

// 1. Add lucide import after toast import
src = src.replace(
  'import toast from "react-hot-toast";',
  'import toast from "react-hot-toast";\nimport { Plus, Search, LayoutDashboard, List, Archive, User, Package, ChevronDown, Calendar, AlertCircle, Trash2, Edit3, X, Inbox, ShoppingCart, Truck, Eye, Building2, ClipboardList, Phone, Mail, CreditCard, Ban, SortDesc } from "lucide-react";'
);

// 2. Fix STATUS_META to have proper types
var metaStr = [
  'const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {',
  '  "Не прочитано": { color: "text-red-600", bg: "bg-red-500", lightBg: "bg-red-50", icon: Ban, label: "Не прочитано" },',
  '  "Прочитано": { color: "text-blue-600", bg: "bg-blue-500", lightBg: "bg-blue-50", icon: Eye, label: "Прочитано" },',
  '  "Найдено но не оплачено": { color: "text-amber-600", bg: "bg-amber-500", lightBg: "bg-amber-50", icon: ShoppingCart, label: "Найдено" },',
  '  "Оплачено и ждем доставки": { color: "text-purple-600", bg: "bg-purple-500", lightBg: "bg-purple-50", icon: Truck, label: "Оплачено" },',
  '  "Куплено/забрали": { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: Package, label: "Куплено" },',
  '};'
].join("\n");

src = src.replace(/const STATUS_META[\s\S]*?\{[\s\S]*?\};/, metaStr);

// 3. Remove Object.freeze from STATUSES
src = src.replace(/Object\.freeze\((\[.+?\])\)/s, "");

// Write output
fs.writeFileSync(out || "/root/12m-crm-1c/frontend/src/pages/ProcurementPage.tsx", src, "utf-8");
console.log("PATCHED OK: " + src.length + " bytes");