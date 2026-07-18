import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI, rolesAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import ProfileModal from "../components/ProfileModal";
import {
  Building2, Users, Shield, Plus, Search, X, Edit3, Trash2, Copy, QrCode,
  Check, User, Mail, Phone
} from "lucide-react";

const blankInvite = { firstName: "", lastName: "", roleId: "" };

const PERMISSION_GROUPS = [
  { label: "Дашборд", key: "dashboard", perms: ["view"] },
  { label: "Чат", key: "chat", perms: ["view"] },
  { label: "Клиенты", key: "clients", perms: ["view","create","edit","delete"] },
  { label: "Лиды", key: "deals", perms: ["view","create","edit","delete"] },
  { label: "Склад", key: "warehouse", perms: ["view","create","edit","delete"] },
  { label: "Закупки", key: "procurement", perms: ["view","create","edit","delete"] },
  { label: "Производство", key: "production", perms: ["view","create","edit","delete"] },
  { label: "Договоры", key: "legal", perms: ["view","create","edit","delete"] },
  { label: "Задачи", key: "tasks", perms: ["view","create","edit","delete"] },
  { label: "Рефералы", key: "referrals", perms: ["view","create","edit","delete"] },
  { label: "Товары", key: "products", perms: ["view","create","edit","delete"] },
  { label: "Аренда", key: "rent", perms: ["view","create","edit","delete"] },
  { label: "Монтажи", key: "installation", perms: ["view","create","edit","delete"] },
  { label: "Сервис", key: "service", perms: ["view","create","edit","delete"] },
  { label: "Пользователи", key: "users", perms: ["view","create","edit","delete"] },
  { label: "Роли", key: "roles", perms: ["view","create","edit","delete"] },
  { label: "Аудит", key: "audit", perms: ["view"] },
  { label: "Интеграции", key: "integrations", perms: ["view","create","edit","delete"] },
  { label: "База знаний", key: "knowledge", perms: ["view","create","edit","delete"] },
];

const PERM_LABELS: Record<string,string> = { view:"Просмотр", create:"Создание", edit:"Редактирование", delete:"Удаление", convert:"Конвертация" };
function decodePermissions(j: any): string[] { if (!j) return []; if (Array.isArray(j)) return j; return []; }


export default function CompanyPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"users"|"roles">("users");
  const [viewUserId, setViewUserId] = useState<string|null>(null);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-primary-500" />Моя Компания
        </h1>
      </div>

      <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        <button onClick={()=>setTab("users")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",tab==="users"?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700")}>
          <Users className="w-4 h-4"/>Сотрудники</button>
        <button onClick={()=>setTab("roles")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",tab==="roles"?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700")}>
          <Shield className="w-4 h-4"/>Роли и доступ</button>
      </div>

      {tab==="users" && <UsersTab onViewProfile={setViewUserId} currentUserId={me?.id||""}/>}
      {tab==="roles" && <RolesTab/>}
      {viewUserId && <ProfileModal user={viewUserId===me?.id?me:null} profileUserId={viewUserId} onClose={()=>setViewUserId(null)}/>}
    </div>
  );
}

