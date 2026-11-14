-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Students sign in with a password they create the first time
-- ═══════════════════════════════════════════════════════════════════════

-- Tells the access function whether the account behind an email already has a
-- password. Accounts created for the email link have an empty one. Only the
-- access function (service role) can ask.
CREATE OR REPLACE FUNCTION public.client_access_password_state(p_email TEXT)
RETURNS TABLE (user_id UUID, has_password BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.id, COALESCE(u.encrypted_password, '') <> ''
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email);
$$;

REVOKE ALL ON FUNCTION public.client_access_password_state(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_access_password_state(TEXT) TO service_role;

-- The trainer clears a student's password so the student creates a new one on
-- the next visit. It also closes every open session of that account, so an old
-- password or a stolen session stops working. Only for the trainer's own
-- students, and never for an account another trainer also has, or for a
-- trainer's account.
CREATE OR REPLACE FUNCTION public.reset_client_password(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_client public.clients%ROWTYPE;
  v_email TEXT;
BEGIN
  SELECT c.* INTO v_client
  FROM public.clients c
  WHERE c.id = p_client_id
    AND c.trainer_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'client_not_available' USING ERRCODE = '42501';
  END IF;

  -- Never linked: there is no password yet, nothing to do
  IF v_client.user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_client.user_id;

  IF EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.trainer_id <> v_client.trainer_id
      AND (c.user_id = v_client.user_id OR lower(c.email) = v_email)
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_client.user_id AND p.role <> 'client'
  ) THEN
    RAISE EXCEPTION 'shared_account' USING ERRCODE = 'P0001';
  END IF;

  UPDATE auth.users SET encrypted_password = '' WHERE id = v_client.user_id;
  DELETE FROM auth.sessions WHERE user_id = v_client.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_client_password(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_client_password(UUID) TO authenticated;
