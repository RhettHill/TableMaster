import { HelmetProvider } from "react-helmet-async";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "./services/supabase";
import { useAuthStore } from "./store/AuthStore";

export default function App() {
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    // Initialize auth once from the local session (no network call)
    supabase.auth.getSession().then(({ data }) => {
      setAuth(data.session?.user ?? null, data.session ?? null);
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuth(session?.user ?? null, session ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [setAuth]);

  return (
    <div>
      <HelmetProvider>
        <Outlet />
      </HelmetProvider>
    </div>
  );
}
