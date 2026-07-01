import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Zap, Shield, BarChart3, Users, Factory } from "lucide-react";
import { cn } from "../components/cn";
import toast from "react-hot-toast";

const STATS = [
  { icon: BarChart3, label: "Контроль производства", desc: "От закупки до монтажа в одном окне" },
  { icon: Shield, label: "Ролевой доступ", desc: "5 уровней прав с гранулярными разрешениями" },
  { icon: Users, label: "Единая CRM", desc: "Клиенты, лиды, воронки и KPI" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Заполните все поля"); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Вход выполнен успешно");
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Ошибка входа");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative overflow-hidden bg-[#080c14] flex-col justify-between p-10 xl:p-14">
        <div className="absolute inset-0 opacity-25" style={{backgroundImage: "radial-gradient(circle at 30% 20%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)"}} />
        <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.5) 1px, rgba(255,255,255,0.5) 2px)"}} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25"><Factory className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-2xl font-bold text-white tracking-tight">12M CRM</h1><p className="text-xs text-primary-400/70 font-medium tracking-[0.15em] uppercase">Enterprise Platform</p></div>
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3">Управляйте<br/><span className="bg-gradient-to-r from-primary-400 to-blue-300 bg-clip-text text-transparent">производством</span></h2>
          <p className="text-gray-400 text-sm max-w-md leading-relaxed">Единая ERP / CRM платформа для производственно-инжинирингового предприятия. От лида до отгрузки - всё в одной системе.</p>
        </div>
        <div className="relative z-10 space-y-3">
          {STATS.map((s, i) => (
            <div key={i} className="flex items-start gap-3 group cursor-default">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors duration-200"><s.icon className="w-4 h-4 text-primary-400" /></div>
              <div><p className="text-sm font-medium text-gray-200">{s.label}</p><p className="text-xs text-gray-500">{s.desc}</p></div>
            </div>
          ))}
        </div>
        <div className="relative z-10 flex items-center gap-6 text-xs text-gray-700"><span>12M Engineering</span><span className="w-1 h-1 rounded-full bg-gray-700" /><span>v2.0</span></div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-[#0d1117] p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25"><Factory className="w-5 h-5 text-white" /></div>
            <h1 className="text-xl font-bold text-white">12M CRM</h1>
          </div>
          <div className="mb-8"><h2 className="text-2xl font-bold text-white mb-1">Вход в систему</h2><p className="text-sm text-gray-500">Используйте учётные данные организации</p></div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <div className={cn("relative rounded-xl border transition-all duration-200", focused === "email" ? "border-primary-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" : "border-gray-800 hover:border-gray-700")}>
                <input type="email" placeholder="admin@company.ru" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} className="w-full px-4 py-3 bg-transparent text-white placeholder-gray-700 outline-none text-sm rounded-xl" autoComplete="off" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Пароль</label>
              <div className={cn("relative rounded-xl border transition-all duration-200", focused === "password" ? "border-primary-500/50 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" : "border-gray-800 hover:border-gray-700")}>
                <input type={showPassword ? "text" : "password"} placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} className="w-full px-4 py-3 pr-12 bg-transparent text-white placeholder-gray-700 outline-none text-sm rounded-xl" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-medium text-sm hover:from-primary-500 hover:to-primary-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 flex items-center justify-center gap-2">
              {loading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <><span>Войти</span><Zap className="w-4 h-4" /></>}
            </button>
          </form>
          <div className="mt-8 flex items-center justify-between text-xs text-gray-700"><div className="flex items-center gap-1.5"><Shield className="w-3 h-3" /><span>Защищённое соединение</span></div><span>12M Engineering</span></div>
        </div>
      </div>
    </div>
  );
}