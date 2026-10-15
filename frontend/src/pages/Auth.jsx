import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useT } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Scan, Mail, Lock, User as UserIcon } from "lucide-react";

export default function Auth({ mode = "login" }) {
  const { lang, loginEmail, registerEmail } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await loginEmail(email, password);
      else await registerEmail(email, password, name);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || (mode === "login" ? "Login failed" : "Register failed"));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-e border-white/10">
        <div className="absolute inset-0 neon-grid opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent" />
        <div className="relative p-16 flex flex-col justify-between">
          <div className="w-12 h-12 bg-[#00E5FF] text-black flex items-center justify-center rounded-sm cyber-glow">
            <Scan className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-6">{t("app_name")}</p>
            <h2 className="font-display text-4xl font-bold tracking-tight leading-tight mb-4">
              {lang === "ar" ? "ذكاء قانوني في ثوان." : "Legal intelligence in seconds."}
            </h2>
            <p className="text-zinc-400">{t("tagline")}</p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-bold mb-8 tracking-tight">{mode === "login" ? t("login_title") : t("register_title")}</h1>

          <form onSubmit={submit} className="space-y-5" data-testid="auth-form">
            {mode === "register" && (
              <div>
                <Label className="text-xs uppercase tracking-widest text-zinc-400 mb-2 block">{t("name")}</Label>
                <div className="relative">
                  <UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} required className="ps-10 h-12 bg-[#121214] border-white/10 rounded-sm" data-testid="name-input" />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs uppercase tracking-widest text-zinc-400 mb-2 block">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="ps-10 h-12 bg-[#121214] border-white/10 rounded-sm" data-testid="email-input" />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest text-zinc-400 mb-2 block">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="ps-10 h-12 bg-[#121214] border-white/10 rounded-sm" data-testid="password-input" />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="btn-cyber w-full h-12" data-testid="auth-submit">
              {loading ? "..." : (mode === "login" ? t("login_btn") : t("register_btn"))}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-widest text-zinc-500">{t("or")}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Button variant="outline" onClick={googleLogin} className="w-full h-12 border-white/10 bg-[#121214] hover:bg-white/5" data-testid="google-login">
            <svg className="w-5 h-5 me-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t("continue_google")}
          </Button>

          <p className="text-center text-sm text-zinc-500 mt-6">
            {mode === "login" ? t("no_account") : t("have_account")}{" "}
            <button
              onClick={() => navigate(mode === "login" ? "/register" : "/login")}
              className="text-cyan-400 hover:text-cyan-300"
              data-testid="switch-auth"
            >
              {mode === "login" ? t("nav_register") : t("nav_login")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