function UsersTab({onViewProfile,currentUserId}:{onViewProfile:(id:string)=>void;currentUserId:string}) {
  const queryClient = useQueryClient();
  const [invite,setInvite]=useState(false);
  const [editId,setEditId]=useState<string|null>(null);
  const [ef,setEf]=useState({email:"",password:"",firstName:"",lastName:"",phone:"",roleId:""});
  const [invF,setInvF]=useState(blankInvite);
  const [invR,setInvR]=useState<any>(null);
  const [sq,setSq]=useState("");

  const {data:users,isLoading}=useQuery({queryKey:["users"],queryFn:()=>authAPI.getUsers().then(r=>r.data)});
  const {data:roles}=useQuery({queryKey:["roles-company"],queryFn:()=>authAPI.getRoles().then(r=>r.data)});
  const roleMap=useMemo(()=>{const m:Record<string,string>={};roles?.forEach((r:any)=>m[r.id]=r.name);return m},[roles]);

  const ci=useMutation({mutationFn:(d:any)=>authAPI.createInvite(d),onSuccess:(d:any)=>{queryClient.invalidateQueries({queryKey:["users"]});setInvR(d);toast.success("Приглашение создано")},onError:(e:any)=>toast.error(e.response?.data?.error||"Ошибка")});
  const um=useMutation({mutationFn:({id,data:d}:any)=>authAPI.updateUser(id,d),onSuccess:()=>{queryClient.invalidateQueries({queryKey:["users"]});toast.success("Сохранено");setEditId(null)},onError:(e:any)=>toast.error(e.response?.data?.error||"Ошибка")});
  const dm=useMutation({mutationFn:(id:string)=>authAPI.deleteUser(id),onSuccess:()=>{queryClient.invalidateQueries({queryKey:["users"]});toast.success("Удалён")},onError:(e:any)=>toast.error(e.response?.data?.error||"Ошибка")});

  const filtered=useMemo(()=>{let items=users||[];if(sq){const q=sq.toLowerCase();items=items.filter((u:any)=>(u.firstName||"").toLowerCase().includes(q)||(u.lastName||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q))}return items},[users,sq]);

  const stats=useMemo(()=>{let t=0,a=0;(users||[]).forEach((u:any)=>{t++;if((u.role?.name||u.role)==="Director"||(u.role?.name||u.role)==="Admin")a++});return{t,admins:a,regular:t-a}},[users]);

  const cp=async(t:string)=>{try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(t);toast.success("Ссылка скопирована");return}}catch{}const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast.success("Ссылка скопирована")};
  const cls=()=>{setInvite(false);setInvR(null);setInvF(blankInvite)};

  if(isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded-lg w-48"/><div className="h-64 bg-gray-200 rounded-xl"/></div>;

  return (<div>
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600"/></div><div><p className="text-xl font-bold text-gray-900">{stats.t}</p><p className="text-xs text-gray-500">Всего сотрудников</p></div></div>
      <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm bg-amber-50/50"><div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Shield className="w-5 h-5 text-amber-600"/></div><div><p className="text-xl font-bold text-gray-900">{stats.admins}</p><p className="text-xs text-gray-500">Администраторы</p></div></div>
      <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm bg-gray-50/50"><div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><User className="w-5 h-5 text-gray-500"/></div><div><p className="text-xl font-bold text-gray-900">{stats.regular}</p><p className="text-xs text-gray-500">Сотрудники</p></div></div>
    </div>
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input placeholder="Поиск сотрудников..." value={sq} onChange={e=>setSq(e.target.value)} className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>{sq&&<button onClick={()=>setSq("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4"/></button>}</div>
      <div className="flex-1"/>
      <button onClick={()=>{setInvF(blankInvite);setInvR(null);setInvite(true)}} className="flex items-center gap-2 text-sm px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-4 h-4"/>Пригласить сотрудника</button>
    </div>
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {filtered.length===0&&<div className="flex flex-col items-center justify-center py-16 text-gray-400"><Users className="w-12 h-12 mb-3 opacity-30"/><p className="text-sm">{sq?"Ничего не найдено":"Нет сотрудников"}</p></div>}
      <div className="divide-y divide-gray-100">
        {filtered.map((u:any)=>(<div key={u.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors group">
          <button onClick={()=>onViewProfile(u.id)} className="shrink-0">{u.avatar?<img src={u.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-primary-400 transition-colors"/>:<div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center hover:ring-2 hover:ring-primary-300 transition-all"><span className="text-sm font-bold text-primary-600">{(u.firstName?.[0]||"")+(u.lastName?.[0]||"")}</span></div>}</button>
          <div className="flex-1 min-w-0">
            <button onClick={()=>onViewProfile(u.id)} className="font-medium text-gray-900 text-sm hover:text-primary-600 hover:underline transition-colors">{u.firstName} {u.lastName}</button>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5"><span className="flex items-center gap-1"><Mail className="w-3 h-3"/>{u.email}</span>{u.phone&&<span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{u.phone}</span>}<span className="flex items-center gap-1"><Shield className="w-3 h-3"/>{roleMap[u.roleId]||(typeof u.role==="object"?u.role?.name:u.role)||"—"}</span></div>
          </div>
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium",u.isActive?"bg-green-100 text-green-700":"bg-red-100 text-red-600")}>{u.isActive?"Активен":"Неактивен"}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={()=>{setEf({email:u.email,password:"",firstName:u.firstName,lastName:u.lastName,phone:u.phone||"",roleId:u.roleId||""});setEditId(u.id)}} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4"/></button>
            <button onClick={()=>{if(confirm("Удалить сотрудника?"))dm.mutate(u.id)}} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
          </div>
        </div>))}
      </div>
    </div>


    {invite&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={cls}><div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><QrCode className="w-4 h-4 text-primary-500"/>Пригласить сотрудника</h3><button onClick={cls} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button></div>
      {invR?(<div className="px-5 py-5 space-y-4"><div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl"><Check className="w-4 h-4 text-green-600 shrink-0"/><p className="text-sm text-green-700">Приглашение для <strong>{invR.firstName} {invR.lastName}</strong> создано</p></div>
        <div className="flex justify-center"><img src={"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data="+encodeURIComponent(invR.inviteLink||"")} alt="QR" className="rounded-xl border w-[180px] h-[180px]"/></div>
        <div className="space-y-2"><p className="text-xs text-gray-500">Ссылка для регистрации (24 часа):</p><div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg"><p className="text-xs text-gray-700 truncate flex-1 select-all">{invR.inviteLink}</p><button onClick={()=>cp(invR.inviteLink)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg shrink-0"><Copy className="w-4 h-4"/></button></div></div>
        <div className="flex gap-2 pt-2"><button onClick={()=>{setInvR(null);setInvF(blankInvite)}} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Новое приглашение</button><button onClick={cls} className="flex-1 px-4 py-2.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">Готово</button></div></div>):(<>
        <div className="px-5 py-4 space-y-3"><p className="text-xs text-gray-500">Сотрудник получит ссылку для самостоятельной регистрации.</p>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Имя <span className="text-red-500">*</span></label><input value={invF.firstName} onChange={e=>setInvF({...invF,firstName:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus/></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Фамилия <span className="text-red-500">*</span></label><input value={invF.lastName} onChange={e=>setInvF({...invF,lastName:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/></div></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Роль</label><select value={invF.roleId} onChange={e=>setInvF({...invF,roleId:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Выберите роль</option>{roles?.filter((r:any)=>!r.isArchived).map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div></div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"><div className="flex-1"/><button onClick={cls} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button><button onClick={()=>{if(!invF.firstName.trim()||!invF.lastName.trim()||!invF.roleId){toast.error("Заполните обязательные поля");return}ci.mutate(invF)}} disabled={ci.isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm">{ci.isPending?"Создание...":"Создать"}</button></div></>)}
    </div></div>)}
    {editId&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={()=>setEditId(null)}><div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary-500"/>Редактировать сотрудника</h3><button onClick={()=>setEditId(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button></div>
      <div className="px-5 py-4 space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Имя</label><input value={ef.firstName} onChange={e=>setEf({...ef,firstName:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Фамилия</label><input value={ef.lastName} onChange={e=>setEf({...ef,lastName:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/></div></div>
      <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label><input value={ef.email} onChange={e=>setEf({...ef,email:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Телефон</label><input value={ef.phone} onChange={e=>setEf({...ef,phone:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Роль</label><select value={ef.roleId} onChange={e=>setEf({...ef,roleId:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Без роли</option>{roles?.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div></div></div>
      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"><div className="flex-1"/><button onClick={()=>setEditId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button><button onClick={()=>{if(!ef.email.trim()||!ef.firstName.trim()){toast.error("Заполните обязательные поля");return}const payload = { ...ef }; if (!payload.password) delete payload.password; um.mutate({id:editId, data:payload})}} disabled={um.isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm">{um.isPending?"Сохранение...":"Сохранить"}</button></div>
    </div></div>)}
  </div>);
}

function RolesTab() {
  const queryClient=useQueryClient();
  const [show,setShow]=useState(false);
  const [eid,setEid]=useState<string|null>(null);
  const [frm,setFrm]=useState({name:"",description:"",permissions:[] as string[]});
  const {data:roles,isLoading}=useQuery({queryKey:["roles-company"],queryFn:()=>rolesAPI.getAll().then(r=>r.data)});
  const {data:users}=useQuery({queryKey:["users"],queryFn:()=>authAPI.getUsers().then(r=>r.data)});
  const ucr=useMemo(()=>{const m:Record<string,number>={};(users||[]).forEach((u:any)=>{const rid=u.roleId;if(rid)m[rid]=(m[rid]||0)+1});return m},[users]);
  const cm=useMutation({mutationFn:(d:any)=>rolesAPI.create(d),onSuccess:()=>{queryClient.invalidateQueries({queryKey:["roles-company"]});toast.success("Роль создана");clsM()},onError:(e:any)=>toast.error(e.response?.data?.error||"Ошибка")});
  const upm=useMutation({mutationFn:({id,data}:{id:string;data:any})=>rolesAPI.update(id,data),onSuccess:()=>{queryClient.invalidateQueries({queryKey:["roles-company"]});toast.success("Роль обновлена");clsM()},onError:(e:any)=>toast.error(e.response?.data?.error||"Ошибка")});
  const dm=useMutation({mutationFn:(id:string)=>rolesAPI.delete(id),onSuccess:()=>{queryClient.invalidateQueries({queryKey:["roles-company"]});toast.success("Роль архивирована")},onError:(e:any)=>toast.error(e.response?.data?.error||"Ошибка")});
  const clsM=()=>{setShow(false);setEid(null);setFrm({name:"",description:"",permissions:[]})};
  const oc=()=>{setEid(null);setFrm({name:"",description:"",permissions:[]});setShow(true)};
  const oe=(role:any)=>{setEid(role.id);setFrm({name:role.name,description:role.description||"",permissions:decodePermissions(role.permissions)});setShow(true)};
  const hs=(e:React.FormEvent)=>{e.preventDefault();if(!frm.name){toast.error("Введите название роли");return}eid?upm.mutate({id:eid,data:frm}):cm.mutate(frm)};
  const tp=(perm:string)=>setFrm(p=>({...p,permissions:p.permissions.includes(perm)?p.permissions.filter(x=>x!==perm):[...p.permissions,perm]}));
  const tg=(gk:string,perms:string[],v:boolean)=>setFrm(p=>{const w=p.permissions.filter(x=>!perms.map(pp=>gk+":"+pp).includes(x));return{...p,permissions:v?[...w,...perms.map(pp=>gk+":"+pp)]:w}});
  const igf=(gk:string,perms:string[])=>perms.every(p=>frm.permissions.includes(gk+":"+p));
  const igp=(gk:string,perms:string[])=>!igf(gk,perms)&&perms.some(p=>frm.permissions.includes(gk+":"+p));
  return (<div>
    <div className="flex items-center justify-between mb-4"><p className="text-sm text-gray-500">Управление ролями и правами доступа сотрудников</p><button onClick={oc} className="flex items-center gap-2 text-sm px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-4 h-4"/>Новая роль</button></div>
    {show&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={clsM}><div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
      <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10"><h2 className="text-lg font-semibold text-gray-900">{eid?"Редактировать роль":"Новая роль"}</h2><button onClick={clsM} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button></div>
      <form onSubmit={hs} className="p-6 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Название роли <span className="text-red-500">*</span></label><input value={frm.name} onChange={e=>setFrm({...frm,name:e.target.value})} placeholder="Например: Менеджер" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" required/></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Описание</label><input value={frm.description} onChange={e=>setFrm({...frm,description:e.target.value})} placeholder="Краткое описание" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/></div></div>
        <div className="border-t pt-4"><h3 className="text-sm font-semibold text-gray-700 mb-3">Права доступа</h3><div className="grid grid-cols-2 gap-2">{PERMISSION_GROUPS.map(g=>{const full=igf(g.key,g.perms);const part=igp(g.key,g.perms);return(<div key={g.key} className="border border-gray-200 rounded-lg p-3"><label className="flex items-center gap-2 mb-2 cursor-pointer"><input type="checkbox" checked={full} ref={el=>{if(el)el.indeterminate=part&&!full}} onChange={()=>tg(g.key,g.perms,!full)} className="rounded"/><span className="text-sm font-medium text-gray-700">{g.label}</span></label><div className="flex flex-wrap gap-1.5 ml-5">{g.perms.map(p=>{const k=g.key+":"+p;return(<label key={k} className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={frm.permissions.includes(k)} onChange={()=>tp(k)} className="rounded text-xs"/><span className="text-xs text-gray-500">{PERM_LABELS[p]}</span></label>)})}</div></div>)})}</div></div>
        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white py-2 border-t border-gray-100"><button type="button" onClick={clsM} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button><button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">{eid?"Сохранить":"Создать роль"}</button></div></form>
    </div></div>)}
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Роль</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Описание</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Сотрудников</th><th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Прав</th><th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase"></th></tr></thead><tbody className="divide-y divide-gray-100">
      {isLoading?<tr><td colSpan={5} className="text-center py-8 text-gray-400">Загрузка...</td></tr>
      :(roles||[]).length===0?<tr><td colSpan={5} className="text-center py-8 text-gray-400">Нет ролей. Создайте первую.</td></tr>
      :(roles||[]).map((role:any)=>{const perms=decodePermissions(role.permissions);const pg=PERMISSION_GROUPS.filter(g=>g.perms.some(p=>perms.includes(g.key+":"+p))).length;const uc=ucr[role.id]||role._count?.users||0;return(<tr key={role.id} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3"><p className="text-sm font-semibold text-gray-800">{role.name}</p><div className="flex flex-wrap gap-1 mt-1">{PERMISSION_GROUPS.filter(g=>g.perms.some(p=>perms.includes(g.key+":"+p))).slice(0,4).map(g=><span key={g.key} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{g.label}</span>)}{pg>4&&<span className="text-[10px] text-gray-400">+{pg-4}</span>}</div></td><td className="px-4 py-3 text-sm text-gray-500">{role.description||"—"}</td><td className="px-4 py-3 text-center text-sm font-medium text-gray-700">{uc}</td><td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">{pg}/{PERMISSION_GROUPS.length}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><button onClick={()=>oe(role)} className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">Ред.</button><button onClick={()=>{if(confirm("Архивировать роль \""+role.name+"\"?"))dm.mutate(role.id)}} className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">Арх.</button></div></td></tr>)})}
    </tbody></table></div>
  </div>);
}
