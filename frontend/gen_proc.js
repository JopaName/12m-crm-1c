const fs = require("fs");
const STATUSES = [
  "\u041D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E",
  "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E",
  "\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043D\u043E \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
  "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u0438 \u0436\u0434\u0435\u043C \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438",
  "\u041A\u0443\u043F\u043B\u0435\u043D\u043E/\u0437\u0430\u0431\u0440\u0430\u043B\u0438",
];
const SM = {
  "\u041D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E": '{"color":"text-red-600","bg":"bg-red-500","lightBg":"bg-red-50","icon":"Ban","label":"\u041D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E"}',
  "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E": '{"color":"text-blue-600","bg":"bg-blue-500","lightBg":"bg-blue-50","icon":"Eye","label":"\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E"}',
  "\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043D\u043E \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E": '{"color":"text-amber-600","bg":"bg-amber-500","lightBg":"bg-amber-50","icon":"ShoppingCart","label":"\u041D\u0430\u0439\u0434\u0435\u043D\u043E"}',
  "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u0438 \u0436\u0434\u0435\u043C \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438": '{"color":"text-purple-600","bg":"bg-purple-500","lightBg":"bg-purple-50","icon":"Truck","label":"\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E"}',
  "\u041A\u0443\u043F\u043B\u0435\u043D\u043E/\u0437\u0430\u0431\u0440\u0430\u043B\u0438": '{"color":"text-emerald-600","bg":"bg-emerald-500","lightBg":"bg-emerald-50","icon":"Package","label":"\u041A\u0443\u043F\u043B\u0435\u043D\u043E"}',
};
var R = function(){ return Math.random().toString(36).slice(2); };
var S = JSON.stringify;
fs.writeFileSync(process.argv[2], "// Generated file\n", "utf-8");
fs.appendFileSync(process.argv[2], 'import React, { useState, useMemo, useRef, useEffect } from "react";\n');
fs.appendFileSync(process.argv[2], 'import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";\n');
fs.appendFileSync(process.argv[2], 'import { procurementAPI, authAPI } from "../api";\n');
fs.appendFileSync(process.argv[2], 'import toast from "react-hot-toast";\n');
fs.appendFileSync(process.argv[2], 'import { Plus, Search, LayoutDashboard, List, Archive, User, Package, ChevronDown, Calendar, AlertCircle, Trash2, Edit3, X, Inbox, ShoppingCart, Truck, Eye, Building2, ClipboardList, Phone, Mail, CreditCard, Ban, SortDesc } from "lucide-react";\n');
fs.appendFileSync(process.argv[2], "\n");
fs.appendFileSync(process.argv[2], "var STATUSES = " + JSON.stringify(STATUSES) + ";\n");
fs.appendFileSync(process.argv[2], "var STATUS_META = " + JSON.stringify(STATUSES.reduce(function(o,s){o[s]=JSON.parse(SM[s]);return o;},{})) + ";\n");
fs.appendFileSync(process.argv[2], "var cn = function() { return Array.prototype.filter.call(arguments, Boolean).join(' '); };\n");
fs.appendFileSync(process.argv[2], "var fmtDate = function(d) { return d ? new Date(d).toLocaleDateString('ru-RU') : ''; };\n");
fs.appendFileSync(process.argv[2], "var isOverdue = function(d) { return d ? new Date(d) < new Date(new Date().toDateString()) : false; };\n");
fs.appendFileSync(process.argv[2], "var daysUntil = function(d) { return d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null; };\n");
fs.appendFileSync(process.argv[2], "var getDueDateColor = function(d) { var x = daysUntil(d); return x === null ? '' : x < 0 ? 'text-red-600' : x <= 3 ? 'text-amber-600' : 'text-gray-400'; };\n");
fs.appendFileSync(process.argv[2], 'var cleanData = function(d) { var o={}; for (var k in d) { var v=d[k]; if (v===""||v===null||v===void 0||k==="dueDateIndefinite") continue; o[k]=v; } return o; };\n');
fs.appendFileSync(process.argv[2], "\n");
console.log("Part 1 written");