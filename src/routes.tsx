import { Navigate, useLocation } from "react-router-dom";
import React from "react";
import { useAuthStore } from "./store/AuthStore";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactElement;
}) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const isDeepLink = location.pathname !== "/";
    if (isDeepLink) {
      return (
        <Navigate
          to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          replace
        />
      );
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}
