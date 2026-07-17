
CREATE TABLE public.stc_custom_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  spool_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stc_custom_charts TO anon, authenticated;
GRANT ALL ON public.stc_custom_charts TO service_role;

ALTER TABLE public.stc_custom_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access stc_custom_charts"
ON public.stc_custom_charts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_stc_custom_charts_updated_at
BEFORE UPDATE ON public.stc_custom_charts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
