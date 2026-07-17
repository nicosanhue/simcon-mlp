CREATE TYPE public.stc_branch AS ENUM ('principal','variable_emergencia');

CREATE TABLE public.stc_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stc_stations TO authenticated, anon;
GRANT ALL ON public.stc_stations TO service_role;
ALTER TABLE public.stc_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stc_stations_all" ON public.stc_stations FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.stc_spools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stc_stations(id) ON DELETE CASCADE,
  spool_number INT,
  tag TEXT NOT NULL,
  branch public.stc_branch NOT NULL DEFAULT 'principal',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stc_spools_station ON public.stc_spools(station_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stc_spools TO authenticated, anon;
GRANT ALL ON public.stc_spools TO service_role;
ALTER TABLE public.stc_spools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stc_spools_all" ON public.stc_spools FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.stc_temperature_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spool_id UUID NOT NULL REFERENCES public.stc_spools(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  year INT NOT NULL,
  delta_t NUMERIC(5,2),
  t_max NUMERIC(6,2),
  t_min NUMERIC(6,2),
  measured_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (spool_id, week_number, year)
);
CREATE INDEX idx_stc_readings_week ON public.stc_temperature_readings(year, week_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stc_temperature_readings TO authenticated, anon;
GRANT ALL ON public.stc_temperature_readings TO service_role;
ALTER TABLE public.stc_temperature_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stc_readings_all" ON public.stc_temperature_readings FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER stc_stations_updated BEFORE UPDATE ON public.stc_stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER stc_spools_updated BEFORE UPDATE ON public.stc_spools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER stc_readings_updated BEFORE UPDATE ON public.stc_temperature_readings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();