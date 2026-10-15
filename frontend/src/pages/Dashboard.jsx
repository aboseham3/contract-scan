import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useT } from "../i18n";
import { Button } from "../components/ui/button";
import UploadZone from "../components/UploadZone";
import { toast } from "sonner";
import { FileText, Zap, ChevronLeft, ChevronRight } from "lucide-react";

const riskColor = { low: "text-[#00E676] border-[#00E676]/40", medium: "text-[#FF9900] border-[#FF9900]/40", high: "text-[#FF3366] border-[#FF3366]/40" };

const totalCredits = (u) =>
  (u?.subscription_active ? u.subscription_credits || 0 : 0) + (u?.single_credits || 0) + (u?.free_used ? 0 : 1);

export default function Dashboard() {
  const { lang, user, setUser, api, authHeader } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const Chevron = lang === "ar" ? ChevronLeft : ChevronRight;

  useEffect(() => {
    api.get("/analyses", { headers: authHeader() }).then((r) => setHistory(r.data)).catch(() => {});
  }, [api, authHeader]);

  const analyze = async (files) => {
    if (totalCredits(user) <= 0) {
      toast.error(t("no_credits_msg"));
      return navigate("/pricing");
    }
    setAnalyzing(true);
    try {
      const r = await api.post(
        "/analyze",
        { language: lang, files: files.map((f) => ({ mime_type: f.mime_type, base64_data: f.data })) },
        { headers: authHeader(), timeout: 300000 }
      );
      setUser(r.data.user);
      navigate(`/analysis/${r.data.analysis.analysis_id}`);
    } catch (e) {
      const d = e?.response?.data?.detail;
      if (d === "no_credits") { toast.error(t("no_credits_msg")); navigate("/pricing"); }
      else if (d === "max_pages") toast.error(t("max_3_files"));
      else toast.error(d || "Error");
    } finally {
      setAnalyzing(false);
    }
  };

  const credits = totalCredits(user);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 mb-8">
        <div className="bg-[#0A0A0B] p-6 md:col-span-2">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">{lang === "ar" ? "مرحباً" : "Welcome"}</p>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight" data-testid="dashboard-username">{user?.name}</h1>
        </div>
        <div className="bg-[#0A0A0B] p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">{t("credits_label")}</p>
            <p className="font-display text-4xl font-black text-cyber" data-testid="credits-count">{credits}</p>
            {user?.subscription_active && (
              <p className="text-xs text-zinc-500 mt-1" data-testid="subscription-status">{t("monthly_name")} · {new Date(user.subscription_expires_at).toLocaleDateString()}</p>
            )}
          </div>
          <Button onClick={() => navigate("/pricing")} className="btn-cyber" data-testid="buy-more-btn">
            <Zap className="w-4 h-4 me-1" /> {t("buy_more")}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <UploadZone t={t} onAnalyze={analyze} analyzing={analyzing} />
        </div>
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-4">{t("history")}</h2>
          {history.length === 0 ? (
            <div className="border border-dashed border-white/10 p-10 text-center text-zinc-500 text-sm" data-testid="no-history">{t("no_history")}</div>
          ) : (
            <div className="space-y-2" data-testid="history-list">
              {history.map((a) => (
                <button key={a.analysis_id} onClick={() => navigate(`/analysis/${a.analysis_id}`)}
                  className="w-full text-start border border-white/10 bg-[#121214] p-4 flex items-center gap-4 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(0,229,255,0.15)] transition-[border-color,box-shadow] duration-300"
                  data-testid={`history-item-${a.analysis_id}`}>
                  <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-zinc-500">{a.contract_type} · {new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 ${riskColor[a.overall_risk] || riskColor.medium}`}>{t(`risk_${a.overall_risk}`)}</span>
                  <Chevron className="w-4 h-4 text-zinc-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
