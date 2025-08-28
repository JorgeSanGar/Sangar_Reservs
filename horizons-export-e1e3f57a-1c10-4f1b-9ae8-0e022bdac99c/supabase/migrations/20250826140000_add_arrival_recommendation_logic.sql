-- Add columns to orgs table for arrival configuration
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS arrival_checkin_min INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS arrival_wait_max_min INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS arrival_early_cap_wait_min INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS arrival_drop_window_before_min INT NOT NULL DEFAULT 60;

-- Function to recommend arrival time for a booking
CREATE OR REPLACE FUNCTION public.recommend_arrival(p_booking UUID, p_mode TEXT DEFAULT 'wait')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $
DECLARE
  b RECORD;
  org_settings RECORD;
  org UUID;
  md TEXT := lower(coalesce(p_mode, 'wait'));
  ck INTERVAL;
  mw INTERVAL;
  ec INTERVAL;
  dw INTERVAL;
  o TIME;
  c TIME;
  os TIMESTAMPTZ;
  cs TIMESTAMPTZ;
  pe TIMESTAMPTZ;
  sc TIMESTAMPTZ;
  ecap TIMESTAMPTZ;
  rs TIMESTAMPTZ;
  re TIMESTAMPTZ;
  w INTERVAL;
  gap INTERVAL;
BEGIN
  SELECT bk.*, s.org_id INTO b
  FROM public.bookings bk
  JOIN public.services s ON s.id = bk.service_id
  WHERE bk.id = p_booking AND bk.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'error', 'not_found');
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.v_membership vm WHERE vm.org_id = b.org_id AND vm.user_id = auth.uid()) THEN
    RETURN json_build_object('status', 'error', 'error', 'forbidden');
  END IF;

  org := b.org_id;

  SELECT arrival_checkin_min, arrival_wait_max_min, arrival_early_cap_wait_min, arrival_drop_window_before_min
  INTO STRICT org_settings
  FROM public.orgs
  WHERE id = org;

  ck := interval '1 min' * greatest(1, org_settings.arrival_checkin_min);
  mw := interval '1 min' * greatest(0, org_settings.arrival_wait_max_min);
  ec := interval '1 min' * greatest(0, org_settings.arrival_early_cap_wait_min);
  dw := interval '1 min' * greatest(0, org_settings.arrival_drop_window_before_min);

  SELECT min(open_time), max(close_time) INTO o, c
  FROM public.get_working_hours(org, (b.start_time AT TIME ZONE 'UTC')::date)
  WHERE resource_id IS NULL;

  IF o IS NULL OR c IS NULL THEN
    RETURN json_build_object('status', 'error', 'error', 'no_working_hours');
  END IF;

  os := date_trunc('day', b.start_time) + o;
  cs := date_trunc('day', b.start_time) + c;

  WITH mr AS (SELECT DISTINCT resource_id FROM public.booking_resources WHERE booking_id = p_booking)
  SELECT max(j.end_time) INTO pe
  FROM public.bookings j
  JOIN public.booking_resources r ON r.booking_id = j.id
  JOIN mr ON mr.resource_id = r.resource_id
  WHERE j.org_id = org AND j.deleted_at IS NULL AND j.id <> p_booking AND j.end_time <= b.start_time;

  ecap := coalesce(pe, b.start_time - ck);
  sc := greatest(os, b.start_time - CASE WHEN md = 'wait' THEN ec ELSE dw END);

  IF md = 'wait' THEN
    rs := greatest(sc, coalesce(pe - ck, b.start_time - ec));
    re := least(b.start_time - ck, ecap);
    re := greatest(re, b.start_time - ck - mw);
    IF re < rs THEN
      re := least(b.start_time - ck, ecap);
      rs := greatest(sc, re);
    END IF;
  ELSE
    rs := greatest(sc, coalesce(pe - ck, b.start_time - dw));
    re := least(b.start_time - ck, ecap);
    IF re < rs THEN
      re := least(b.start_time - ck, ecap);
      rs := greatest(sc, re);
    END IF;
  END IF;

  rs := greatest(rs, os);
  re := least(re, cs - interval '1 min');
  w := (b.start_time - ck) - re;
  gap := coalesce(b.start_time - pe, interval '0');

  RETURN json_build_object(
    'status', 'ok',
    'mode', md,
    'booking_start', b.start_time,
    'prev_end', pe,
    'recommended_start', rs,
    'recommended_end', re,
    'checkin_min', extract(epoch FROM ck)::int / 60,
    'client_wait_min', greatest(0, extract(epoch FROM w)::int / 60),
    'idle_gap_min', greatest(0, extract(epoch FROM gap)::int / 60)
  );
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.recommend_arrival(uuid, text) TO authenticated;