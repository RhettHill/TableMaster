import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "./services/supabase";
import React from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactElement;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Preserve the intended destination so we can redirect back after login.
    // Send unauthenticated users to /home (public landing) unless they had a
    // specific deep link (e.g. /invite/abc) in which case /login handles the
    // redirect param so they land back after signing in.
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
