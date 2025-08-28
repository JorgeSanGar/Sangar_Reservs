-- Add timezone and config_version to orgs table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orgs' AND column_name = 'timezone') THEN
    ALTER TABLE public.orgs ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/Madrid';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orgs' AND column_name = 'config_version') THEN
    ALTER TABLE public.orgs ADD COLUMN config_version INT NOT NULL DEFAULT 1;
  END IF;
END;
$$;

-- Create working_hours table
CREATE TABLE IF NOT EXISTS public.working_hours (
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, weekday, COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'), effective_from),
  CONSTRAINT close_after_open CHECK (close_time > open_time),
  CONSTRAINT effective_to_after_from CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_org_weekday ON public.working_hours(org_id, weekday);
CREATE INDEX IF NOT EXISTS idx_working_hours_effective_dates ON public.working_hours(org_id, effective_from, effective_to);

-- Trigger function to validate breaks
CREATE OR REPLACE FUNCTION public.validate_working_hours_breaks()
RETURNS TRIGGER AS $$
DECLARE
  break_item JSONB;
  break_start TIME;
  break_end TIME;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.updated_at = NOW();
    FOR break_item IN SELECT * FROM jsonb_array_elements(NEW.breaks)
    LOOP
      break_start := (break_item->>'start')::TIME;
      break_end := (break_item->>'end')::TIME;
      IF break_start >= break_end THEN
        RAISE EXCEPTION 'Break start time must be before its end time.';
      END IF;
      IF break_start < NEW.open_time OR break_end > NEW.close_time THEN
        RAISE EXCEPTION 'Breaks must be within the open and close times.';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate breaks
DROP TRIGGER IF EXISTS trg_validate_breaks ON public.working_hours;
CREATE TRIGGER trg_validate_breaks
BEFORE INSERT OR UPDATE ON public.working_hours
FOR EACH ROW EXECUTE FUNCTION public.validate_working_hours_breaks();

-- Trigger function to bump org config version
CREATE OR REPLACE FUNCTION public.bump_org_config_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.orgs SET config_version = config_version + 1 WHERE id = NEW.org_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.orgs SET config_version = config_version + 1 WHERE id = OLD.org_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to bump config version
DROP TRIGGER IF EXISTS trg_bump_config_version ON public.working_hours;
CREATE TRIGGER trg_bump_config_version
AFTER INSERT OR UPDATE OR DELETE ON public.working_hours
FOR EACH ROW EXECUTE FUNCTION public.bump_org_config_version();