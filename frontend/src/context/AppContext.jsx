import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "ar");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  useEffect(() => {
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("lang", lang);
  }, [lang]);

  const authHeader = useCallback(() => {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  const api = useMemo(() => axios.create({ baseURL: API, withCredentials: true }), []);

  const fetchMe = useCallback(async () => {
    try {
      const r = await api.get("/auth/me", { headers: authHeader() });
      setUser(r.data);
      return r.data;
    } catch (e) {
      setUser(null);
      return null;
    }
  }, [api, authHeader]);

  useEffect(() => {
    // Skip auth check if returning from OAuth
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  const loginEmail = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const registerEmail = async (email, password, name) => {
    const r = await api.post("/auth/register", { email, password, name });
    localStorage.setItem("token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const processGoogleSession = async (sessionId) => {
    const r = await api.post("/auth/google/session", { session_id: sessionId });
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout", {}, { headers: authHeader() }); } catch {}
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AppContext.Provider
      value={{ lang, setLang, user, setUser, loading, api, authHeader, token,
               loginEmail, registerEmail, processGoogleSession, logout, fetchMe }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
