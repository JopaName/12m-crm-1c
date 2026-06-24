import React, { useNavigate, useSearchParams, useState } from "react";;
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { referralAPI } from "../api";
import toast from "react-hot-toast";
import { UserPlus, Shield, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refCode = searchParams.get("ref") || "";
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });

  const registerMutation = useMutation({
    mutationFn: (data: any) => referralAPI.register(data),
    onSuccess: (res: any) => {
      const token = res.data?.token || res.token;
      if (token) {
        localStorage.setItem("token", token);
        toast.success("Регистрация успешна! Добро пожаловать в команду.");
        setTimeout(() => navigate("/"), 1000);
      } else {
        toast.success("Регистрация успешна! Теперь вы можете войти.");
        setTimeout(() => navigate("/login"), 1500);
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Ошибка регистрации"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCode) { toast.error("Отсутствует реферальный код"); return; }
    registerMutation.mutate({ ...form, referralCode: refCode });
  };

  if (!refCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Доступ только по приглашению</h1>
          <p className="text-sm text-gray-500 mb-4">Регистрация в системе возможна только по реферальной ссылке от действующего менеджера.</p>
          <button onClick={() => navigate("/login")} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">На страницу входа</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Регистрация в 12M CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Вы приглашены в команду. Заполните данные для входа.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Имя *"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              required
              autoFocus
            />
            <input
              placeholder="Фамилия"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <input
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            required
          />
          <input
            type="password"
            placeholder="Пароль *"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            required
            minLength={6}
          />
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Код приглашения: <span className="font-mono text-primary-600">{refCode.slice(0, 8)}...</span>
          </div>
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {registerMutation.isPending ? "Регистрация..." : "Зарегистрироваться"}
            {!registerMutation.isPending && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Уже есть аккаунт?{" "}
          <button onClick={() => navigate("/login")} className="text-primary-600 hover:underline">Войти</button>
        </p>
      </div>
    </div>
  );
}