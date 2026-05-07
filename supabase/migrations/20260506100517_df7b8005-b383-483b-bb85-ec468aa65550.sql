
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function: reset daily counters and downgrade expired paid plans
CREATE OR REPLACE FUNCTION public.reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- Reset daily counters for all users whose last_reset_date is behind today (IST)
  UPDATE public.user_plans
    SET daily_messages_used = 0,
        math_used_today = 0,
        last_reset_date = today
    WHERE last_reset_date < today;

  -- Auto-downgrade expired paid plans
  UPDATE public.user_plans
    SET plan = 'free'
    WHERE plan = 'paid'
      AND plan_expiry IS NOT NULL
      AND now() > plan_expiry;
END;
$$;

-- Remove existing schedule if present, then schedule at 00:00 IST = 18:30 UTC daily
DO $$
BEGIN
  PERFORM cron.unschedule('reset-daily-quotas-ist');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reset-daily-quotas-ist',
  '30 18 * * *',
  $$ SELECT public.reset_daily_quotas(); $$
);
