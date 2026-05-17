
-- 1. Profiles: restrict INSERT/UPDATE to authenticated users only (not anon)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Certificates: prevent users from self-issuing paid certificates.
-- Users may only insert a free certificate (paid=false, amount_cents=0).
-- Only admins can mark a certificate as paid.
DROP POLICY IF EXISTS "Users create own certificates" ON public.certificates;
CREATE POLICY "Users create own certificates"
  ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND paid = false
    AND amount_cents = 0
  );

-- Also enforce at trigger level as defense-in-depth so the DB never holds
-- a paid=true certificate that wasn't set by an admin or service role.
CREATE OR REPLACE FUNCTION public.enforce_certificate_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.paid = true OR COALESCE(NEW.amount_cents, 0) > 0 THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can mark a certificate as paid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_certificate_payment_ins ON public.certificates;
DROP TRIGGER IF EXISTS enforce_certificate_payment_upd ON public.certificates;
CREATE TRIGGER enforce_certificate_payment_ins
  BEFORE INSERT ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_certificate_payment();
CREATE TRIGGER enforce_certificate_payment_upd
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_certificate_payment();

-- 3. Quiz answers: hide correct_index and explanation from public clients.
REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;
GRANT SELECT (id, lesson_id, question, options, sort_order)
  ON public.quiz_questions TO anon, authenticated;

-- 4. SECURITY DEFINER functions that should not be callable directly via the API.
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_referral_reward() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_referral_reward_on_completion() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_certificate_payment() FROM anon, authenticated, public;
-- has_role and get_referrer_by_code are intentionally callable: has_role is used by RLS,
-- get_referrer_by_code is called by the client referral flow.

-- 5. Storage: prevent public listing/enumeration of files in public buckets.
-- Public CDN URLs still work because public buckets bypass RLS for the public object endpoint.
DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
