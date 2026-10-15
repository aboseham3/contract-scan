import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AppProvider, useApp } from "./context/AppContext";
import Nav from "./components/Nav";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";

const Protected = ({ children }) => {
  const { user, loading } = useApp();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

const GuestOnly = ({ children }) => {
  const { user, loading } = useApp();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Auth mode="login" /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Auth mode="register" /></GuestOnly>} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/analysis/:id" element={<Protected><Analysis /></Protected>} />
        <Route path="/payment/success" element={<Protected><PaymentSuccess /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <div className="App">
      <AppProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
        <Toaster theme="dark" position="top-center" />
      </AppProvider>
    </div>
  );
}
