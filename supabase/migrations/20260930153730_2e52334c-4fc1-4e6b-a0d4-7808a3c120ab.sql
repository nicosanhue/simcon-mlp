CREATE TABLE public.str_stations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL, order_index integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.str_stations TO anon, authenticated;
GRANT ALL ON public.str_stations TO service_role;
ALTER TABLE public.str_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "str_stations_access" ON public.str_stations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER str_stations_updated BEFORE UPDATE ON public.str_stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.str_spools (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), station_id uuid NOT NULL REFERENCES public.str_stations(id) ON DELETE CASCADE, spool_number integer, tag text NOT NULL, branch public.stc_branch NOT NULL DEFAULT 'principal', order_index integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.str_spools TO anon, authenticated;
GRANT ALL ON public.str_spools TO service_role;
ALTER TABLE public.str_spools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "str_spools_access" ON public.str_spools FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX str_spools_station_idx ON public.str_spools(station_id);
CREATE TRIGGER str_spools_updated BEFORE UPDATE ON public.str_spools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.str_temperature_readings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), spool_id uuid NOT NULL REFERENCES public.str_spools(id) ON DELETE CASCADE, week_number integer NOT NULL, year integer NOT NULL, delta_t numeric(5,2), t_max numeric(6,2), t_min numeric(6,2), measured_at date, confirmed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (spool_id, week_number, year));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.str_temperature_readings TO anon, authenticated;
GRANT ALL ON public.str_temperature_readings TO service_role;
ALTER TABLE public.str_temperature_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "str_readings_access" ON public.str_temperature_readings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX str_readings_week_idx ON public.str_temperature_readings(year, week_number);
CREATE TRIGGER str_readings_updated BEFORE UPDATE ON public.str_temperature_readings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.str_tracking_weeks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), week_number integer NOT NULL, year integer NOT NULL, published boolean NOT NULL DEFAULT false, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (week_number, year));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.str_tracking_weeks TO anon, authenticated;
GRANT ALL ON public.str_tracking_weeks TO service_role;
ALTER TABLE public.str_tracking_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "str_weeks_access" ON public.str_tracking_weeks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER str_weeks_updated BEFORE UPDATE ON public.str_tracking_weeks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.str_custom_charts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, spool_ids uuid[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.str_custom_charts TO anon, authenticated;
GRANT ALL ON public.str_custom_charts TO service_role;
ALTER TABLE public.str_custom_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "str_charts_access" ON public.str_custom_charts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER str_charts_updated BEFORE UPDATE ON public.str_custom_charts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();