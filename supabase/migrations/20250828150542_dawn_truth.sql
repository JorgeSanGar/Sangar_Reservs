-- =====================================================
-- MIGRACIÓN: Corrección de función verify_gist_index_usage
-- =====================================================
-- Propósito: Corregir sintaxis de EXPLAIN en PL/pgSQL
-- Problema resuelto: ERROR 42601 - syntax error at or near "TEXT"
-- =====================================================

-- Función corregida para verificar uso del índice GiST
CREATE OR REPLACE FUNCTION public.verify_gist_index_usage()
RETURNS TABLE(
  test_name TEXT,
  index_used BOOLEAN,
  plan_snippet TEXT,
  performance_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_result TEXT := '';
  line TEXT;
  uses_gist_index BOOLEAN := false;
  test_resource_id UUID;
BEGIN
  -- Generar UUID de prueba
  test_resource_id := gen_random_uuid();
  
  -- =====================================================
  -- TEST 1: Consulta de solapamiento por resource_id
  -- =====================================================
  
  -- Capturar plan de ejecución usando EXECUTE (método correcto en PL/pgSQL)
  plan_result := '';
  FOR line IN
    EXECUTE $q$
      EXPLAIN (FORMAT TEXT)
      SELECT 1
      FROM public.booking_resources br
      WHERE br.resource_id = $1
        AND br.timespan && tstzrange(now(), now() + interval '1 hour', '[)')
    $q$ USING test_resource_id
  LOOP
    plan_result := plan_result || line || E'\n';
  END LOOP;
  
  -- Verificar si usa el índice GiST
  uses_gist_index := (
    plan_result ILIKE '%Index Scan%' AND 
    plan_result ILIKE '%idx_booking_resources_gist%'
  );
  
  -- Retornar resultado del test 1
  RETURN QUERY SELECT 
    'resource_overlap'::TEXT,
    uses_gist_index,
    substring(plan_result from 1 for 200)::TEXT,
    CASE 
      WHEN uses_gist_index THEN 'ÓPTIMO: Usando índice GiST compuesto'
      ELSE 'SUBÓPTIMO: No usa índice GiST - verificar extensión btree_gist'
    END::TEXT;
  
  -- =====================================================
  -- TEST 2: Consulta solo por timespan
  -- =====================================================
  
  plan_result := '';
  FOR line IN
    EXECUTE $q$
      EXPLAIN (FORMAT TEXT)
      SELECT 1
      FROM public.booking_resources br
      WHERE br.timespan && tstzrange(now(), now() + interval '2 hours', '[)')
    $q$
  LOOP
    plan_result := plan_result || line || E'\n';
  END LOOP;
  
  uses_gist_index := (
    plan_result ILIKE '%Index Scan%' AND 
    (plan_result ILIKE '%timespan%' OR plan_result ILIKE '%gist%')
  );
  
  -- Retornar resultado del test 2
  RETURN QUERY SELECT 
    'timespan_only'::TEXT,
    uses_gist_index,
    substring(plan_result from 1 for 200)::TEXT,
    CASE 
      WHEN uses_gist_index THEN 'ÓPTIMO: Usando índice GiST para rangos'
      ELSE 'ADVERTENCIA: Seq Scan en consultas de rango temporal'
    END::TEXT;
  
  -- =====================================================
  -- TEST 3: Verificar constraint de exclusión
  -- =====================================================
  
  RETURN QUERY SELECT 
    'exclusion_constraint'::TEXT,
    EXISTS(
      SELECT 1 FROM pg_constraint 
      WHERE conname LIKE '%overlap%' 
      AND contype = 'x'
    ),
    'Constraint EXCLUDE para prevenir solapamientos'::TEXT,
    CASE 
      WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname LIKE '%overlap%' AND contype = 'x')
      THEN 'ACTIVO: Integridad garantizada a nivel BD'
      ELSE 'INACTIVO: Considerar añadir constraint EXCLUDE'
    END::TEXT;
    
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.verify_gist_index_usage() TO authenticated;

-- Comentario de documentación
COMMENT ON FUNCTION public.verify_gist_index_usage() IS 
'Verifica que los índices GiST estén siendo utilizados correctamente en consultas de disponibilidad';