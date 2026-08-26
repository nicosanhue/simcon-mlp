CREATE TABLE public.lub_equipment_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL UNIQUE REFERENCES public.equipment(id) ON DELETE CASCADE,
  sap_number text,
  tipo text,
  descripcion text,
  has_motor boolean NOT NULL DEFAULT false,
  has_portarodamiento boolean NOT NULL DEFAULT false,
  has_reductor boolean NOT NULL DEFAULT false,
  has_descanso boolean NOT NULL DEFAULT false,
  acop_alta_tipo text,
  acop_alta_grasa text,
  acop_alta_cantidad numeric,
  acop_alta_frecuencia text,
  acop_baja_tipo text,
  acop_baja_grasa text,
  acop_baja_cantidad numeric,
  acop_baja_frecuencia text,
  motor_tipo_lub text,
  motor_desc_ll text,
  motor_desc_ll_cant numeric,
  motor_desc_la text,
  motor_desc_la_cant numeric,
  motor_sello_ll text,
  motor_sello_ll_cant numeric,
  motor_sello_la text,
  motor_sello_la_cant numeric,
  motor_frecuencia text,
  reductor_aceite text,
  reductor_capacidad numeric,
  reductor_sello_ll text,
  reductor_sello_ll_cant numeric,
  reductor_sello_la text,
  reductor_sello_la_cant numeric,
  reductor_frecuencia text,
  porta_tipo_lub text,
  porta_desc_ll text,
  porta_desc_ll_cant numeric,
  porta_desc_la text,
  porta_desc_la_cant numeric,
  porta_sello_ll text,
  porta_sello_ll_cant numeric,
  porta_sello_la text,
  porta_sello_la_cant numeric,
  porta_frecuencia text,
  descanso_condicion text,
  descanso_grasa text,
  descanso_cantidad numeric,
  descanso_frecuencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lub_equipment_data TO anon, authenticated;
GRANT ALL ON public.lub_equipment_data TO service_role;
ALTER TABLE public.lub_equipment_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access lub_equipment_data" ON public.lub_equipment_data FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER lub_equipment_data_updated BEFORE UPDATE ON public.lub_equipment_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lub_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  valor text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria, valor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lub_options TO anon, authenticated;
GRANT ALL ON public.lub_options TO service_role;
ALTER TABLE public.lub_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access lub_options" ON public.lub_options FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.lub_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lub_photos TO anon, authenticated;
GRANT ALL ON public.lub_photos TO service_role;
ALTER TABLE public.lub_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access lub_photos" ON public.lub_photos FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.lub_manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  nombre text NOT NULL,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lub_manuals TO anon, authenticated;
GRANT ALL ON public.lub_manuals TO service_role;
ALTER TABLE public.lub_manuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access lub_manuals" ON public.lub_manuals FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.lub_options (categoria, valor, orden) VALUES
('aceite','Shell Tellus 32',1),
('aceite','Shell Turbo T68',2),
('aceite','SHEL Omala S2 GX 150 Mineral',3),
('aceite','SHEL Omala S2 GX 220 Mineral',4),
('aceite','SHEL Omala S2 GX 320 Mineral',5),
('aceite','SHEL Omala S4 GX 460 sintetico',6),
('grasa','PolyRem EM 103',1),
('grasa','Shell Gadus S2',2),
('grasa','Grasa Acoplamientos',3),
('grasa','Sintética Alta Temp.',4),
('grasa','Sellado',5),
('frecuencia','250 hrs',1),
('frecuencia','500 hrs',2),
('frecuencia','1000 hrs',3),
('frecuencia','2000 hrs',4),
('frecuencia','4000 hrs',5),
('frecuencia','Según análisis',6),
('frecuencia','Inspección visual',7),
('acoplamiento','Grilla',1),
('acoplamiento','Machones',2),
('acoplamiento','Rígido',3),
('acoplamiento','Omega',4),
('acoplamiento','Hidraulico',5),
('tipo_equipo','Bomba',1),
('tipo_equipo','Motor',2),
('tipo_equipo','Correa',3),
('tipo_equipo','Harnero',4),
('tipo_equipo','Reductor',5),
('tipo_equipo','Ventilador',6);