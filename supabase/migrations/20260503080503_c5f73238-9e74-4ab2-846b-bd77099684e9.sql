-- User plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','paid')),
  messages_used INTEGER NOT NULL DEFAULT 0,
  daily_messages_used INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER NOT NULL DEFAULT 30,
  plan_expiry TIMESTAMPTZ,
  last_reset_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plan" ON public.user_plans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own plan" ON public.user_plans FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users insert own plan" ON public.user_plans FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto create plan on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_plans (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- Backfill for existing users
INSERT INTO public.user_plans (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Payment orders
CREATE TABLE public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.payment_orders FOR SELECT USING (user_id = auth.uid());

CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: consume one message with all checks (atomic)
CREATE OR REPLACE FUNCTION public.consume_message(_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p RECORD;
  today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  SELECT * INTO p FROM public.user_plans WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_plans (user_id) VALUES (_user_id) RETURNING * INTO p;
  END IF;

  -- Daily reset
  IF p.last_reset_date < today THEN
    UPDATE public.user_plans SET daily_messages_used = 0, last_reset_date = today WHERE user_id = _user_id;
    p.daily_messages_used := 0;
    p.last_reset_date := today;
  END IF;

  -- Plan expiry check
  IF p.plan = 'paid' AND p.plan_expiry IS NOT NULL AND now() > p.plan_expiry THEN
    UPDATE public.user_plans SET plan = 'free' WHERE user_id = _user_id;
    p.plan := 'free';
  END IF;

  -- Limits
  IF p.plan = 'free' AND p.messages_used >= 30 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'free_limit_reached');
  END IF;
  IF p.plan = 'paid' THEN
    IF p.messages_used >= p.monthly_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached');
    END IF;
    IF p.daily_messages_used >= 10 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit_reached');
    END IF;
  END IF;

  UPDATE public.user_plans
    SET messages_used = messages_used + 1,
        daily_messages_used = daily_messages_used + 1
    WHERE user_id = _user_id;

  RETURN jsonb_build_object('allowed', true, 'plan', p.plan);
END;
$$;