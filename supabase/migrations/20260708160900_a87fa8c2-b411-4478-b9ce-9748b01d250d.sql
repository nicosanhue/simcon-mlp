CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  weekly_report_id uuid REFERENCES public.weekly_reports(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('Vibraciones','Termografia','Ultrasonido')),
  week_number int NOT NULL,
  year int NOT NULL,
  fecha_inspeccion date NOT NULL DEFAULT CURRENT_DATE,
  tecnico text,
  hallazgos text,
  recomendacion text,
  status_resultante public.equipment_status NOT NULL DEFAULT 'Satisfactorio',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_equipment ON public.reports(equipment_id);
CREATE INDEX idx_reports_tipo ON public.reports(tipo);
CREATE INDEX idx_reports_week ON public.reports(year, week_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert to reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to reports" ON public.reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to reports" ON public.reports FOR DELETE USING (true);

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_photos_report ON public.report_photos(report_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_photos TO anon, authenticated;
GRANT ALL ON public.report_photos TO service_role;
ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to report_photos" ON public.report_photos FOR SELECT USING (true);
CREATE POLICY "Allow public insert to report_photos" ON public.report_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to report_photos" ON public.report_photos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to report_photos" ON public.report_photos FOR DELETE USING (true);

CREATE POLICY "Public read report-photos" ON storage.objects FOR SELECT USING (bucket_id = 'report-photos');
CREATE POLICY "Public insert report-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'report-photos');
CREATE POLICY "Public update report-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'report-photos');
CREATE POLICY "Public delete report-photos" ON storage.objects FOR DELETE USING (bucket_id = 'report-photos');