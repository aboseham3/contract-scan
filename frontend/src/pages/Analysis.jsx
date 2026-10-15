import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useT } from "../i18n";
import { Button } from "../components/ui/button";
import { AlertTriangle, ShieldAlert, Info, CheckCircle2, Download, ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const sev = {
  danger: { c: "#FF3366", I: ShieldAlert },
  warning: { c: "#FF9900", I: AlertTriangle },
  info: { c: "#00E5FF", I: Info },
};
const riskMeta = { low: { c: "#00E676", v: 25 }, medium: { c: "#FF9900", v: 60 }, high: { c: "#FF3366", v: 90 } };

const Item = ({ item, t, i, prefix }) => {
  const s = sev[item.severity] || sev.info;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
      className="border border-white/10 bg-[#121214] p-5 border-s-2" style={{ borderInlineStartColor: s.c }}
      data-testid={`${prefix}-${i}`}>
      <div className="flex items-start gap-3">
        <s.I className="w-5 h-5 shrink-0 mt-0.5" style={{ color: s.c }} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold">{item.title}</h4>
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 border" style={{ color: s.c, borderColor: `${s.c}55` }}>{t(`severity_${item.severity}`)}</span>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default function Analysis() {
  const { id } = useParams();
  const { lang, api, authHeader } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();
  const [a, setA] = useState(null);
  const [exporting, setExporting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api.get(`/analyses/${id}`, { headers: authHeader() }).then((r) => setA(r.data)).catch(() => navigate("/dashboard"));
  }, [id]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: "#0A0A0B", scale: 2, useCORS: true });
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * w) / canvas.width;
      const img = canvas.toDataURL("image/jpeg", 0.92);
      let left = imgH, pos = 0;
      pdf.addImage(img, "JPEG", 0, pos, w, imgH);
      left -= h;
      while (left > 0) {
        pos -= h;
        pdf.addPage();
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, w, h, "F");
        pdf.addImage(img, "JPEG", 0, pos, w, imgH);
        left -= h;
      }
      pdf.save(`contract-analysis-${id}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (!a) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;
  const rm = riskMeta[a.overall_risk] || riskMeta.medium;
  const dir = a.language === "ar" ? "rtl" : "ltr";

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} data-testid="back-dashboard-btn">
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" /> {t("back_dashboard")}
        </Button>
        <Button onClick={exportPdf} disabled={exporting} className="btn-cyber" data-testid="export-pdf-btn">
          {exporting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Download className="w-4 h-4 me-2" />} {t("export_pdf")}
        </Button>
      </div>

      <div ref={ref} dir={dir} className="bg-[#0A0A0B] p-2 sm:p-6" data-testid="analysis-report">
        <div className="grid md:grid-cols-3 gap-px bg-white/10 border border-white/10 mb-8">
          <div className="bg-[#0A0A0B] p-6 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-2">{t("analysis_title")} · {a.contract_type}</p>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mb-4" data-testid="analysis-title">{a.title}</h1>
            <p className="text-zinc-300 leading-relaxed" data-testid="analysis-summary">{a.summary}</p>
          </div>
          <div className="bg-[#0A0A0B] p-6 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">{t("overall_risk")}</p>
            <p className="font-display text-4xl font-black mb-4" style={{ color: rm.c }} data-testid="overall-risk">{t(`risk_${a.overall_risk}`)}</p>
            <div className="h-2 bg-white/5 w-full">
              <motion.div initial={{ width: 0 }} animate={{ width: `${rm.v}%` }} transition={{ duration: 1 }} className="h-full" style={{ background: rm.c, boxShadow: `0 0 12px ${rm.c}` }} />
            </div>
          </div>
        </div>

        {a.hidden_clauses?.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2 text-[#FF3366]"><ShieldAlert className="w-5 h-5" /> {t("hidden_clauses")}</h2>
            <div className="grid md:grid-cols-2 gap-3">{a.hidden_clauses.map((c, i) => <Item key={i} item={c} t={t} i={i} prefix="hidden-clause" />)}</div>
          </section>
        )}

        {a.key_points?.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-cyan-400" /> {t("key_points")}</h2>
            <div className="grid md:grid-cols-2 gap-3">{a.key_points.map((c, i) => <Item key={i} item={c} t={t} i={i} prefix="key-point" />)}</div>
          </section>
        )}

        {a.recommendations?.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2 text-[#00E676]"><CheckCircle2 className="w-5 h-5" /> {t("recommendations")}</h2>
            <ol className="space-y-2">
              {a.recommendations.map((r, i) => (
                <li key={i} className="flex gap-4 border border-white/10 bg-[#121214] p-4" data-testid={`recommendation-${i}`}>
                  <span className="font-mono text-[#00E676] text-sm">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-zinc-300 text-sm leading-relaxed">{r}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
