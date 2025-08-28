-- Create missing tables that are referenced in the application

-- Create users table if it doesn't exist (for storing user profiles)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create orgs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  config_version INT NOT NULL DEFAULT 1,
  est_margin_pct NUMERIC(4,1) NOT NULL DEFAULT 7.5 CHECK (est_margin_pct BETWEEN 0 AND 20),
  est_hist_weight NUMERIC(3,2) NOT NULL DEFAULT 0.40 CHECK (est_hist_weight BETWEEN 0 AND 1),
  est_outlier_sigma NUMERIC(3,1) NOT NULL DEFAULT 2.5,
  est_min_samples INT NOT NULL DEFAULT 5,
  arrival_checkin_min INT NOT NULL DEFAULT 5,
  arrival_wait_max_min INT NOT NULL DEFAULT 10,
  arrival_early_cap_wait_min INT NOT NULL DEFAULT 15,
  arrival_drop_window_before_min INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create org_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.org_members (
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'worker')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Create services table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_min INT NOT NULL DEFAULT 45,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  buffer_before_min INT NOT NULL DEFAULT 0,
  buffer_after_min INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create service_resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.service_resources (
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  required_units INT NOT NULL DEFAULT 1,
  PRIMARY KEY (service_id, resource_id)
);

-- Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  notes_internal TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'in_service', 'done', 'no_show', 'cancelled')),
  actual_minutes INT CHECK (actual_minutes > 0 AND actual_minutes <= 600),
  est_payload JSONB,
  est_signature TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  deleted_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Create booking_resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.booking_resources (
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  timespan TSTZRANGE,
  PRIMARY KEY (booking_id, resource_id)
);

-- Create invite_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create blackout_dates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  blackout_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, blackout_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_services_org_id ON public.services(org_id);
CREATE INDEX IF NOT EXISTS idx_resources_org_id ON public.resources(org_id);
CREATE INDEX IF NOT EXISTS idx_bookings_org_id_start_time ON public.bookings(org_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_signature ON public.bookings(est_signature);
CREATE INDEX IF NOT EXISTS idx_booking_resources_gist ON public.booking_resources USING GIST (resource_id, timespan);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_entity ON public.audit_logs(org_id, entity);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for orgs table
DROP POLICY IF EXISTS "Org members can read org" ON public.orgs;
CREATE POLICY "Org members can read org" ON public.orgs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can update org" ON public.orgs;
CREATE POLICY "Managers can update org" ON public.orgs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = id AND om.user_id = auth.uid() AND om.role = 'manager'
    )
  );

-- RLS Policies for org_members table
DROP POLICY IF EXISTS "Org members can read members" ON public.org_members;
CREATE POLICY "Org members can read members" ON public.org_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can manage members" ON public.org_members;
CREATE POLICY "Managers can manage members" ON public.org_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role = 'manager'
    )
  );

-- RLS Policies for services table
DROP POLICY IF EXISTS "Org members can read services" ON public.services;
CREATE POLICY "Org members can read services" ON public.services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can manage services" ON public.services;
CREATE POLICY "Managers can manage services" ON public.services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role = 'manager'
    )
  );

-- RLS Policies for resources table
DROP POLICY IF EXISTS "Org members can read resources" ON public.resources;
CREATE POLICY "Org members can read resources" ON public.resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can manage resources" ON public.resources;
CREATE POLICY "Org members can manage resources" ON public.resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for bookings table
DROP POLICY IF EXISTS "Org members can read bookings" ON public.bookings;
CREATE POLICY "Org members can read bookings" ON public.bookings
  FOR SELECT USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can manage bookings" ON public.bookings;
CREATE POLICY "Org members can manage bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for booking_resources table
DROP POLICY IF EXISTS "Org members can manage booking resources" ON public.booking_resources;
CREATE POLICY "Org members can manage booking resources" ON public.booking_resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.org_members om ON om.org_id = b.org_id
      WHERE b.id = booking_id AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for invite_codes table
DROP POLICY IF EXISTS "Managers can manage invite codes" ON public.invite_codes;
CREATE POLICY "Managers can manage invite codes" ON public.invite_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role = 'manager'
    )
  );

DROP POLICY IF EXISTS "Anyone can read unused invite codes" ON public.invite_codes;
CREATE POLICY "Anyone can read unused invite codes" ON public.invite_codes
  FOR SELECT USING (used = false);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orgs_updated_at ON public.orgs;
CREATE TRIGGER update_orgs_updated_at
  BEFORE UPDATE ON public.orgs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();