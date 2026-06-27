import React, { useState, useRef } from "react";
import { authAPI } from "../api";
import toast from "react-hot-toast";
import { X, Camera, Save, User, Building2, Briefcase, Phone, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileModal({ user, onClose }: { user: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    department: user?.department || "",
    position: user?.position || "",
    bio: user?.bio || "",
  });
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await authAPI.uploadAvatar(file);
      setAvatar(res.data.avatar);
      toast.success("Фото обновлено");
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    } catch {
      toast.error("Ошибка загрузки");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(form);
      toast.success("Профиль сохранён");
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      onClose();
    } catch {
      toast.error("Ошибка сохранения");
    }
    setSaving(false);
  };

  const initials = `${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 px-6 pt-8 pb-6">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="relative group mb-3">
              {avatar ? (
                <img src={avatar} className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {initials || "?"}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? (
                  <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <h2 className="text-lg font-bold text-white">{form.firstName} {form.lastName}</h2>
            <p className="text-sm text-white/70">{user?.email}</p>
            <span className="mt-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-medium">{user?.role?.name || ""}</span>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase mb-1"><User className="w-3 h-3" />Имя</label>
              <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase mb-1"><User className="w-3 h-3" />Фамилия</label>
              <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase mb-1"><Phone className="w-3 h-3" />Телефон</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="+7 (999) 123-45-67"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase mb-1"><Building2 className="w-3 h-3" />Отдел</label>
              <input value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                placeholder="Отдел продаж"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase mb-1"><Briefcase className="w-3 h-3" />Должность</label>
              <input value={form.position} onChange={e => setForm({...form, position: e.target.value})}
                placeholder="Менеджер"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-[10px] font-medium text-gray-500 uppercase mb-1"><FileText className="w-3 h-3" />О себе</label>
            <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
              placeholder="Расскажите о себе..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
