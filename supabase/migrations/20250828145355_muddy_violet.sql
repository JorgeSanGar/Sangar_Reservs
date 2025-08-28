/*
  # Script de prueba para verificar el rendimiento del índice GiST

  Este archivo contiene consultas de prueba para verificar que el índice GiST
  está funcionando correctamente y optimizando las consultas de disponibilidad.
*/

-- Insertar datos de prueba para verificar el índice
INSERT INTO public.booking_resources (booking_id, resource_id, timespan) VALUES
  (gen_random_uuid(), gen_random_uuid(), tstzrange('2025-08-28 09:00+02', '2025-08-28 10:00+02', '[)')),
  (gen_random_uuid(), gen_random_uuid(), tstzrange('2025-08-28 10:00+02', '2025-08-28 11:00+02', '[)')),
  (gen_random_uuid(), gen_random_uuid(), tstzrange('2025-08-28 11:00+02', '2025-08-28 12:00+02', '[)'))
ON CONFLICT DO NOTHING;

-- Consulta de prueba 1: Verificar que el índice GiST se usa
-- Esta consulta debería mostrar "Index Scan using idx_booking_resources_gist"
/*
EXPLAIN (ANALYZE, BUFFERS)
SELECT booking_id, resource_id, timespan
FROM public.booking_resources br
WHERE br.resource_id = (SELECT resource_id FROM public.booking_resources LIMIT 1)
  AND br.timespan && tstzrange('2025-08-28 10:30+02', '2025-08-28 11:30+02', '[]');
*/

-- Consulta de prueba 2: Verificar restricción de no solapamiento
-- Esta inserción debería fallar si hay solapamiento
/*
-- Esto debería fallar con error de exclusión:
INSERT INTO public.booking_resources (booking_id, resource_id, timespan)
SELECT 
  gen_random_uuid(),
  resource_id,
  tstzrange('2025-08-28 09:30+02', '2025-08-28 10:30+02', '[)')
FROM public.booking_resources 
LIMIT 1;
*/

-- Función de utilidad para probar disponibilidad
CREATE OR REPLACE FUNCTION test_resource_availability(
  p_resource_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE(
  has_conflict BOOLEAN,
  conflicting_bookings BIGINT,
  query_plan TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_plan TEXT;
  v_count BIGINT;
BEGIN
  -- Obtener el plan de ejecución
  SELECT query_plan INTO v_plan FROM (
    SELECT string_agg(line, E'\n') as query_plan
    FROM (
      SELECT unnest(string_to_array(
        (EXPLAIN (FORMAT TEXT)
         SELECT booking_id
         FROM public.booking_resources br
         WHERE br.resource_id = p_resource_id
           AND br.timespan && tstzrange(p_start, p_end, '[)')
        )::text, E'\n'
      )) as line
    ) sub
  ) plan_query;
  
  -- Contar conflictos
  SELECT COUNT(*) INTO v_count
  FROM public.booking_resources br
  WHERE br.resource_id = p_resource_id
    AND br.timespan && tstzrange(p_start, p_end, '[)');
  
  RETURN QUERY SELECT 
    (v_count > 0)::BOOLEAN,
    v_count,
    v_plan;
END $$;

-- Ejemplo de uso de la función de prueba:
-- SELECT * FROM test_resource_availability(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   '2025-08-28 10:00+02'::timestamptz,
--   '2025-08-28 11:00+02'::timestamptz
-- );