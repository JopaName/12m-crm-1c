import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { cn } from "../components/cn";
import ProfileModal from "../components/ProfileModal";
import { Plus, Search, X, User, Mail, Phone, Shield, Edit3, Trash2, Copy, QrCode, Check, Link as LinkIcon } from "lucide-react";

const blankInvite = { firstName: "", lastName: "", roleId: "" };
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("ru-RU") : "";

export default function UsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "", roleId: "" });
  const [inviteForm, setInviteForm] = useState(blankInvite);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => authAPI.getUsers().then((r) => r.data) });
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: () => authAPI.getRoles().then((r) => r.data) });

  const roleMap = useMemo(() => { const m: Record<string, string> = {}; roles?.forEach((r: any) => { m[r.id] = r.name; }); return m; }, [roles]);

  const createInviteMutation = useMutation({
    mutationFn: (d: any) => authAPI.createInvite(d),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setInviteResult(data);
      toast.success("Приглашение создано");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка создания приглашения"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => authAPI.updateUser(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Пользователь обновлён"); setEditingId(null); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => authAPI.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Удалён"); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка"),
  });

  const filtered = useMemo(() => {
    let items = users || [];
    if (searchQuery) { const q = searchQuery.toLowerCase(); items = items.filter((u: any) => (u.firstName || "").toLowerCase().includes(q) || (u.lastName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)); }
    return items;
  }, [users, searchQuery]);

  const stats = useMemo(() => {
    let total = 0, admins = 0;
    (users || []).forEach((u: any) => { total++; if (u.role === "Director" || u.role === "Admin") admins++; });
    return { total, admins, regular: total - admins };
  }, [users]);

  const handleCopyLink = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success("Ссылка скопирована");
        return;
      }
    } catch {}
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast.success("Ссылка скопирована");
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteResult(null);
    setInviteForm(blankInvite);
  };

  if (isLoading) return <div className="max-w-7xl mx-auto p-6"><div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded-lg w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5"><User className="w-6 h-6 text-primary-500" />Пользователи</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm"><div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center"><User className="w-4 h-4 text-primary-600" /></div><div><p className="text-lg font-bold text-gray-900">{stats.total}</p><p className="text-[11px] text-gray-500">Всего</p></div></div>
        <div className="bg-white rounded-xl border p-3 flex items-center gap-2.5 shadow-sm bg-amber-50"><Shield className="w-4 h-4 text-amber-600" /><div><p className="text-sm font-bold text-gray-900">{stats.admins}</p><p className="text-[10px] text-gray-500">Админы</p></div></div>
        <div className="bg-white rounded-xl border p-3 flex items-center gap-2.5 shadow-sm bg-gray-50"><User className="w-4 h-4 text-gray-400" /><div><p className="text-sm font-bold text-gray-900">{stats.regular}</p><p className="text-[10px] text-gray-500">Сотрудники</p></div></div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input placeholder="Поиск пользователей..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex-1" />
        <button onClick={() => { setInviteForm(blankInvite); setInviteResult(null); setShowInviteModal(true); }}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"><Plus className="w-3.5 h-3.5" />Пригласить</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-gray-300"><Search className="w-12 h-12 mb-3" /><p className="text-sm text-gray-400">{searchQuery ? "Ничего не найдено" : "Нет пользователей"}</p></div>}
        <div className="divide-y divide-gray-100">
          {filtered.map((u: any) => (
            <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group">
              <button onClick={() => setViewUserId(u.id)} className="shrink-0" title="Профиль">
                {u.avatar ? <img src={u.avatar} className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 hover:border-primary-400 transition-colors" /> : <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0 hover:ring-2 hover:ring-primary-300 transition-all"><span className="text-xs font-bold text-primary-600">{(u.firstName?.[0] || "") + (u.lastName?.[0] || "")}</span></div>}
              </button>
              <div className="flex-1 min-w-0">
                <button onClick={() => setViewUserId(u.id)} className="font-medium text-gray-900 text-sm hover:text-primary-600 hover:underline transition-colors">{u.firstName} {u.lastName}</button>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</span>
                  {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</span>}
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{roleMap[u.roleId] || (typeof u.role === 'object' ? u.role?.name : u.role) || "\u2014"}</span>
                </div>
              </div>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", (u.role?.name || u.role) === "Director" || (u.role?.name || u.role) === "Admin" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>{u.role?.name || u.role || "User"}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditForm({ email: u.email, password: "", firstName: u.firstName, lastName: u.lastName, phone: u.phone || "", roleId: u.roleId || "" }); setEditingId(u.id); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (confirm("Удалить?")) deleteMutation.mutate(u.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeInviteModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><QrCode className="w-4 h-4 text-primary-500" />Пригласить сотрудника</h3>
              <button onClick={closeInviteModal} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            {inviteResult ? (
              <div className="px-5 py-5 space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-700">
                    Приглашение для <strong>{inviteResult.firstName} {inviteResult.lastName}</strong> создано
                  </p>
                </div>

                <div className="flex justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteResult.inviteLink || '')}`}
                    alt="QR код приглашения" className="rounded-xl border border-gray-200 w-[180px] h-[180px]" />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Ссылка для регистрации (действует 24 часа):</p>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-700 truncate flex-1 select-all">{inviteResult.inviteLink}</p>
                    <button onClick={() => handleCopyLink(inviteResult.inviteLink)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg shrink-0 transition-colors" title="Копировать ссылку">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setInviteResult(null); setInviteForm(blankInvite); }}
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    Новое приглашение
                  </button>
                  <button onClick={closeInviteModal}
                    className="flex-1 px-4 py-2.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
                    Готово
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-xs text-gray-500">Введите имя и фамилию сотрудника. Он получит ссылку для самостоятельной регистрации.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Имя <span className="text-red-500">*</span></label><input value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" autoFocus /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Фамилия <span className="text-red-500">*</span></label><input value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Роль</label><select value={inviteForm.roleId} onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Выберите роль</option>{roles?.filter((r: any) => !r.isArchived).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                </div>
                <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex-1" />
                  <button onClick={closeInviteModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
                  <button onClick={() => {
                    if (!inviteForm.firstName.trim() || !inviteForm.lastName.trim() || !inviteForm.roleId) { toast.error("Заполните все обязательные поля"); return; }
                    createInviteMutation.mutate(inviteForm);
                  }} disabled={createInviteMutation.isPending}
                    className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">
                    {createInviteMutation.isPending ? "Создание..." : "Создать приглашение"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary-500" />Редактировать пользователя</h3><button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Имя</label><input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Фамилия</label><input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Телефон</label><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Роль</label><select value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"><option value="">Без роли</option>{roles?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div></div>
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50"><div className="flex-1" /><button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button><button onClick={() => { if (!editForm.email.trim() || !editForm.firstName.trim()) { toast.error("Заполните обязательные поля"); return; } updateMutation.mutate({ id: editingId, data: editForm }); }} disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 shadow-sm">{updateMutation.isPending ? "Сохранение..." : "Сохранить"}</button></div>
          </div>
        </div>
      )}

      {viewUserId && <ProfileModal user={viewUserId === me?.id ? me : null} profileUserId={viewUserId} onClose={() => setViewUserId(null)} />}
    </div>
  );
}
