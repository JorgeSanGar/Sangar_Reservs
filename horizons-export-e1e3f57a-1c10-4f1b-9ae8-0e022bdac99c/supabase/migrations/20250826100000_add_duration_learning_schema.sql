-- Helper function to generate a stable signature for a booking payload
create or replace function public.make_est_signature(service uuid, payload jsonb)
returns text language sql stable as $$
  select encode(digest(
    service::text || '|' ||
    coalesce(payload->>'category', '') || '|' ||
    coalesce(payload->>'wheels', '') || '|' ||
    coalesce((payload->'options')::text, ''),
    'sha256'
  ), 'hex');
$$;

-- Add learning-related columns to orgs table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orgs' and column_name = 'est_margin_pct') then
        alter table public.orgs add column est_margin_pct numeric(4,1) not null default 7.5 check (est_margin_pct between 0 and 20);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orgs' and column_name = 'est_hist_weight') then
        alter table public.orgs add column est_hist_weight numeric(3,2) not null default 0.40 check (est_hist_weight between 0 and 1);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orgs' and column_name = 'est_outlier_sigma') then
        alter table public.orgs add column est_outlier_sigma numeric(3,1) not null default 2.5;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orgs' and column_name = 'est_min_samples') then
        alter table public.orgs add column est_min_samples int not null default 5;
    end if;
end $$;

-- Add columns to bookings for storing actual times and payload signature
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'actual_minutes') then
        alter table public.bookings add column actual_minutes int null check (actual_minutes > 0 and actual_minutes <= 600);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'est_payload') then
        alter table public.bookings add column est_payload jsonb null;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'est_signature') then
        alter table public.bookings add column est_signature text null;
    end if;
end $$;

create index if not exists idx_bookings_signature on public.bookings(est_signature);

-- Table to store duration statistics per service/pattern
create table if not exists public.duration_stats (
    org_id uuid not null references public.orgs on delete cascade,
    service_id uuid not null references public.services on delete cascade,
    signature text not null,
    n int not null default 0,
    mean_min numeric not null default 0,
    m2 numeric not null default 0, -- Sum of squares of differences from the current mean
    ema_min numeric null, -- Exponential Moving Average
    last_min int null,
    updated_at timestamptz not null default now(),
    primary key (org_id, service_id, signature)
);
create index if not exists idx_duration_stats_org_service on public.duration_stats(org_id, service_id);

-- Table to log duration outliers for later analysis
create table if not exists public.duration_outliers (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null,
    service_id uuid not null,
    signature text not null,
    booking_id uuid not null references public.bookings on delete cascade,
    observed_min int not null,
    mean_at_obs numeric null,
    std_at_obs numeric null,
    created_at timestamptz not null default now()
);