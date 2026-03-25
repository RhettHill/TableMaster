// store/authStore.ts
import { create } from "zustand";
import { supabase } from "../services/supabase";

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  setAuth: (user: any, session: any) => void;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setAuth: (user, session) => set({ user, session, loading: false }),
  refreshSession: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session ?? null,
      user: data.session?.user ?? null,
      loading: false,
    });
  },
}));
