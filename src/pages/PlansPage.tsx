import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  storage_limit: number;
  max_file_size: number;
  price_monthly: number;
  stripe_price_id: string | null;
}

interface Profile {
  plan_id: string | null;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + " GB";
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  trialing: "bg-sky-500/15 border-sky-500/30 text-sky-400",
  canceling: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  past_due: "bg-red-500/15 border-red-500/30 text-red-400",
  inactive: "bg-white/5 border-white/10 text-white/30",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  canceling: "Cancels at period end",
  past_due: "Payment failed",
  inactive: "Inactive",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Handle Stripe redirect back ──────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setToast({
        type: "success",
        message: "🎉 Payment successful! Your plan has been activated.",
      });
      window.history.replaceState({}, "", "/plans");
    } else if (searchParams.get("cancelled") === "true") {
      setToast({
        type: "error",
        message: "Checkout cancelled — you haven't been charged.",
      });
      window.history.replaceState({}, "", "/plans");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Load plans + profile ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [{ data: planRows }, { data: profileRow }] = await Promise.all([
        supabase
          .from("plans")
          .select("*")
          .order("price_monthly", { ascending: true }),
        user
          ? supabase
              .from("profiles")
              .select("plan_id, subscription_status, stripe_subscription_id")
              .eq("id", user.id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      setPlans(planRows ?? []);
      setProfile(profileRow ?? null);
      setLoading(false);
    };
    load();
  }, []);

  // ── Start Stripe Checkout ────────────────────────────────────────────────────
  const handleChoosePlan = async (plan: Plan) => {
    if (!plan.stripe_price_id) {
      setToast({ type: "error", message: "This plan isn't purchasable yet." });
      return;
    }

    setCheckoutLoading(plan.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        navigate("/login?redirect=/plans");
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            planId: plan.id,
            successUrl: `${window.location.origin}/plans?success=true`,
            cancelUrl: `${window.location.origin}/plans?cancelled=true`,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.url)
        throw new Error(data.error || "Checkout failed");

      window.location.href = data.url;
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Something went wrong",
      });
      setCheckoutLoading(null);
    }
  };

  // ── Cancel subscription ──────────────────────────────────────────────────────
  const handleCancelSubscription = async () => {
    setCancelling(true);
    setShowCancelConfirm(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        navigate("/login?redirect=/plans");
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to cancel subscription");

      // Reflect canceling state immediately without a page reload
      setProfile((prev) =>
        prev ? { ...prev, subscription_status: "canceling" } : prev,
      );
      setToast({ type: "success", message: `✓ ${data.message}` });
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setCancelling(false);
    }
  };

  const isCurrentPlan = (plan: Plan) =>
    profile?.plan_id === plan.id &&
    (profile?.subscription_status === "active" ||
      profile?.subscription_status === "canceling");

  const isFree = (plan: Plan) => plan.price_monthly === 0;

  const hasActivePaidSub =
    !!profile?.stripe_subscription_id &&
    (profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing");

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border shadow-2xl text-sm font-medium
          ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Cancel confirmation modal ─────────────────────────────────────────── */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0f0f1c]/98 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-2">
              Cancel subscription?
            </h3>
            <p className="text-stone-400 text-sm leading-relaxed mb-6">
              You'll keep full access to your current plan until the end of your
              billing period. After that, your account will automatically revert
              to the free plan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors"
              >
                Keep subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ───────────────────────────────────────────────────────────────── */}
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
          <button
            onClick={() => navigate("/")}
            className="text-stone-500 hover:text-white text-sm transition-colors"
          >
            ← Back to campaigns
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 border-b border-white/6">
        <h1 className="text-4xl font-bold text-white leading-tight mb-2">
          Plans
        </h1>
        <p className="text-stone-500 text-sm max-w-md">
          Upgrade to unlock more storage, larger file uploads, and premium
          features for your campaigns.
        </p>

        {/* Subscription status + cancel button */}
        {profile?.subscription_status &&
          profile.subscription_status !== "inactive" && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs">Subscription:</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold
                ${STATUS_STYLES[profile.subscription_status] ?? STATUS_STYLES.inactive}`}
                >
                  {STATUS_LABELS[profile.subscription_status] ??
                    profile.subscription_status}
                </span>
              </div>

              {hasActivePaidSub && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs text-stone-500 hover:text-red-400 transition-colors underline underline-offset-2"
                >
                  Cancel subscription
                </button>
              )}

              {profile.subscription_status === "canceling" && (
                <p className="text-xs text-amber-400/70 w-full sm:w-auto">
                  Access continues until the end of your billing period.
                </p>
              )}

              {profile.subscription_status === "past_due" && (
                <p className="text-xs text-red-400/80 w-full sm:w-auto">
                  Your last payment failed — update your payment method to avoid
                  losing access.
                </p>
              )}
            </div>
          )}
      </div>

      {/* ── Plans grid ────────────────────────────────────────────────────────── */}
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
            {plans.map((plan) => {
              const current = isCurrentPlan(plan);
              const isLoading = checkoutLoading === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`group relative rounded-2xl border overflow-hidden flex flex-col transition-all duration-200
                    ${
                      current
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                    }`}
                >
                  {current && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                      {profile?.subscription_status === "canceling"
                        ? "Canceling"
                        : "Current"}
                    </div>
                  )}

                  {/* Header */}
                  <div className="px-5 py-5 border-b border-white/6 flex flex-col gap-1.5">
                    <h2 className="text-white/90 font-bold text-lg pr-16">
                      {plan.name}
                    </h2>
                    <p className="text-stone-400 text-sm">
                      {isFree(plan) ? (
                        <span className="text-white/60 font-semibold">
                          Free
                        </span>
                      ) : (
                        <>
                          <span className="text-white/80 font-bold text-xl">
                            ${plan.price_monthly.toFixed(2)}
                          </span>
                          <span className="text-stone-500 text-xs">
                            {" "}
                            / month
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 px-5 py-4 flex flex-col gap-2.5">
                    <Feature
                      label="Storage"
                      value={formatBytes(plan.storage_limit)}
                    />
                    <Feature
                      label="Max file size"
                      value={formatBytes(plan.max_file_size)}
                    />
                    <Feature
                      label="Campaigns"
                      value={isFree(plan) ? "2" : "Unlimited"}
                    />
                    {!isFree(plan) && (
                      <Feature label="Dynamic Lighting" value="Unlocked" />
                    )}
                  </div>

                  {/* CTA */}
                  <div className="px-5 py-4 border-t border-white/6">
                    {current ? (
                      <div className="w-full py-2 rounded-lg text-center text-amber-400/70 text-sm font-semibold">
                        {profile?.subscription_status === "canceling"
                          ? "Cancels at period end"
                          : "✓ Active plan"}
                      </div>
                    ) : isFree(plan) ? (
                      <div className="w-full py-2 rounded-lg text-center text-white/25 text-sm">
                        Default plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={!!checkoutLoading}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm
                          font-semibold transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50
                          disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Redirecting…
                          </>
                        ) : profile?.stripe_subscription_id ? (
                          "Switch plan"
                        ) : (
                          "Choose plan"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {plans.some((p) => p.stripe_price_id) && (
          <p className="text-stone-600 text-xs text-center mt-8 flex items-center justify-center gap-1.5">
            <span>🔒</span> Payments securely processed by Stripe. Cancel
            anytime.
          </p>
        )}
      </div>
    </div>
  );
}

function Feature({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-white/70 font-medium">{value}</span>
    </div>
  );
}
