create or replace function public.estimate_duration(p_service_id uuid, payload jsonb)
returns json
language plpgsql
stable
security invoker
as $$
declare
    v_category text;
    v_wheels int;
    v_options jsonb;
    v_pinchazo boolean;
    v_equilibrado_count int;
    v_equilibrado_camion text;
    v_alineado boolean;
    v_eje text;
    v_con_camara boolean;
    v_doble_plato boolean;
    v_llenado_agua boolean;
    v_llenado_agua_litros int;
    v_lift text;

    v_base_minutes int := 0;
    v_total_minutes int := 0;
    v_reasons text[] := '{}'::text[];
    
    v_buffer_before int;
    v_buffer_after int;
begin
    -- 1. Extract and validate payload
    v_category := lower(payload->>'category');
    v_wheels := (payload->>'wheels')::int;
    v_options := payload->'options';

    if v_category is null or v_category not in ('coche', '4x4', 'camion', 'tractor', 'industrial') then
        return json_build_object('error', 'Categoría inválida o faltante.');
    end if;

    v_pinchazo := coalesce((v_options->>'pinchazo')::boolean, false);
    v_equilibrado_count := coalesce((v_options->>'equilibradoCount')::int, 0);
    v_equilibrado_camion := coalesce(v_options->>'equilibradoCamion', 'none');
    v_alineado := coalesce((v_options->>'alineado')::boolean, false);
    v_eje := coalesce(v_options->>'eje', 'front');
    v_con_camara := coalesce((v_options->>'conCamara')::boolean, false);
    v_doble_plato := coalesce((v_options->>'doblePlato')::boolean, false);
    v_llenado_agua := coalesce((v_options->'llenadoAgua'->>'enabled')::boolean, false);
    v_llenado_agua_litros := (v_options->'llenadoAgua'->>'litros')::int;
    v_lift := coalesce(v_options->>'lift', 'elevador');

    -- 2. Calculate duration based on category
    case v_category
        when 'coche' then
            if v_pinchazo then
                v_base_minutes := 20;
                v_reasons := array_append(v_reasons, 'Base (Pinchazo): 20 min');
            else
                v_base_minutes := case v_wheels when 1 then 15 when 2 then 25 else 50 end;
                v_reasons := array_append(v_reasons, 'Base (Cambio ' || v_wheels || ' ruedas): ' || v_base_minutes || ' min');
            end if;
            if v_equilibrado_count > 0 then
                declare v_equi_min int := case v_equilibrado_count when 1 then 10 when 2 then 20 else 35 end;
                v_total_minutes := v_total_minutes + v_equi_min;
                v_reasons := array_append(v_reasons, 'Extra (Equilibrado ' || v_equilibrado_count || ' ruedas): +' || v_equi_min || ' min');
            end if;
            if v_alineado then
                v_total_minutes := v_total_minutes + 20;
                v_reasons := array_append(v_reasons, 'Extra (Alineado): +20 min');
            end if;

        when '4x4' then
            if v_pinchazo then
                v_base_minutes := 30;
                v_reasons := array_append(v_reasons, 'Base (Pinchazo): 30 min');
            else
                v_base_minutes := case v_wheels when 1 then 25 when 2 then 50 else 90 end;
                v_reasons := array_append(v_reasons, 'Base (Cambio ' || v_wheels || ' ruedas): ' || v_base_minutes || ' min');
            end if;
            if v_equilibrado_count > 0 then
                declare v_equi_4x4_min int := case v_equilibrado_count when 1 then 12 when 2 then 20 else 30 end;
                v_total_minutes := v_total_minutes + v_equi_4x4_min;
                v_reasons := array_append(v_reasons, 'Extra (Equilibrado ' || v_equilibrado_count || ' ruedas): +' || v_equi_4x4_min || ' min');
            end if;
            if v_alineado then
                v_total_minutes := v_total_minutes + 25;
                v_reasons := array_append(v_reasons, 'Extra (Alineado): +25 min');
            end if;

        when 'camion' then
            if v_pinchazo then
                v_base_minutes := 35 * v_wheels;
                v_reasons := array_append(v_reasons, 'Base (Pinchazo ' || v_wheels || ' ruedas): ' || v_base_minutes || ' min');
            else
                v_base_minutes := 25 * v_wheels;
                v_reasons := array_append(v_reasons, 'Base (Cambio ' || v_wheels || ' ruedas): ' || v_base_minutes || ' min');
            end if;
            if v_equilibrado_camion != 'none' then
                declare v_equi_camion_min int := case v_equilibrado_camion when 'one' then 10 else 20 end;
                v_total_minutes := v_total_minutes + v_equi_camion_min;
                v_reasons := array_append(v_reasons, 'Extra (Equilibrado ' || v_equilibrado_camion || '): +' || v_equi_camion_min || ' min');
            end if;

        when 'tractor' then
            if v_eje = 'front' then
                v_base_minutes := case when v_pinchazo then 30 else (case v_wheels when 1 then 25 else 45 end) end;
            else -- rear
                v_base_minutes := case when v_pinchazo then 40 else (case v_wheels when 1 then 35 else 65 end) end;
            end if;
            v_reasons := array_append(v_reasons, 'Base (' || (case when v_pinchazo then 'Pinchazo' else 'Cambio' end) || ' ' || v_wheels || ' ruedas, eje ' || v_eje || '): ' || v_base_minutes || ' min');
            
            if v_con_camara then v_total_minutes := v_total_minutes + 10; v_reasons := array_append(v_reasons, 'Extra (Con cámara): +10 min'); end if;
            if v_doble_plato then 
                declare v_dp_min int := case when v_eje = 'front' then 25 else 30 end;
                v_total_minutes := v_total_minutes + v_dp_min;
                v_reasons := array_append(v_reasons, 'Extra (Doble plato): +' || v_dp_min || ' min');
            end if;
            if v_llenado_agua then
                v_total_minutes := v_total_minutes + 20;
                v_reasons := array_append(v_reasons, 'Extra (Llenado agua activo): +20 min');
                v_reasons := array_append(v_reasons, 'Nota (Llenado agua pasivo): AGUA:40');
            end if;

        when 'industrial' then
            if v_eje = 'front' then
                v_base_minutes := case when v_pinchazo then 30 else (case v_wheels when 1 then 25 when 2 then 50 else 95 end) end;
            else -- rear
                v_base_minutes := case when v_pinchazo then 40 else (case v_wheels when 1 then 35 when 2 then 70 else 120 end) end;
            end if;
            v_reasons := array_append(v_reasons, 'Base (' || (case when v_pinchazo then 'Pinchazo' else 'Cambio' end) || ' ' || v_wheels || ' ruedas, eje ' || v_eje || '): ' || v_base_minutes || ' min');
            
            if v_equilibrado_count > 0 then
                v_total_minutes := v_total_minutes + (15 * v_equilibrado_count);
                v_reasons := array_append(v_reasons, 'Extra (Equilibrado ' || v_equilibrado_count || ' ruedas): +' || (15 * v_equilibrado_count) || ' min');
            end if;
    end case;

    v_total_minutes := v_total_minutes + v_base_minutes;
    
    -- 3. Economies of scale (lift)
    if v_lift = 'gato' then
        v_total_minutes := v_total_minutes + (2 * v_wheels);
        v_reasons := array_append(v_reasons, 'Ajuste (Gato): +' || (2 * v_wheels) || ' min');
    end if;

    -- 4. Service Buffers
    select buffer_before_min, buffer_after_min into v_buffer_before, v_buffer_after from public.services where id = p_service_id;
    if v_buffer_before > 0 then
        v_total_minutes := v_total_minutes + v_buffer_before;
        v_reasons := array_append(v_reasons, 'Buffer (Antes): +' || v_buffer_before || ' min');
    end if;
    if v_buffer_after > 0 then
        v_total_minutes := v_total_minutes + v_buffer_after;
        v_reasons := array_append(v_reasons, 'Buffer (Después): +' || v_buffer_after || ' min');
    end if;
    
    -- 5. Finalize and return
    return json_build_object(
        'minutes', ceil(v_total_minutes),
        'reasons', v_reasons
    );
end;
$$;

grant execute on function public.estimate_duration(uuid, jsonb) to anon, authenticated;