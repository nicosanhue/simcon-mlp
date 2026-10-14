ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS sistema_temp text,
  ADD COLUMN IF NOT EXISTS inspectores text,
  ADD COLUMN IF NOT EXISTS resultado_inspeccion text,
  ADD COLUMN IF NOT EXISTS semana_temp integer,
  ADD COLUMN IF NOT EXISTS anio_temp integer,
  ADD COLUMN IF NOT EXISTS ordenes_tags jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.report_station_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  station_code text NOT NULL,
  spool_tag text NOT NULL,
  storage_path text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_station_photos TO anon, authenticated;
GRANT ALL ON public.report_station_photos TO service_role;
ALTER TABLE public.report_station_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_station_photos_access" ON public.report_station_photos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);