import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UsageStatus {
  plan: "free" | "paid";
  messages_used: number;
  monthly_limit: number;
  daily_messages_used: number;
  math_used_today: number;
  plan_expiry: string | null;
  remaining: number;
  daily_remaining: number | null;
  math_remaining: number | null;
  expired: boolean;
  blocked: boolean;
}

export function useUsage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UsageStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("user_plans").select("*").eq("user_id", user.id).maybeSingle();
    if (!data) return;
    const plan = data.plan as "free" | "paid";
    const expired = !!(plan === "paid" && data.plan_expiry && new Date(data.plan_expiry) < new Date());
    const remaining = plan === "free" ? Math.max(0, 30 - data.messages_used) : Math.max(0, data.monthly_limit - data.messages_used);
    const daily_remaining = plan === "paid" ? Math.max(0, 10 - data.daily_messages_used) : null;
    const math_remaining = plan === "paid" ? Math.max(0, 5 - ((data as any).math_used_today ?? 0)) : null;
    const blocked =
      (plan === "free" && data.messages_used >= 30) ||
      (plan === "paid" && (expired || (daily_remaining ?? 0) === 0));
    setStatus({
      plan,
      messages_used: data.messages_used,
      monthly_limit: data.monthly_limit,
      daily_messages_used: data.daily_messages_used,
      math_used_today: (data as any).math_used_today ?? 0,
      plan_expiry: data.plan_expiry,
      remaining,
      daily_remaining,
      math_remaining,
      expired,
      blocked,
    });
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, refresh };
}
