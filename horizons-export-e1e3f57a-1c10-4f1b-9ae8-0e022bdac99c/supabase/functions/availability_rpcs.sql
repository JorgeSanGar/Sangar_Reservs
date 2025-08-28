-- Part B & C: RPCs for checking availability, creating bookings, and suggesting slots

-- RPC to check availability with minute-by-minute precision
CREATE OR REPLACE FUNCTION public.check_availability(
  p_org_id UUID,
  p_service_id UUID,
  p_date DATE,
  p_payload JSONB DEFAULT NULL,
  p_resource_scope UUID[] DEFAULT NULL,
  p_step_min INT DEFAULT 1
)
RETURNS TABLE(start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, ok BOOLEAN, reasons TEXT[])
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_duration_min INT;
  v_tz TEXT;
  wh RECORD;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_candidate TIMESTAMPTZ;
  v_candidate_end TIMESTAMPTZ;
  v_candidate_interval TSTZRANGE;
  v_is_available BOOLEAN;
  v_reason TEXT;
  v_techs_required INT;
  v_available_techs INT;
  sr RECORD;
BEGIN
  -- 1. Get service duration
  SELECT COALESCE(
    (SELECT (result->>'minutes')::int FROM public.estimate_duration_learned(p_service_id, p_payload) as result),
    (SELECT (result->>'minutes')::int FROM public.estimate_duration(p_service_id, p_payload) as result),
    s.duration_min
  ) INTO v_duration_min
  FROM public.services s WHERE s.id = p_service_id;

  IF v_duration_min IS NULL THEN RETURN; END IF;

  SELECT timezone INTO v_tz FROM public.orgs WHERE id = p_org_id;

  -- 2. Determine working window
  v_day_start := (p_date || ' 00:00:00')::TIMESTAMP AT TIME ZONE v_tz;
  v_day_end := (p_date || ' 23:59:59')::TIMESTAMP AT TIME ZONE v_tz;

  FOR wh IN 
    SELECT open_time, close_time, breaks FROM public.get_working_hours(p_org_id, p_date)
    WHERE resource_id IS NULL AND weekday = EXTRACT(ISODOW FROM p_date) - 1
    LIMIT 1
  LOOP
    FOR v_candidate IN
      -- 3. Generate candidate slots
      SELECT * FROM generate_series(
        (p_date || ' ' || wh.open_time)::TIMESTAMPTZ,
        (p_date || ' ' || wh.close_time)::TIMESTAMPTZ - (v_duration_min * INTERVAL '1 minute'),
        (GREATEST(1, LEAST(p_step_min, 15)) * INTERVAL '1 minute')
      )
    LOOP
      v_candidate_end := v_candidate + (v_duration_min * INTERVAL '1 minute');
      v_candidate_interval := tstzrange(v_candidate, v_candidate_end, '[)');
      v_is_available := TRUE;
      v_reason := '';

      -- 4 & 5. Check capacity for all required resources
      FOR sr IN SELECT resource_id, required_units, r.type as resource_type FROM public.service_resources sr JOIN resources r ON r.id = sr.resource_id WHERE sr.service_id = p_service_id
      LOOP
        IF sr.resource_type = 'technician' THEN
          SELECT COUNT(DISTINCT r.id) INTO v_available_techs
          FROM public.resources r
          WHERE r.org_id = p_org_id AND r.type = 'technician' AND r.is_active = TRUE
            AND (p_resource_scope IS NULL OR r.id = ANY(p_resource_scope))
            AND NOT EXISTS (
              SELECT 1 FROM public.booking_resources br
              WHERE br.resource_id = r.id AND br.timespan && v_candidate_interval
            );
          IF v_available_techs < sr.required_units THEN
            v_is_available := FALSE;
            v_reason := 'Not enough technicians available';
            EXIT;
          END IF;
        ELSE -- Bay, Equipment etc.
          -- Check concurrent capacity (assuming capacity = 1 for now)
          IF EXISTS (SELECT 1 FROM public.booking_resources br WHERE br.resource_id = sr.resource_id AND br.timespan && v_candidate_interval) THEN
            v_is_available := FALSE;
            v_reason := 'Resource ' || sr.resource_id || ' is booked';
            EXIT;
          END IF;
        END IF;
      END LOOP;

      IF v_is_available THEN
        -- Check against blackout dates and breaks
        IF EXISTS (SELECT 1 FROM public.blackout_dates bd WHERE bd.org_id = p_org_id AND bd.blackout_date = p_date) THEN
            v_is_available := FALSE;
            v_reason := 'Blackout day';
        END IF;
        IF v_is_available AND EXISTS (
            SELECT 1 FROM jsonb_to_recordset(wh.breaks) as b(start TIME, "end" TIME)
            WHERE tstzrange((p_date || ' ' || b.start)::TIMESTAMPTZ, (p_date || ' ' || b."end")::TIMESTAMPTZ) && v_candidate_interval
        ) THEN
            v_is_available := FALSE;
            v_reason := 'Overlaps with a break';
        END IF;
      END IF;

      -- Return slot
      start_at := v_candidate;
      end_at := v_candidate_end;
      ok := v_is_available;
      reasons := CASE WHEN v_is_available THEN '{}'::text[] ELSE ARRAY[v_reason] END;
      RETURN NEXT;
    END LOOP;
  END LOOP;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_availability(UUID, UUID, DATE, JSONB, UUID[], INT) TO anon, authenticated;


