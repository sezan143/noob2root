CREATE OR REPLACE FUNCTION public.guard_comment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_comment_approval_trg ON public.comments;
CREATE TRIGGER guard_comment_approval_trg
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.guard_comment_approval();