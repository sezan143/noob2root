
-- 1. Add referral fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS referral_credit_cents integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 2. Helper to generate a short unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  attempts int := 0;
BEGIN
  LOOP
    new_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    attempts := attempts + 1;
    IF attempts > 5 THEN
      new_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 3. Backfill existing rows
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- 4. Update handle_new_user to assign a code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, profile_completed, referral_code)
  VALUES (NEW.id, NULL, false, public.generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Public lookup function (referral_code -> user_id) without exposing full profiles
CREATE OR REPLACE FUNCTION public.get_referrer_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE referral_code = _code LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_referrer_by_code(text) TO anon, authenticated;

-- 6. Referral rewards table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  course_id uuid,
  reward_type text NOT NULL DEFAULT 'credit', -- 'credit' | 'free_certificate'
  amount_cents integer NOT NULL DEFAULT 300,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'redeemed' | 'rejected'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  UNIQUE (referrer_id, referred_user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON public.referral_rewards(status);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rewards"
  ON public.referral_rewards FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins manage all rewards"
  ON public.referral_rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Trigger: on enrollment completion, create a pending reward for the referrer
CREATE OR REPLACE FUNCTION public.create_referral_reward_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_id uuid;
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    SELECT referred_by INTO ref_id FROM public.profiles WHERE user_id = NEW.user_id;
    IF ref_id IS NOT NULL AND ref_id <> NEW.user_id THEN
      INSERT INTO public.referral_rewards (referrer_id, referred_user_id, course_id, reward_type, amount_cents, status)
      VALUES (ref_id, NEW.user_id, NEW.course_id, 'credit', 300, 'pending')
      ON CONFLICT (referrer_id, referred_user_id, course_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_reward ON public.enrollments;
CREATE TRIGGER trg_referral_reward
  AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_reward_on_completion();

-- 8. Trigger: when reward marked 'approved', credit the referrer's balance (for credit type)
CREATE OR REPLACE FUNCTION public.apply_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := now();
    IF NEW.reward_type = 'credit' THEN
      UPDATE public.profiles
      SET referral_credit_cents = referral_credit_cents + NEW.amount_cents
      WHERE user_id = NEW.referrer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_referral_reward ON public.referral_rewards;
CREATE TRIGGER trg_apply_referral_reward
  BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.apply_referral_reward();

-- 9. Allow users to update their own referred_by once (during profile completion)
-- existing "Users can update their own profile" policy already covers this.
