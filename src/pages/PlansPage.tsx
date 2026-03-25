import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  storage_limit: number; // in bytes
  max_file_size: number; // in bytes
  price_monthly: number;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + " GB";
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price_monthly", { ascending: true });
      if (error) {
        console.error(error);
        setPlans([]);
      } else {
        setPlans(data ?? []);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* Nav */}
      <nav className="relative z-10 border-b border-white/6 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/")}
              className="text-white font-bold tracking-wide flex items-center gap-2.5"
            >
              <span className="text-amber-500">⚔</span>
              TableMaster
            </button>
            <button
              onClick={() => navigate("/plans")}
              className="ml-6 text-amber-400 text-sm font-semibold transition-colors"
            >
              Plans
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 border-b border-white/6">
        <h1 className="text-4xl font-bold text-white leading-tight mb-2">
          Plans
        </h1>
        <p className="text-stone-500 text-sm max-w-md">
          Explore our subscription plans and their features. Pick the plan that
          fits your tabletop adventures.
        </p>
      </div>

      {/* Plans grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-stone-500 text-sm">Loading plans…</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-stone-600 text-sm">
            No plans available
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="group relative rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/6 flex flex-col gap-2">
                  <h2 className="text-white/90 font-bold text-lg">
                    {plan.name}
                  </h2>
                  <p className="text-stone-500 text-xs">
                    ${plan.price_monthly.toFixed(2)}/month
                  </p>
                </div>

                {/* Body */}
                <div className="flex-1 px-5 py-4 flex flex-col gap-2 text-stone-400 text-xs">
                  <p>Storage: {formatBytes(plan.storage_limit)}</p>
                  <p>Max file size: {formatBytes(plan.max_file_size)}</p>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/6 flex items-center justify-end">
                  <button
                    onClick={() => alert(`Selected plan: ${plan.name}`)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all"
                  >
                    Choose
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
