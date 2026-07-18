import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authAPI } from "../api";
import toast from "react-hot-toast";
import { Loader2, User, Lock, Mail, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

const EMAIL_DOMAIN = "nik12m.ru";

export default function RegisterPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"loading" | "invalid" | "expired" | "used" | "form" | "success">("loading");
  const [invite, setInvite] = useState<any>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setStep("invalid");
      return;
    }
    authAPI.getInvite(token).then((data: any) => {
      setInvite(data);
      setStep("form");
    }).catch((err: any) => {
      if (err.response?.status === 410) {
        const msg = err.response?.data?.error || "";
        setStep(msg.includes("expired") ? "expired" : "used");
      } else {
        setStep("invalid");
      }
    });
  }, [token]);

  const handleRegister = async () => {
    if (!login.trim()) { toast.error("Введите логин"); return; }
    if (login.length < 3) { toast.error("Логин должен быть не менее 3 символов"); return; }
    if (!/^[a-z0-9._-]+$/.test(login)) { toast.error("Логин может содержать только латинские буквы, цифры, точки, дефисы и подчёркивания"); return; }
    if (!password) { toast.error("Введите пароль"); return; }
    if (password.length < 6) { toast.error("Пароль должен быть не менее 6 символов"); return; }
    if (password !== passwordConfirm) { toast.error("Пароли не совпадают"); return; }

    setRegistering(true);
    try {
      const result = await authAPI.registerWithInvite(token!, { login, password });
      setRegisteredUser(result);
      setStep("success");
      localStorage.setItem("token", result.token);
      toast.success("Регистрация успешна!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Ошибка регистрации");
    } finally {
      setRegistering(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center"><Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Загрузка приглашения...</p></div>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-slate-700/50">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-red-400" /></div>
          <h2 className="text-xl font-bold text-white mb-2">Приглашение не найдено</h2>
          <p className="text-gray-400 text-sm mb-6">Ссылка недействительна или срок её действия истёк. Обратитесь к администратору за новым приглашением.</p>
        </div>
      </div>
    );
  }

  if (step === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-slate-700/50">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-amber-400" /></div>
          <h2 className="text-xl font-bold text-white mb-2">Приглашение истекло</h2>
          <p className="text-gray-400 text-sm mb-6">Срок действия ссылки истёк (24 часа). Обратитесь к администратору за новым приглашением.</p>
        </div>
      </div>
    );
  }

  if (step === "used") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-slate-700/50">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-blue-400" /></div>
          <h2 className="text-xl font-bold text-white mb-2">Приглашение уже использовано</h2>
          <p className="text-gray-400 text-sm mb-6">Это приглашение уже было активировано. Если вы забыли пароль — обратитесь к администратору.</p>
        </div>
      </div>
    );
  }

  if (step === "success" && registeredUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-slate-700/50">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-400" /></div>
          <h2 className="text-xl font-bold text-white mb-2">Регистрация успешна!</h2>
          <p className="text-gray-300 text-sm mb-1">Добро пожаловать, {registeredUser.user.firstName}!</p>
          <p className="text-gray-400 text-xs mb-6">Ваш email: <span className="text-primary-400 font-mono">{registeredUser.user.email}</span></p>
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-500 transition-all">
            <ArrowRight className="w-4 h-4" /> Перейти в CRM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-700/50">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Завершите регистрацию</h2>
          <p className="text-gray-400 text-sm mt-1">
            {invite ? <span>Добро пожаловать, <strong className="text-gray-200">{invite.firstName} {invite.lastName}</strong></span> : null}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Логин</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={login} onChange={e => setLogin(e.target.value.toLowerCase())}
                placeholder="ivan.petrov" autoFocus
                className="w-full pl-10 pr-24 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-gray-500" />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">@{EMAIL_DOMAIN}</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Только латинские буквы, цифры, точки, дефисы и подчёркивания</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Не менее 6 символов"
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Подтвердите пароль</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="Повторите пароль"
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-gray-500" />
            </div>
          </div>

          <button onClick={handleRegister} disabled={registering}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {registering ? "Регистрация..." : "Зарегистрироваться"}
          </button>

          <p className="text-center text-[10px] text-gray-600">
            При регистрации будет создан email: <span className="text-primary-400 font-mono">{login || "login"}@{EMAIL_DOMAIN}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
