-- ═══════════════════════════════════════════════════════════════════════
-- TrainerOS — Create or replace a routine in a single transaction
-- Runs as the caller, so RLS still decides what can be written.
-- Past sessions are not affected: they keep their own session_exercises.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.save_routine(
  p_routine_id UUID,
  p_nombre TEXT,
  p_descripcion TEXT,
  p_blocks JSONB
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
    INSERT INTO public.routines (trainer_id, nombre, descripcion)
    VALUES ((SELECT auth.uid()), p_nombre, p_descripcion)
    RETURNING id INTO v_routine_id;
  ELSE
    UPDATE public.routines
    SET nombre = p_nombre, descripcion = p_descripcion
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

REVOKE ALL ON FUNCTION public.save_routine(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_routine(UUID, TEXT, TEXT, JSONB) TO authenticated;
