import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useT } from "../i18n";
import { Button } from "../components/ui/button";
import { Check, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function Pricing() {
  const { lang, user, api, authHeader } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);

  const buy = async (pkg) => {
    if (!user) return navigate("/register");
    if (pkg === "free") return navigate("/dashboard");
    setBusy(pkg);
    try {
      const r = await api.post("/payments/checkout", { package_id: pkg, origin_url: window.location.origin }, { headers: authHeader() });
      window.location.href = r.data.checkout_url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Checkout error");
      setBusy(null);
    }
  };

  const plans = [
    { id: "free", name: t("free_name"), price: t("free_price"), period: "", feats: [t("free_feat_1"), t("free_feat_2"), t("free_feat_3")], cta: t("get_started") },
    { id: "monthly", name: t("monthly_name"), price: t("monthly_price"), period: t("per_month"), feats: [t("monthly_feat_1"), t("monthly_feat_2"), t("monthly_feat_3"), t("monthly_feat_4")], cta: t("subscribe"), hot: true },
    { id: "single", name: t("single_name"), price: t("single_price"), period: t("one_time"), feats: [t("single_feat_1"), t("single_feat_2"), t("single_feat_3")], cta: t("buy_once") },
  ];

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-20">
      <div className="absolute inset-0 neon-grid opacity-10 pointer-events-none" />
      <div className="relative mb-14 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-4">{t("nav_pricing")}</p>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight mb-4">{t("pricing_title")}</h1>
        <p className="text-zinc-400 text-lg">{t("pricing_sub")}</p>
      </div>

      <div className="relative grid md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} data-testid={`plan-${p.id}`}
            className={`relative p-8 flex flex-col bg-[#121214] border ${p.hot ? "border-cyan-400 cyber-glow md:-translate-y-3" : "border-white/10"}`}>
            {p.hot && <span className="absolute -top-3 start-6 bg-[#00E5FF] text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1">{t("popular")}</span>}
            <h3 className="font-display text-lg font-semibold mb-6">{p.name}</h3>
            <div className="flex items-baseline gap-2 mb-8">
              <span className={`font-display text-5xl font-black ${p.hot ? "text-cyber" : ""}`}>{p.price}</span>
              <span className="text-sm text-zinc-500">{p.period}</span>
            </div>
            <ul className="space-y-3 mb-10 flex-1">
              {p.feats.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button onClick={() => buy(p.id)} disabled={busy === p.id || (p.id === "free" && user?.free_used)}
              className={`h-12 w-full ${p.hot ? "btn-cyber" : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"}`}
              data-testid={`plan-${p.id}-btn`}>
              {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : p.id === "free" && user?.free_used ? t("free_used") : p.cta}
            </Button>
          </div>
        ))}
      </div>

      <div className="relative mt-10 flex items-center gap-3 text-sm text-zinc-500">
        <CreditCard className="w-4 h-4" />
        {lang === "ar" ? "دفع آمن عبر Stripe — بطاقة بنكية، Apple Pay، Google Pay" : "Secure payment via Stripe — Card, Apple Pay, Google Pay"}
      </div>
    </div>
  );
}
