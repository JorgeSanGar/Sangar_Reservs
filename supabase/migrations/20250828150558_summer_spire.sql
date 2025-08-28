-- =====================================================
-- MIGRACIÓN: Corrección de función test_resource_availability
-- =====================================================
-- Propósito: Corregir sintaxis de EXPLAIN en función de testing
-- Problema resuelto: ERROR 42601 - syntax error at or near "TEXT"
-- =====================================================

-- Función corregida para testing de disponibilidad de recursos
CREATE OR REPLACE FUNCTION public.test_resource_availability(
  p_resource_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE(
  resource_id UUID,
  conflicts_found INTEGER,
  query_plan TEXT,
  execution_time_ms NUMERIC,
  optimization_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conflicts INTEGER;
  v_plan TEXT := '';
  v_line TEXT;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_ms NUMERIC;
  v_uses_index BOOLEAN := false;
BEGIN
  -- Capturar tiempo de inicio
  v_start_time := clock_timestamp();
  
  -- Contar conflictos reales
  SELECT COUNT(*) INTO v_conflicts
  FROM public.booking_resources br
  WHERE br.resource_id = p_resource_id
    AND br.timespan && tstzrange(p_start, p_end, '[)');
  
  -- Capturar tiempo de fin
  v_end_time := clock_timestamp();
  v_execution_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  -- Capturar plan de ejecución usando EXECUTE (método correcto)
  FOR v_line IN
    EXECUTE $q$
      EXPLAIN (FORMAT TEXT)
      SELECT booking_id
      FROM public.booking_resources br
      WHERE br.resource_id = $1
        AND br.timespan && tstzrange($2, $3, '[)')
    $q$ USING p_resource_id, p_start, p_end
  LOOP
    v_plan := v_plan || v_line || E'\n';
  END LOOP;
  
  -- Verificar si usa índice GiST
  v_uses_index := (
    v_plan ILIKE '%Index Scan%' AND 
    v_plan ILIKE '%idx_booking_resources_gist%'
  );
  
  -- Retornar resultados
  RETURN QUERY SELECT 
    p_resource_id,
    v_conflicts,
    v_plan,
    v_execution_ms,
    CASE 
      WHEN v_uses_index AND v_execution_ms < 10 THEN 'EXCELENTE: Índice GiST + sub-10ms'
      WHEN v_uses_index THEN 'BUENO: Usando índice GiST'
      WHEN v_execution_ms < 50 THEN 'ACEPTABLE: Sin índice pero rápido'
      ELSE 'CRÍTICO: Sin índice + lento - revisar configuración'
    END;
END;
$$;

-- Función auxiliar para generar datos de prueba
CREATE OR REPLACE FUNCTION public.generate_test_booking_data(
  p_num_resources INTEGER DEFAULT 10,
  p_bookings_per_resource INTEGER DEFAULT 5
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resource_id UUID;
  v_booking_id UUID;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  i INTEGER;
  j INTEGER;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Limpiar datos de prueba existentes
  DELETE FROM public.booking_resources WHERE resource_id IN (
    SELECT id FROM public.resources WHERE name LIKE 'TEST_RESOURCE_%'
  );
  DELETE FROM public.bookings WHERE customer_name LIKE 'TEST_CUSTOMER_%';
  DELETE FROM public.resources WHERE name LIKE 'TEST_RESOURCE_%';
  
  -- Generar recursos de prueba
  FOR i IN 1..p_num_resources LOOP
    v_resource_id := gen_random_uuid();
    
    INSERT INTO public.resources (id, name, type, org_id, is_active)
    VALUES (
      v_resource_id,
      'TEST_RESOURCE_' || i,
      'bay',
      (SELECT id FROM public.orgs LIMIT 1), -- Usar primera org disponible
      true
    );
    
    -- Generar bookings para cada recurso
    FOR j IN 1..p_bookings_per_resource LOOP
      v_booking_id := gen_random_uuid();
      v_start_time := now() + (i * j * interval '1 hour');
      v_end_time := v_start_time + interval '30 minutes';
      
      -- Insertar booking
      INSERT INTO public.bookings (
        id, org_id, service_id, start_time, end_time,
        customer_name, status
      )
      VALUES (
        v_booking_id,
        (SELECT id FROM public.orgs LIMIT 1),
        (SELECT id FROM public.services LIMIT 1),
        v_start_time,
        v_end_time,
        'TEST_CUSTOMER_' || i || '_' || j,
        'confirmed'
      );
      
      -- Insertar booking_resource con timespan
      INSERT INTO public.booking_resources (booking_id, resource_id, timespan)
      VALUES (
        v_booking_id,
        v_resource_id,
        tstzrange(v_start_time, v_end_time, '[)')
      );
      
      v_inserted_count := v_inserted_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN format('Datos de prueba generados: %s recursos, %s bookings totales', 
                p_num_resources, v_inserted_count);
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.test_resource_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_test_booking_data(INTEGER, INTEGER) TO authenticated;

-- Comentarios de documentación
COMMENT ON FUNCTION public.test_resource_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 
'Prueba el rendimiento de consultas de disponibilidad y verifica uso de índices GiST';

COMMENT ON FUNCTION public.generate_test_booking_data(INTEGER, INTEGER) IS 
'Genera datos de prueba para testing de rendimiento de índices';