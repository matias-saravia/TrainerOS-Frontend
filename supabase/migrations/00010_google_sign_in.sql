-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Trainer sign-up with Google
-- ═══════════════════════════════════════════════════════════════════════

-- Google is offered only on the trainer login: students enter from their
-- trainer's link with just an email, which never creates a Google account.
-- So a new Google account is a trainer, named after its Google profile.
-- An existing account that later uses Google keeps its role: Supabase links
-- it instead of creating a new user, so this trigger does not run.
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
  v_full_name TEXT := trim(coalesce(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  ));
  v_nombre TEXT := coalesce(trim(NEW.raw_user_meta_data ->> 'nombre'), '');
  v_apellido TEXT := coalesce(trim(NEW.raw_user_meta_data ->> 'apellido'), '');
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'trainer' THEN 'trainer'::public.user_role
    WHEN NEW.raw_app_meta_data ->> 'provider' = 'google' THEN 'trainer'::public.user_role
    ELSE 'client'::public.user_role
  END;

  -- Google sends one full name: the first word is the name, the rest the surname
  IF v_nombre = '' AND v_full_name <> '' THEN
    v_nombre := split_part(v_full_name, ' ', 1);
    v_apellido := trim(substr(v_full_name, length(v_nombre) + 1));
  END IF;

  INSERT INTO public.profiles (id, role, nombre, apellido, slug)
  VALUES (
    NEW.id,
    v_role,
    v_nombre,
    v_apellido,
    CASE WHEN v_role = 'trainer' THEN private.generate_trainer_slug(v_nombre, v_apellido) END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
