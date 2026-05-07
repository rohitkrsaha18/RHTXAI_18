-- Add math_used_today column
ALTER TABLE public.user_plans 
  ADD COLUMN IF NOT EXISTS math_used_today integer NOT NULL DEFAULT 0;

-- Replace consume_message with intent-aware logic
CREATE OR REPLACE FUNCTION public.consume_message(_user_id uuid, _intent text DEFAULT 'chat')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  is_math BOOLEAN := (_intent = 'math');
  remaining_free INT;
  milestone TEXT := NULL;
BEGIN
  SELECT * INTO p FROM public.user_plans WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_plans (user_id) VALUES (_user_id) RETURNING * INTO p;
  END IF;

  -- Daily reset (IST)
  IF p.last_reset_date < today THEN
    UPDATE public.user_plans 
      SET daily_messages_used = 0, math_used_today = 0, last_reset_date = today 
      WHERE user_id = _user_id;
    p.daily_messages_used := 0;
    p.math_used_today := 0;
    p.last_reset_date := today;
  END IF;

  -- Plan expiry check
  IF p.plan = 'paid' AND p.plan_expiry IS NOT NULL AND now() > p.plan_expiry THEN
    UPDATE public.user_plans SET plan = 'free' WHERE user_id = _user_id;
    p.plan := 'free';
  END IF;

  -- FREE: 30 lifetime, no per-day distinction
  IF p.plan = 'free' THEN
    IF p.messages_used >= 30 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'free_limit_reached',
        'message', 'You''ve used all 30 free messages. Upgrade to continue 🚀');
    END IF;

    UPDATE public.user_plans
      SET messages_used = messages_used + 1
      WHERE user_id = _user_id;

    remaining_free := 30 - (p.messages_used + 1);

    IF remaining_free = 20 THEN milestone := 'You have 20 messages left';
    ELSIF remaining_free = 10 THEN milestone := 'You have 10 messages left ⚠️';
    ELSIF remaining_free = 5 THEN milestone := 'Only 5 messages remaining ⚠️';
    ELSIF remaining_free = 1 THEN milestone := 'Last free message 🚨';
    END IF;

    RETURN jsonb_build_object(
      'allowed', true, 'plan', 'free',
      'remaining', remaining_free, 'used', p.messages_used + 1, 'limit', 30,
      'milestone', milestone
    );
  END IF;

  -- PAID
  IF is_math THEN
    IF p.math_used_today >= 5 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'daily_math_limit_reached',
        'message', 'Daily math limit reached (5). Try again tomorrow 🧮');
    END IF;
    UPDATE public.user_plans
      SET math_used_today = math_used_today + 1
      WHERE user_id = _user_id;
    RETURN jsonb_build_object(
      'allowed', true, 'plan', 'paid', 'kind', 'math',
      'math_remaining', 5 - (p.math_used_today + 1),
      'chat_remaining', 10 - p.daily_messages_used
    );
  ELSE
    IF p.daily_messages_used >= 10 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'daily_chat_limit_reached',
        'message', 'Daily chat limit reached (10). Try again tomorrow 🌙');
    END IF;
    UPDATE public.user_plans
      SET daily_messages_used = daily_messages_used + 1
      WHERE user_id = _user_id;
    RETURN jsonb_build_object(
      'allowed', true, 'plan', 'paid', 'kind', 'chat',
      'chat_remaining', 10 - (p.daily_messages_used + 1),
      'math_remaining', 5 - p.math_used_today
    );
  END IF;
END;
$function$;