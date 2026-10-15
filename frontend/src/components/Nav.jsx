import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useT } from "../i18n";
import { Scan, LogOut, LayoutDashboard, Tag, Globe } from "lucide-react";
import { Button } from "./ui/button";

export default function Nav() {
  const { user, lang, setLang, logout } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0B]/70 border-b border-white/10 backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-9 h-9 bg-[#00E5FF] text-black flex items-center justify-center rounded-sm cyber-glow">
            <Scan className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">{t("app_name")}</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            data-testid="lang-toggle"
            className="text-xs uppercase tracking-widest"
          >
            <Globe className="w-4 h-4 me-1" />
            {lang === "ar" ? "EN" : "عربي"}
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="nav-dashboard">
                <LayoutDashboard className="w-4 h-4 me-1" /> {t("nav_dashboard")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} data-testid="nav-pricing">
                <Tag className="w-4 h-4 me-1" /> {t("nav_pricing")}
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { await logout(); navigate("/"); }} data-testid="nav-logout" className="border-cyber">
                <LogOut className="w-4 h-4 me-1" /> {t("nav_logout")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} data-testid="nav-pricing">{t("nav_pricing")}</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")} data-testid="nav-login">{t("nav_login")}</Button>
              <Button size="sm" className="btn-cyber" onClick={() => navigate("/register")} data-testid="nav-register">{t("nav_register")}</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
