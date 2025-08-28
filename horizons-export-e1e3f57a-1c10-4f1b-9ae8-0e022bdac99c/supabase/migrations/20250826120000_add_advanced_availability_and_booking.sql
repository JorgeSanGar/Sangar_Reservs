-- Part A: Schema enhancements for minute-by-minute availability

-- Add timespan column to booking_resources if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_resources' AND column_name = 'timespan') THEN
    ALTER TABLE public.booking_resources ADD COLUMN timespan TSTZRANGE;
  END IF;
END;
$$;

-- Trigger function to set the timespan from the parent booking
CREATE OR REPLACE FUNCTION public.br_set_timespan()
RETURNS TRIGGER AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  SELECT start_time, end_time
  INTO v_start_time, v_end_time
  FROM public.bookings
  WHERE id = NEW.booking_id;

  IF v_start_time IS NOT NULL AND v_end_time IS NOT NULL THEN
    NEW.timespan := tstzrange(v_start_time, v_end_time, '[)');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS trg_br_set_timespan ON public.booking_resources;

-- Create the trigger
CREATE TRIGGER trg_br_set_timespan
BEFORE INSERT OR UPDATE ON public.booking_resources
FOR EACH ROW EXECUTE FUNCTION public.br_set_timespan();

-- Add exclusion constraint to prevent resource overlapping
-- We must first drop it to avoid errors on re-run
ALTER TABLE public.booking_resources DROP CONSTRAINT IF EXISTS br_no_overlap;
ALTER TABLE public.booking_resources ADD CONSTRAINT br_no_overlap 
EXCLUDE USING GIST (resource_id WITH =, timespan WITH &&) WHERE (timespan IS NOT NULL);

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_booking_resources_gist ON public.booking_resources USING GIST (resource_id, timespan);
CREATE INDEX IF NOT EXISTS idx_bookings_org_start_time ON public.bookings(org_id, start_time);