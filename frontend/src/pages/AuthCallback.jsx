import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { processGoogleSession } = useApp();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login");
      return;
    }
    const sessionId = match[1];
    // Clear hash
    window.history.replaceState({}, document.title, window.location.pathname);
    processGoogleSession(sessionId)
      .then(() => navigate("/dashboard"))
      .catch(() => navigate("/login"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 uppercase tracking-widest text-xs">Authenticating...</p>
      </div>
    </div>
  );
}
