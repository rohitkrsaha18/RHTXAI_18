
CREATE OR REPLACE FUNCTION public.reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- Auto-downgrade expired paid plans first
  UPDATE public.user_plans
    SET plan = 'free'
    WHERE plan = 'paid'
      AND plan_expiry IS NOT NULL
      AND now() > plan_expiry;

  -- Reset daily counters ONLY for paid users
  -- Free users keep their lifetime 30-message quota (no daily reset)
  UPDATE public.user_plans
    SET daily_messages_used = 0,
        math_used_today = 0,
        last_reset_date = today
    WHERE plan = 'paid'
      AND last_reset_date < today;
END;
$$;
