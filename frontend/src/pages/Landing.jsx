import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useT } from "../i18n";
import { Button } from "../components/ui/button";
import { Scan, FileText, AlertTriangle, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Landing() {
  const { lang, user } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();

  const features = [
    { icon: Scan, title: lang === "ar" ? "مسح فوري" : "Instant Scan", desc: lang === "ar" ? "امسح العقد بالكاميرا أو ارفع صورة أو PDF." : "Scan with camera, upload image or PDF." },
    { icon: AlertTriangle, title: lang === "ar" ? "كشف البنود المخفية" : "Hidden Clauses", desc: lang === "ar" ? "الذكاء الاصطناعي يستخرج الغرامات والفخاخ المخفية." : "AI extracts penalties and hidden traps." },
    { icon: ShieldAlert, title: lang === "ar" ? "تقييم المخاطر" : "Risk Scoring", desc: lang === "ar" ? "تقييم فوري للمخاطر مع توصيات عملية." : "Instant risk score with practical recommendations." },
    { icon: FileText, title: lang === "ar" ? "تقرير PDF" : "PDF Report", desc: lang === "ar" ? "صدّر التحليل كتقرير PDF منسّق واحتفظ به." : "Export analysis as formatted PDF." },
  ];

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 neon-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0B]/40 to-[#0A0A0B]" />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 lg:pt-32 lg:pb-40">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded-full text-xs uppercase tracking-widest text-cyan-400 mb-8" data-testid="hero-badge">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" /> {t("hero_badge")}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              {lang === "ar" ? (
                <>
                  <span className="block">كشف البنود المخفية</span>
                  <span className="text-cyber block">قبل أن توقّع.</span>
                </>
              ) : (
                <>
                  <span className="block">Reveal hidden clauses</span>
                  <span className="text-cyber block">before you sign.</span>
                </>
              )}
            </h1>

            <p className="text-lg lg:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
              {t("hero_sub")}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="btn-cyber h-14 px-8 text-base"
                onClick={() => navigate(user ? "/dashboard" : "/register")}
                data-testid="hero-cta"
              >
                {t("get_started")} <ArrowRight className="w-5 h-5 ms-2 rtl:rotate-180" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base border-white/20 hover:bg-white/5"
                onClick={() => navigate("/pricing")}
                data-testid="hero-secondary"
              >
                {t("see_pricing")}
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap gap-6 text-sm text-zinc-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> {lang === "ar" ? "تحليل مجاني بدون بطاقة" : "Free analysis, no card"}</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> {lang === "ar" ? "عربي وإنجليزي" : "Arabic & English"}</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> {lang === "ar" ? "تقرير PDF" : "PDF reports"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
        <div className="mb-16 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-4">{lang === "ar" ? "كيف يعمل" : "How it works"}</p>
          <h2 className="font-display text-3xl lg:text-5xl font-bold tracking-tight">
            {lang === "ar" ? "ذكاء قانوني في جيبك." : "Legal intelligence in your pocket."}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-[#0A0A0B] p-8 hover:bg-[#121214] transition-colors duration-300 group"
              data-testid={`feature-${i}`}
            >
              <div className="w-12 h-12 border border-cyan-500/40 bg-cyan-500/5 flex items-center justify-center mb-6 group-hover:bg-cyan-500/10 transition-colors">
                <f.icon className="w-6 h-6 text-cyan-400" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example contract types */}
      <section className="relative border-t border-white/10 py-24 bg-[#0A0A0B]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-4">{lang === "ar" ? "أي عقد. أي بند." : "Any contract. Any clause."}</p>
              <h2 className="font-display text-3xl lg:text-5xl font-bold tracking-tight mb-6">
                {lang === "ar" ? "من إيجار شقة إلى شراء سيارة." : "From apartment leases to car purchases."}
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                {lang === "ar"
                  ? "عدسة العقود تحلل العقود المالية، العقارية، عقود العمل، عقود الخدمات، والعقود القانونية المعقدة. تحصل على ملخص واضح، قائمة بالبنود الخطيرة، وتوصيات قابلة للتنفيذ."
                  : "ContractLens analyzes financial, real-estate, employment, services, and complex legal contracts. You get a plain-language summary, a list of risky clauses, and actionable recommendations."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { title: lang === "ar" ? "عقد إيجار" : "Lease", risk: "warning", clause: lang === "ar" ? "تجديد تلقائي" : "Auto-renewal" },
                { title: lang === "ar" ? "شراء سيارة" : "Car Purchase", risk: "danger", clause: lang === "ar" ? "استرداد البائع" : "Repossession" },
                { title: lang === "ar" ? "عقد عمل" : "Employment", risk: "warning", clause: lang === "ar" ? "عدم المنافسة" : "Non-compete" },
                { title: lang === "ar" ? "خدمات SaaS" : "SaaS Terms", risk: "info", clause: lang === "ar" ? "تعديل الأسعار" : "Price changes" },
              ].map((c, i) => (
                <div key={i} className="border border-white/10 p-5 hover:border-cyan-500/40 transition-colors">
                  <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{c.title}</div>
                  <div className={`flex items-center gap-2 ${c.risk === "danger" ? "text-[#FF3366]" : c.risk === "warning" ? "text-[#FF9900]" : "text-cyan-400"}`}>
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">{c.clause}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/10 py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl lg:text-5xl font-bold tracking-tight mb-6">
            {lang === "ar" ? "جرّب أول تحليل مجاناً." : "Try your first analysis free."}
          </h2>
          <p className="text-zinc-400 mb-10 text-lg">{lang === "ar" ? "بدون بطاقة. بدون التزام." : "No card. No commitment."}</p>
          <Button size="lg" className="btn-cyber h-14 px-10 text-base" onClick={() => navigate(user ? "/dashboard" : "/register")} data-testid="footer-cta">
            {t("get_started")} <ArrowRight className="w-5 h-5 ms-2 rtl:rotate-180" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-xs text-zinc-600 uppercase tracking-widest">
        {t("footer")}
      </footer>
    </div>
  );
}
