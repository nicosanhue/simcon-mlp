ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS gerencia text,
  ADD COLUMN IF NOT EXISTS proceso_area text,
  ADD COLUMN IF NOT EXISTS ot_numero text,
  ADD COLUMN IF NOT EXISTS aviso_sap text,
  ADD COLUMN IF NOT EXISTS fecha_informe date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS condicion_general text;

CREATE TABLE IF NOT EXISTS public.report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  equipo_tag text,
  componente text NOT NULL,
  analisis_tecnico text,
  diagnostico text,
  recomendacion text,
  condicion text NOT NULL DEFAULT 'Satisfactorio',
  aviso_sap text,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_items TO anon, authenticated;
GRANT ALL ON public.report_items TO service_role;

ALTER TABLE public.report_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read report_items" ON public.report_items FOR SELECT USING (true);
CREATE POLICY "Public insert report_items" ON public.report_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update report_items" ON public.report_items FOR UPDATE USING (true);
CREATE POLICY "Public delete report_items" ON public.report_items FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_report_items_report_id ON public.report_items(report_id);

CREATE TRIGGER update_report_items_updated_at
BEFORE UPDATE ON public.report_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();