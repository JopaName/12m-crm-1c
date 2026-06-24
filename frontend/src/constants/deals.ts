import { Briefcase, FileText, Clock, CheckCircle, Truck, Package, DollarSign, Shield, Plus, ArrowRight, Building2, X } from "lucide-react";

const STATUSES = [
  "Lead_Created",
  "Invoice_Generation",
  "Legal_Review",
  "Doc_Sending",
  "Waiting_Payment",
  "Paid_And_Reserved",
  "Issuing_Goods",
  "Deal_Closed",
];

const STATUS_META: Record<string, { color: string; bg: string; lightBg: string; icon: any; label: string }> = {
  Lead_Created: { color: "text-primary-600", bg: "bg-primary-500", lightBg: "bg-primary-50", icon: Plus, label: "Лид" },
  Invoice_Generation: { color: "text-yellow-600", bg: "bg-yellow-500", lightBg: "bg-yellow-50", icon: DollarSign, label: "Счёт" },
  Legal_Review: { color: "text-purple-600", bg: "bg-purple-500", lightBg: "bg-purple-50", icon: Briefcase, label: "Юристы" },
  Doc_Sending: { color: "text-indigo-600", bg: "bg-indigo-500", lightBg: "bg-indigo-50", icon: ArrowRight, label: "Доки" },
  Waiting_Payment: { color: "text-orange-600", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: DollarSign, label: "Оплата" },
  Paid_And_Reserved: { color: "text-teal-600", bg: "bg-teal-500", lightBg: "bg-teal-50", icon: Building2, label: "Резерв" },
  Issuing_Goods: { color: "text-cyan-600", bg: "bg-cyan-500", lightBg: "bg-cyan-50", icon: ArrowRight, label: "Отгрузка" },
  Deal_Closed: { color: "text-emerald-600", bg: "bg-emerald-500", lightBg: "bg-emerald-50", icon: X, label: "Закрыто" },
};

type ViewMode = "kanban" | "list";

export { STATUSES, STATUS_META };
