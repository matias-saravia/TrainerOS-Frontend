-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Fixes from the code review
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. A student who signs in with Google stays a student ────────────
-- Any new Google account used to become a trainer, so an invited student
-- who used Google on the trainer login lost the way to their routines.
-- An email a trainer already loaded as a student now signs up as a student.
-- A Google profile without a name falls back to the start of the email.
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
    WHEN NEW.raw_app_meta_data ->> 'provider' = 'google'
      AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE lower(c.email) = lower(NEW.email))
      THEN 'trainer'::public.user_role
    ELSE 'client'::public.user_role
  END;

  -- Google sends one full name: the first word is the name, the rest the surname
  IF v_nombre = '' AND v_full_name <> '' THEN
    v_nombre := split_part(v_full_name, ' ', 1);
    v_apellido := trim(substr(v_full_name, length(v_nombre) + 1));
  END IF;

  IF v_role = 'trainer' AND v_nombre = '' THEN
    v_nombre := split_part(coalesce(NEW.email, ''), '@', 1);
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

-- ─── 2. Saving a routine without the day keeps the day ────────────────
-- A caller that omits p_dia (an older build, a script) used to erase it.
-- NULL keeps the current day; an empty text clears it.
CREATE OR REPLACE FUNCTION public.save_routine(
  p_routine_id UUID,
  p_nombre TEXT,
  p_descripcion TEXT,
  p_blocks JSONB,
  p_dia TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_routine_id UUID := p_routine_id;
  v_block JSONB;
  v_exercise JSONB;
  v_block_id UUID;
  v_block_index INT := 0;
  v_exercise_index INT;
BEGIN
  IF v_routine_id IS NULL THEN
    INSERT INTO public.routines (trainer_id, nombre, descripcion, dia)
    VALUES ((SELECT auth.uid()), p_nombre, p_descripcion, NULLIF(trim(p_dia), ''))
    RETURNING id INTO v_routine_id;
  ELSE
    UPDATE public.routines
    SET nombre = p_nombre,
        descripcion = p_descripcion,
        dia = CASE WHEN p_dia IS NULL THEN dia ELSE NULLIF(trim(p_dia), '') END
    WHERE id = v_routine_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'routine_not_available' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.routine_blocks WHERE routine_id = v_routine_id;
  END IF;

  FOR v_block IN SELECT value FROM jsonb_array_elements(p_blocks) LOOP
    INSERT INTO public.routine_blocks (routine_id, label, type, order_index)
    VALUES (
      v_routine_id,
      v_block ->> 'label',
      (v_block ->> 'type')::public.block_type,
      v_block_index
    )
    RETURNING id INTO v_block_id;

    v_exercise_index := 0;
    FOR v_exercise IN SELECT value FROM jsonb_array_elements(v_block -> 'exercises') LOOP
      INSERT INTO public.routine_block_exercises
        (block_id, exercise_id, sets, reps, tempo, rest_seconds, notes, order_index)
      VALUES (
        v_block_id,
        (v_exercise ->> 'exercise_id')::UUID,
        (v_exercise ->> 'sets')::INT,
        v_exercise ->> 'reps',
        NULLIF(v_exercise ->> 'tempo', ''),
        coalesce((v_exercise ->> 'rest_seconds')::INT, 90),
        NULLIF(v_exercise ->> 'notes', ''),
        v_exercise_index
      );
      v_exercise_index := v_exercise_index + 1;
    END LOOP;

    v_block_index := v_block_index + 1;
  END LOOP;

  RETURN v_routine_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_routine(UUID, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_routine(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- ─── 3. Access attempts are deleted after a day, always ───────────────
-- They were only cleared when a later attempt arrived, so the last emails
-- and IPs could stay forever. The privacy policy promises one day.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-access-attempts',
  '17 * * * *',
  $$DELETE FROM private.access_attempts WHERE window_started_at < NOW() - INTERVAL '1 day'$$
);
