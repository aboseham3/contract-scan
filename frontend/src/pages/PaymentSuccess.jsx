import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useT } from "../i18n";
import { Button } from "../components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { lang, api, fetchMe } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();
  const [state, setState] = useState("checking");

  useEffect(() => {
    const sid = params.get("session_id");
    if (!sid) return setState("failed");
    let tries = 0;
    let timer;
    const poll = async () => {
      try {
        const r = await api.get(`/payments/status/${sid}`);
        if (r.data.payment_status === "paid") {
          await fetchMe();
          return setState("paid");
        }
        if (["expired", "failed"].includes(r.data.payment_status)) return setState("failed");
      } catch {}
      if (++tries < 15) timer = setTimeout(poll, 2000);
      else setState("failed");
    };
    poll();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full border border-white/10 bg-[#121214] p-10 text-center" data-testid="payment-status">
        {state === "checking" && (<><Loader2 className="w-12 h-12 mx-auto animate-spin text-cyan-400 mb-6" /><p className="text-zinc-400">{t("verifying_payment")}</p></>)}
        {state === "paid" && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-[#00E676] mb-6" />
            <h1 className="font-display text-2xl font-bold mb-2" data-testid="payment-success-title">{t("payment_success")}</h1>
            <p className="text-zinc-400 mb-8">{t("payment_success_sub")}</p>
            <Button className="btn-cyber w-full h-12" onClick={() => navigate("/dashboard")} data-testid="go-dashboard-btn">{t("go_to_dashboard")}</Button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="w-14 h-14 mx-auto text-[#FF3366] mb-6" />
            <h1 className="font-display text-2xl font-bold mb-8">{lang === "ar" ? "لم يكتمل الدفع" : "Payment not completed"}</h1>
            <Button className="btn-cyber w-full h-12" onClick={() => navigate("/pricing")} data-testid="back-pricing-btn">{t("nav_pricing")}</Button>
          </>
        )}
      </div>
    </div>
  );
}
