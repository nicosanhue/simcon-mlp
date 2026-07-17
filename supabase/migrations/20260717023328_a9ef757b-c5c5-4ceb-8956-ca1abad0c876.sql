-- Track publication state per STC tracking week
CREATE TABLE public.stc_tracking_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number integer NOT NULL,
  year integer NOT NULL,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_number, year)
);

GRANT SELECT ON public.stc_tracking_weeks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stc_tracking_weeks TO authenticated;
GRANT ALL ON public.stc_tracking_weeks TO service_role;

ALTER TABLE public.stc_tracking_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stc_tracking_weeks"
  ON public.stc_tracking_weeks FOR SELECT
  USING (true);

CREATE POLICY "Public insert stc_tracking_weeks"
  ON public.stc_tracking_weeks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update stc_tracking_weeks"
  ON public.stc_tracking_weeks FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Public delete stc_tracking_weeks"
  ON public.stc_tracking_weeks FOR DELETE
  USING (true);

CREATE TRIGGER trg_stc_tracking_weeks_updated
  BEFORE UPDATE ON public.stc_tracking_weeks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Confirmation flag per reading
ALTER TABLE public.stc_temperature_readings
  ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false;

-- Backfill: mark existing readings as confirmed AND publish existing weeks so nothing disappears from the read-only view.
UPDATE public.stc_temperature_readings SET confirmed = true;

INSERT INTO public.stc_tracking_weeks (week_number, year, published, published_at)
SELECT DISTINCT week_number, year, true, now()
FROM public.stc_temperature_readings
ON CONFLICT (week_number, year) DO UPDATE SET published = true, published_at = COALESCE(public.stc_tracking_weeks.published_at, now());
