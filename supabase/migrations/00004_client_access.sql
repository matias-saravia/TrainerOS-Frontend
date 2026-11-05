-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Client access through the trainer's public link (/t/:slug)
-- ═══════════════════════════════════════════════════════════════════════

-- Only what the public page needs to show. Never email, phone or client data.
CREATE OR REPLACE FUNCTION public.get_trainer_public(p_slug TEXT)
RETURNS TABLE (nombre TEXT, apellido TEXT, avatar_url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.nombre, p.apellido, p.avatar_url
  FROM public.profiles p
  WHERE p.slug = lower(p_slug) AND p.role = 'trainer';
$$;

REVOKE ALL ON FUNCTION public.get_trainer_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trainer_public(TEXT) TO anon, authenticated;

-- Links the signed-in account to the client row its trainer created for that
-- email. The email comes from auth.users, so it was proven by the login link.
CREATE OR REPLACE FUNCTION public.claim_client_access(p_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_client public.clients%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_uid AND email_confirmed_at IS NOT NULL;

  SELECT c.* INTO v_client
  FROM public.clients c
  JOIN public.profiles t ON t.id = c.trainer_id
  WHERE t.slug = lower(p_slug) AND lower(c.email) = v_email
  FOR UPDATE OF c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_invited' USING ERRCODE = 'P0001';
  END IF;

  IF v_client.user_id IS NOT NULL AND v_client.user_id <> v_uid THEN
    RAISE EXCEPTION 'already_linked' USING ERRCODE = 'P0001';
  END IF;

  IF v_client.user_id IS NULL THEN
    UPDATE public.clients SET user_id = v_uid WHERE id = v_client.id;
  END IF;

  RETURN v_client.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_client_access(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_client_access(TEXT) TO authenticated;
