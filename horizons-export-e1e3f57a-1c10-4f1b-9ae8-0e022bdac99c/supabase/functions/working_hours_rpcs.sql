-- Custom type for RPC payload
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wh_item') THEN
        CREATE TYPE public.wh_item AS (
            weekday SMALLINT,
            open_time TIME,
            close_time TIME,
            breaks JSONB,
            resource_id UUID
        );
    END IF;
END$$;

-- RPC to get effective working hours
CREATE OR REPLACE FUNCTION public.get_working_hours(p_org_id UUID, p_date DATE)
RETURNS SETOF public.working_hours
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT * FROM public.working_hours
  WHERE org_id = p_org_id
  AND effective_from <= p_date
  AND (effective_to IS NULL OR p_date <= effective_to)
  ORDER BY weekday, resource_id;
$$;

-- RPC to set working hours
CREATE OR REPLACE FUNCTION public.set_working_hours(
  p_org_id UUID,
  p_effective_from DATE,
  p_effective_to DATE DEFAULT NULL,
  p_items public.wh_item[],
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  is_manager BOOLEAN;
  conflict_count INT;
  item public.wh_item;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'manager'
  ) INTO is_manager;

  IF NOT is_manager THEN
    RAISE EXCEPTION 'User is not a manager of this organization';
  END IF;

  WITH new_schedule AS (
    SELECT
      (i.item_data).weekday as weekday,
      (i.item_data).open_time as open_time,
      (i.item_data).close_time as close_time
    FROM unnest(p_items) as i(item_data)
  )
  SELECT COUNT(b.id)
  INTO conflict_count
  FROM public.bookings b
  JOIN new_schedule ns ON b.org_id = p_org_id AND EXTRACT(DOW FROM b.start_at) = ns.weekday
  WHERE b.org_id = p_org_id
    AND b.start_at::date >= p_effective_from
    AND (p_effective_to IS NULL OR b.start_at::date <= p_effective_to)
    AND (b.start_at::time < ns.open_time OR b.end_at::time > ns.close_time);

  IF conflict_count > 0 AND NOT p_force THEN
    RETURN json_build_object('status', 'warning', 'conflicts', conflict_count);
  END IF;

  FOREACH item IN ARRAY p_items
  LOOP
    INSERT INTO public.working_hours (org_id, weekday, open_time, close_time, breaks, resource_id, effective_from, effective_to)
    VALUES (p_org_id, item.weekday, item.open_time, item.close_time, item.breaks, item.resource_id, p_effective_from, p_effective_to)
    ON CONFLICT (org_id, weekday, COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'), effective_from)
    DO UPDATE SET
      open_time = EXCLUDED.open_time,
      close_time = EXCLUDED.close_time,
      breaks = EXCLUDED.breaks,
      effective_to = EXCLUDED.effective_to,
      updated_at = NOW();
  END LOOP;

  RETURN json_build_object('status', 'ok', 'conflicts', conflict_count);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_working_hours(UUID, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_working_hours(UUID, DATE, DATE, public.wh_item[], BOOLEAN) TO authenticated;