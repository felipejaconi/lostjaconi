import React, { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy load large dashboard components
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StoreDashboard = lazy(() => import("./pages/StoreDashboard"));

const LoadingFallback = () => (
  <div className="h-full w-full bg-black/20 flex items-center justify-center">
    <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-12 h-12 animate-spin opacity-80" />
  </div>
);

const InactivityReloader = () => {
  useEffect(() => {
    let lastActiveTime = Date.now();
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const checkInactivity = () => {
      if (Date.now() - lastActiveTime > TIMEOUT) {
        window.location.reload();
      }
    };

    let throttleTimer: any = null;
    const updateActivity = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          checkInactivity();
          lastActiveTime = Date.now();
          throttleTimer = null;
        }, 1000); // Only run once per second max
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("touchstart", updateActivity);
    window.addEventListener("scroll", updateActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also check periodically
    const interval = setInterval(checkInactivity, 60000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, []);

  return null;
};

const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string | string[];
}) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" />;
  
  if (role) {
    if (Array.isArray(role)) {
      if (!role.includes(user.role)) return <Navigate to="/" />;
    } else {
      if (user.role !== role) return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
};

const HomeRoute = () => {
  const { user } = useAuth();

  if (user) {
    if (user.role === "admin" || user.role === "armazem") return <Navigate to="/admin" />;
    return <Navigate to="/store" />;
  }

  return <LoginPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <InactivityReloader />
      <Router>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute role={["admin", "armazem"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store/*"
                element={
                  <ProtectedRoute role="loja">
                    <StoreDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}