-- RPC to create a booking with an advisory lock
CREATE OR REPLACE FUNCTION public.create_booking_locked(
  p_org_id UUID,
  p_service_id UUID,
  p_start TIMESTAMPTZ,
  p_customer JSONB,
  p_payload JSONB DEFAULT NULL,
  p_preferred_techs UUID[] DEFAULT NULL,
  p_resource_scope UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_duration_min INT;
  v_end TIMESTAMPTZ;
  v_booking_id UUID;
  v_techs_to_assign UUID[];
  sr RECORD;
  r_id UUID;
BEGIN
  -- Verify user is staff
  IF NOT EXISTS (SELECT 1 FROM public.v_membership WHERE user_id = auth.uid() AND org_id = p_org_id AND role IN ('worker', 'manager')) THEN
    RAISE EXCEPTION 'Forbidden: User is not staff';
  END IF;

  -- 1. Get duration
  SELECT COALESCE(
    (SELECT (result->>'minutes')::int FROM public.estimate_duration_learned(p_service_id, p_payload) as result),
    (SELECT (result->>'minutes')::int FROM public.estimate_duration(p_service_id, p_payload) as result)
  ) INTO v_duration_min;
  v_end := p_start + (v_duration_min * INTERVAL '1 minute');

  -- 2. Advisory lock for the specific minute slot
  PERFORM pg_advisory_xact_lock(hashtext(p_org_id::text || to_char(date_trunc('minute', p_start), 'YYYY-MM-DD HH24:MI')));

  -- 3. Insert booking
  INSERT INTO public.bookings (org_id, service_id, start_time, end_time, customer_name, customer_email, customer_phone, est_payload, status)
  VALUES (p_org_id, p_service_id, p_start, v_end, p_customer->>'name', p_customer->>'email', p_customer->>'phone', p_payload, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- 4. Auto-assign resources
  FOR sr IN SELECT * FROM public.service_resources WHERE service_id = p_service_id
  LOOP
    IF (SELECT type FROM public.resources WHERE id = sr.resource_id) = 'technician' THEN
      -- Logic for assigning technicians (simplified for this example)
      SELECT array_agg(id) INTO v_techs_to_assign FROM (
        SELECT res.id FROM public.resources res
        WHERE res.org_id = p_org_id AND res.type = 'technician' AND res.is_active = TRUE
        AND (p_resource_scope IS NULL OR res.id = ANY(p_resource_scope))
        AND NOT EXISTS (
            SELECT 1 FROM public.booking_resources br
            WHERE br.resource_id = res.id AND br.timespan && tstzrange(p_start, v_end, '[)')
        )
        ORDER BY (res.id = ANY(COALESCE(p_preferred_techs, '{}'::uuid[]))) DESC -- Prioritize preferred
        LIMIT sr.required_units
      ) as sub;

      IF array_length(v_techs_to_assign, 1) < sr.required_units THEN
        RAISE EXCEPTION 'slot_taken_or_unavailable_tech';
      END IF;

      FOREACH r_id IN ARRAY v_techs_to_assign
      LOOP
        INSERT INTO public.booking_resources (booking_id, resource_id) VALUES (v_booking_id, r_id);
      END LOOP;
    ELSE
      -- Assign other resources (bays, equipment)
      INSERT INTO public.booking_resources (booking_id, resource_id) VALUES (v_booking_id, sr.resource_id);
    END IF;
  END LOOP;
  
  RETURN v_booking_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'slot_taken';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_locked(UUID, UUID, TIMESTAMPTZ, JSONB, JSONB, UUID[], UUID[]) TO authenticated;

-- RPC to suggest alternative slots
CREATE OR REPLACE FUNCTION public.suggest_distribution(
  p_org_id UUID,
  p_service_id UUID,
  p_target TIMESTAMPTZ,
  p_payload JSONB DEFAULT NULL,
  p_max_candidates INT DEFAULT 5,
  p_resource_scope UUID[] DEFAULT NULL
)
RETURNS TABLE(start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, techs UUID[], reason TEXT)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
    v_duration_min INT;
BEGIN
    -- Verify user is staff
    IF NOT EXISTS (SELECT 1 FROM public.v_membership WHERE user_id = auth.uid() AND org_id = p_org_id) THEN
      RETURN;
    END IF;

    SELECT COALESCE(
      (SELECT (result->>'minutes')::int FROM public.estimate_duration_learned(p_service_id, p_payload) as result),
      (SELECT (result->>'minutes')::int FROM public.estimate_duration(p_service_id, p_payload) as result)
    ) INTO v_duration_min;

    -- Return first few available slots on the target date
    RETURN QUERY
    SELECT 
      ca.start_at, 
      ca.end_at, 
      (SELECT array_agg(r.id) FROM public.resources r WHERE r.type = 'technician' AND r.org_id = p_org_id AND r.is_active AND NOT EXISTS (SELECT 1 FROM booking_resources br WHERE br.resource_id = r.id AND br.timespan && tstzrange(ca.start_at, ca.end_at, '[)')) LIMIT (SELECT required_units FROM service_resources WHERE service_id = p_service_id AND (SELECT type FROM resources WHERE id=resource_id) = 'technician' LIMIT 1)),
      'available'::TEXT
    FROM public.check_availability(p_org_id, p_service_id, p_target::date, p_payload, p_resource_scope) ca
    WHERE ca.ok = TRUE
    ORDER BY abs(extract(epoch from (ca.start_at - p_target)))
    LIMIT p_max_candidates;
END;
$$;

GRANT EXECUTE ON FUNCTION public.suggest_distribution(UUID, UUID, TIMESTAMPTZ, JSONB, INT, UUID[]) TO authenticated;