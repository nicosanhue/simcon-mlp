-- Create enum for equipment status
CREATE TYPE public.equipment_status AS ENUM ('Operativo', 'Stand By', 'Falla', 'Alerta');

-- Create enum for criticality levels
CREATE TYPE public.criticality_level AS ENUM ('Alta', 'Media', 'Baja');

-- Areas table (e.g., Puerto Desaladora, TF, Tranque Mauro)
CREATE TABLE public.areas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Systems table (children of Areas)
CREATE TABLE public.systems (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(area_id, name)
);

-- Equipment (Assets) table (children of Systems)
CREATE TABLE public.equipment (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
    tag TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    criticality public.criticality_level NOT NULL DEFAULT 'Media',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weekly Reports table (transactional table)
CREATE TABLE public.weekly_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    status public.equipment_status NOT NULL DEFAULT 'Operativo',
    sap_notification TEXT,
    sap_order TEXT,
    technical_description TEXT,
    planned_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(equipment_id, week_number, year)
);

-- Create indexes for better query performance
CREATE INDEX idx_systems_area_id ON public.systems(area_id);
CREATE INDEX idx_equipment_system_id ON public.equipment(system_id);
CREATE INDEX idx_equipment_tag ON public.equipment(tag);
CREATE INDEX idx_weekly_reports_equipment_id ON public.weekly_reports(equipment_id);
CREATE INDEX idx_weekly_reports_week_year ON public.weekly_reports(week_number, year);
CREATE INDEX idx_weekly_reports_status ON public.weekly_reports(status);

-- Enable Row Level Security on all tables
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (this is an internal tool, all authenticated users can read)
CREATE POLICY "Allow public read access to areas" ON public.areas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to systems" ON public.systems FOR SELECT USING (true);
CREATE POLICY "Allow public read access to equipment" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "Allow public read access to weekly_reports" ON public.weekly_reports FOR SELECT USING (true);

-- Create RLS policies for public insert/update/delete (internal tool)
CREATE POLICY "Allow public insert to areas" ON public.areas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to areas" ON public.areas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to areas" ON public.areas FOR DELETE USING (true);

CREATE POLICY "Allow public insert to systems" ON public.systems FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to systems" ON public.systems FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to systems" ON public.systems FOR DELETE USING (true);

CREATE POLICY "Allow public insert to equipment" ON public.equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to equipment" ON public.equipment FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to equipment" ON public.equipment FOR DELETE USING (true);

CREATE POLICY "Allow public insert to weekly_reports" ON public.weekly_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to weekly_reports" ON public.weekly_reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to weekly_reports" ON public.weekly_reports FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_systems_updated_at BEFORE UPDATE ON public.systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekly_reports_updated_at BEFORE UPDATE ON public.weekly_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for Areas
INSERT INTO public.areas (name, description) VALUES
    ('Puerto Desaladora', 'Área de desalación y puerto marítimo'),
    ('TF', 'Instalaciones de procesamiento TF'),
    ('Tranque Mauro', 'Área de depósito de relaves Tranque Mauro');

-- Insert sample data for Systems
INSERT INTO public.systems (area_id, name, description) 
SELECT a.id, s.name, s.description
FROM public.areas a
CROSS JOIN (VALUES 
    ('Puerto Desaladora', 'Espesadores', 'Sistema de espesamiento de material'),
    ('Puerto Desaladora', 'Bombas de Arenas', 'Sistema de bombeo de arenas'),
    ('Puerto Desaladora', 'ShipLoader', 'Sistema de carga de barcos'),
    ('TF', 'Chancadores', 'Sistema de chancado primario'),
    ('TF', 'Correas Transportadoras', 'Sistema de transporte de material'),
    ('Tranque Mauro', 'Bombas de Pulpa', 'Sistema de bombeo de pulpa'),
    ('Tranque Mauro', 'Ciclones', 'Sistema de clasificación por ciclones')
) AS s(area_name, name, description)
WHERE a.name = s.area_name;

-- Insert sample equipment
INSERT INTO public.equipment (system_id, tag, name, criticality)
SELECT s.id, e.tag, e.name, e.criticality::criticality_level
FROM public.systems s
JOIN public.areas a ON s.area_id = a.id
CROSS JOIN (VALUES
    ('Puerto Desaladora', 'Espesadores', '370PP089', 'Bomba Centrifuga Espesador 1', 'Alta'),
    ('Puerto Desaladora', 'Espesadores', '370PP090', 'Bomba Centrifuga Espesador 2', 'Alta'),
    ('Puerto Desaladora', 'Bombas de Arenas', '370PP091', 'Bomba de Arenas Principal', 'Alta'),
    ('Puerto Desaladora', 'ShipLoader', '370SL001', 'Cargador de Barcos 1', 'Media'),
    ('TF', 'Chancadores', 'TK020', 'Chancador Primario', 'Alta'),
    ('TF', 'Chancadores', 'TK021', 'Chancador Secundario', 'Media'),
    ('TF', 'Correas Transportadoras', 'CV001', 'Correa Principal Norte', 'Alta'),
    ('TF', 'Correas Transportadoras', 'CV002', 'Correa Principal Sur', 'Media'),
    ('Tranque Mauro', 'Bombas de Pulpa', 'TM-PP001', 'Bomba de Pulpa 1', 'Alta'),
    ('Tranque Mauro', 'Bombas de Pulpa', 'TM-PP002', 'Bomba de Pulpa 2', 'Alta'),
    ('Tranque Mauro', 'Ciclones', 'TM-CY001', 'Ciclon Clasificador 1', 'Media')
) AS e(area_name, system_name, tag, name, criticality)
WHERE a.name = e.area_name AND s.name = e.system_name;

-- Insert sample weekly reports for current week
INSERT INTO public.weekly_reports (equipment_id, week_number, year, status, sap_notification, sap_order, technical_description, planned_date)
SELECT 
    eq.id,
    EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    CASE 
        WHEN eq.tag IN ('370PP089', 'TK020', 'CV001') THEN 'Operativo'::equipment_status
        WHEN eq.tag IN ('370PP090', 'TM-PP001') THEN 'Alerta'::equipment_status
        WHEN eq.tag = 'TM-PP002' THEN 'Falla'::equipment_status
        ELSE 'Stand By'::equipment_status
    END,
    CASE 
        WHEN eq.tag = '370PP090' THEN '10045678'
        WHEN eq.tag = 'TM-PP001' THEN '10045679'
        WHEN eq.tag = 'TM-PP002' THEN '10045680'
        ELSE NULL
    END,
    CASE 
        WHEN eq.tag = 'TM-PP002' THEN 'ORD-2025-001'
        ELSE NULL
    END,
    CASE 
        WHEN eq.tag = '370PP090' THEN 'Lubricar portarodamientos - vibración detectada'
        WHEN eq.tag = 'TM-PP001' THEN 'Fuga sello mecánico - monitorear'
        WHEN eq.tag = 'TM-PP002' THEN 'Desbalance motor - requiere intervención'
        ELSE NULL
    END,
    CASE 
        WHEN eq.tag = 'TM-PP002' THEN CURRENT_DATE + INTERVAL '3 days'
        ELSE NULL
    END
FROM public.equipment eq;