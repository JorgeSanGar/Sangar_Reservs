-- Add soft delete columns to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

-- Audit log helper function
CREATE OR REPLACE FUNCTION public.log_audit(p_org UUID, p_entity TEXT, p_id UUID, p_action TEXT, p_meta JSONB)
RETURNS VOID LANGUAGE sql SECURITY INVOKER AS $$
  INSERT INTO public.audit_logs(org_id, entity, entity_id, action, actor_id, meta, created_at)
  VALUES(p_org, p_entity, p_id, p_action, auth.uid(), p_meta, now());
$$;

-- Function to update a booking
CREATE OR REPLACE FUNCTION public.update_booking(
  p_b UUID,
  p_s UUID DEFAULT NULL,
  p_st TIMESTAMPTZ DEFAULT NULL,
  p_c JSONB DEFAULT NULL,
  p_p JSONB DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE 
  b RECORD;
  org UUID;
  ns UUID;
  st TIMESTAMPTZ;
  en TIMESTAMPTZ;
  m INT;
  rng TSTZRANGE;
  sc BOOLEAN;
  cf INT;
  nm TEXT;
  em TEXT;
  ph TEXT;
  nt TEXT;
BEGIN
  SELECT bk.*, s.org_id INTO b 
  FROM public.bookings bk 
  JOIN public.services s ON s.id = bk.service_id
  WHERE bk.id = p_b AND bk.deleted_at IS NULL;

  IF NOT FOUND THEN 
    RETURN json_build_object('status', 'error', 'error', 'not_found');
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.v_membership vm WHERE vm.org_id = b.org_id AND vm.user_id = auth.uid()) THEN
    RETURN json_build_object('status', 'error', 'error', 'forbidden');
  END IF;

  org := b.org_id;
  ns := COALESCE(p_s, b.service_id);
  sc := (ns <> b.service_id);
  st := COALESCE(p_st, b.start_time);

  SELECT COALESCE(
    (public.estimate_duration_learned(ns, COALESCE(p_p, b.est_payload))->>'minutes')::INT,
    (public.estimate_duration(ns, COALESCE(p_p, b.est_payload))->>'minutes')::INT,
    EXTRACT(EPOCH FROM (b.end_time - b.start_time))/60
  )::INT INTO m;

  IF m IS NULL OR m <= 0 THEN 
    RETURN json_build_object('status', 'error', 'error', 'bad_duration');
  END IF;

  en := st + (m || ' minutes')::INTERVAL;
  rng := tstzrange(st, en, '[)');

  IF NOT sc THEN
    SELECT COUNT(*) INTO cf
    FROM public.booking_resources br
    WHERE br.booking_id <> p_b
      AND br.resource_id IN (SELECT resource_id FROM public.booking_resources WHERE booking_id = p_b)
      AND br.timespan && rng;
    IF cf > 0 THEN 
      RETURN json_build_object('status', 'conflict', 'reason', 'resources_busy', 'count', cf);
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(org::text || to_char(date_trunc('minute', st), 'YYYY-MM-DD HH24:MI') || 'update_booking'));

  IF sc THEN 
    DELETE FROM public.booking_resources WHERE booking_id = p_b;
  END IF;

  nm := COALESCE(p_c->>'name', b.customer_name);
  em := COALESCE(p_c->>'email', b.customer_email);
  ph := COALESCE(p_c->>'phone', b.customer_phone);
  nt := COALESCE(p_c->>'notes_internal', b.notes_internal);

  UPDATE public.bookings SET 
    service_id = ns,
    start_time = st,
    end_time = en,
    customer_name = nm,
    customer_email = em,
    customer_phone = ph,
    notes_internal = nt,
    est_payload = COALESCE(p_p, b.est_payload)
  WHERE id = p_b;

  IF NOT sc THEN
    UPDATE public.booking_resources SET timespan = tstzrange(st, en, '[)') WHERE booking_id = p_b;
  END IF;

  PERFORM public.log_audit(org, 'booking', p_b, 'update',
    json_build_object('service_old', b.service_id, 'service_new', ns, 'start_old', b.start_time, 'start_new', st, 'end_old', b.end_time, 'end_new', en, 'service_changed', sc));

  RETURN json_build_object('status', 'ok', 'minutes', m, 'service_changed', sc);
EXCEPTION WHEN unique_violation OR exclusion_violation THEN
  RETURN json_build_object('status', 'conflict', 'reason', 'exclusion_violation');
END;
$$;

-- Function to reschedule a booking
CREATE OR REPLACE FUNCTION public.reschedule_booking(p_b UUID, p_new TIMESTAMPTZ)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN public.update_booking(p_b, NULL, p_new, NULL, NULL);
END;
$$;

-- Function to soft delete a booking
CREATE OR REPLACE FUNCTION public.soft_delete_booking(p_b UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE 
  b RECORD;
  org UUID;
BEGIN
  SELECT bk.*, s.org_id INTO b 
  FROM public.bookings bk 
  JOIN public.services s ON s.id = bk.service_id
  WHERE bk.id = p_b AND bk.deleted_at IS NULL;
  
  IF NOT FOUND THEN 
    RETURN json_build_object('status', 'error', 'error', 'not_found');
  END IF;
  
  IF NOT EXISTS(SELECT 1 FROM public.v_membership vm WHERE vm.org_id = b.org_id AND vm.user_id = auth.uid()) THEN
    RETURN json_build_object('status', 'error', 'error', 'forbidden');
  END IF;

  org := b.org_id;
  DELETE FROM public.booking_resources WHERE booking_id = p_b;
  UPDATE public.bookings SET 
    status = 'cancelled',
    deleted_at = now(),
    deleted_by = auth.uid(),
    deleted_reason = p_reason 
  WHERE id = p_b;

  PERFORM public.log_audit(org, 'booking', p_b, 'soft_delete',
    json_build_object('reason', p_reason, 'name', b.customer_name, 'phone', b.customer_phone, 'start', b.start_time, 'end', b.end_time));

  RETURN json_build_object('status', 'ok');
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_booking(uuid,uuid,timestamptz,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(uuid,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_booking(uuid,text) TO authenticated;