-- RLS Policies for reading learning data
-- Create a helper view for membership if it doesn't exist
create or replace view public.v_membership as
select
  om.org_id,
  om.user_id,
  om.role
from
  public.org_members om;

-- Enable RLS on stats and outliers tables
alter table public.duration_stats enable row level security;
alter table public.duration_outliers enable row level security;

-- Policies: allow read access to members of the corresponding organization
drop policy if exists select_member_access on public.duration_stats;
create policy select_member_access on public.duration_stats
for select
using (
  exists (
    select 1
    from public.v_membership vm
    where vm.user_id = auth.uid() and vm.org_id = duration_stats.org_id
  )
);

drop policy if exists select_member_access on public.duration_outliers;
create policy select_member_access on public.duration_outliers
for select
using (
  exists (
    select 1
    from public.v_membership vm
    where vm.user_id = auth.uid() and vm.org_id = duration_outliers.org_id
  )
);


-- RPC 1: Estimate duration using learned data
create or replace function public.estimate_duration_learned(p_service_id uuid, p_payload jsonb)
returns json
language plpgsql
stable
security invoker
as $$
declare
    v_base_minutes int;
    v_base_reasons jsonb;
    v_sig text;
    v_org_id uuid;
    v_stats record;
    v_settings record;
    v_mixed_minutes numeric;
    v_final_minutes int;
    v_reasons text[];
begin
    -- Get base estimation
    select (result->>'minutes')::int, result->'reasons' into v_base_minutes, v_base_reasons from public.estimate_duration(p_service_id, p_payload) as result;

    -- Get org and signature
    select org_id into v_org_id from public.services where id = p_service_id;
    v_sig := public.make_est_signature(p_service_id, p_payload);

    -- Get org settings for learning
    select est_min_samples, est_hist_weight, est_margin_pct into v_settings from public.orgs where id = v_org_id;
    
    -- Get historical stats for this pattern
    select n, ema_min into v_stats from public.duration_stats where org_id = v_org_id and service_id = p_service_id and signature = v_sig;

    -- Mix base and historical data
    if v_stats.n is not null and v_stats.n >= v_settings.est_min_samples and v_stats.ema_min is not null then
        v_mixed_minutes := (1.0 - v_settings.est_hist_weight) * v_base_minutes + v_settings.est_hist_weight * v_stats.ema_min;
    else
        v_mixed_minutes := v_base_minutes;
    end if;

    -- Apply margin
    v_final_minutes := ceil(v_mixed_minutes * (1.0 + v_settings.est_margin_pct / 100.0));

    -- Build reasons array for transparency
    v_reasons := array[
        'base=' || v_base_minutes,
        'hist=' || coalesce(v_stats.ema_min::text, 'null'),
        'weight=' || v_settings.est_hist_weight::text,
        'margin=' || v_settings.est_margin_pct::text || '%',
        'n=' || coalesce(v_stats.n::text, '0')
    ];

    return json_build_object(
        'minutes', v_final_minutes,
        'reasons', v_reasons,
        'base_reasons', v_base_reasons
    );
end;
$$;

grant execute on function public.estimate_duration_learned(uuid, jsonb) to anon, authenticated;


-- RPC 2: Record actual duration and update statistics
create or replace function public.record_actual_duration(p_booking_id uuid, p_actual_minutes int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_booking record;
    v_sig text;
    v_org_id uuid;
    v_settings record;
    v_stats record;
    v_std numeric;
    v_variance numeric;
    
    v_n1 int;
    v_delta numeric;
    v_mean1 numeric;
    v_m2_1 numeric;
    v_ema1 numeric;
begin
    -- Fetch booking and verify membership
    select * into v_booking from public.bookings where id = p_booking_id;
    if not exists (select 1 from public.v_membership where user_id = auth.uid() and org_id = v_booking.org_id) then
        raise exception 'Forbidden';
    end if;

    -- Ensure signature exists
    if v_booking.est_signature is null then
        if v_booking.est_payload is null then
            return json_build_object('status', 'error', 'message', 'Missing payload for signature generation');
        end if;
        v_sig := public.make_est_signature(v_booking.service_id, v_booking.est_payload);
        update public.bookings set est_signature = v_sig where id = p_booking_id;
    else
        v_sig := v_booking.est_signature;
    end if;

    -- Load settings and stats
    select est_outlier_sigma, est_min_samples, est_hist_weight into v_settings from public.orgs where id = v_booking.org_id;
    select * into v_stats from public.duration_stats where org_id = v_booking.org_id and service_id = v_booking.service_id and signature = v_sig;
    
    if v_stats.n is null then
      v_stats.n := 0;
      v_stats.mean_min := 0;
      v_stats.m2 := 0;
    end if;

    -- Check for outliers
    if v_stats.n > 1 then
        v_variance := v_stats.m2 / (v_stats.n - 1);
        v_std := sqrt(v_variance);
    else
        v_std := null;
    end if;

    if v_stats.n >= v_settings.est_min_samples and v_std is not null and v_std > 0 and abs(p_actual_minutes - v_stats.mean_min) > v_settings.est_outlier_sigma * v_std then
        insert into public.duration_outliers (org_id, service_id, signature, booking_id, observed_min, mean_at_obs, std_at_obs)
        values (v_booking.org_id, v_booking.service_id, v_sig, p_booking_id, p_actual_minutes, v_stats.mean_min, v_std);
        
        update public.bookings set actual_minutes = p_actual_minutes where id = p_booking_id;
        return json_build_object('status', 'ignored_outlier');
    end if;

    -- Welford's algorithm for online variance and mean
    v_n1 := v_stats.n + 1;
    v_delta := p_actual_minutes - v_stats.mean_min;
    v_mean1 := v_stats.mean_min + v_delta / v_n1;
    v_m2_1 := v_stats.m2 + v_delta * (p_actual_minutes - v_mean1);
    
    -- Exponential Moving Average
    if v_stats.ema_min is null then
      v_ema1 := p_actual_minutes;
    else
      v_ema1 := (v_settings.est_hist_weight * p_actual_minutes) + ((1 - v_settings.est_hist_weight) * v_stats.ema_min);
    end if;

    -- Upsert stats
    insert into public.duration_stats (org_id, service_id, signature, n, mean_min, m2, ema_min, last_min, updated_at)
    values (v_booking.org_id, v_booking.service_id, v_sig, v_n1, v_mean1, v_m2_1, v_ema1, p_actual_minutes, now())
    on conflict (org_id, service_id, signature) do update
    set n = v_n1,
        mean_min = v_mean1,
        m2 = v_m2_1,
        ema_min = v_ema1,
        last_min = p_actual_minutes,
        updated_at = now();
        
    -- Update booking
    update public.bookings set actual_minutes = p_actual_minutes where id = p_booking_id;

    return json_build_object('status', 'ok', 'n', v_n1, 'mean', v_mean1, 'ema', v_ema1);
end;
$$;

grant execute on function public.record_actual_duration(uuid, int) to authenticated;