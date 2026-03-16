
-- Rename enum values for equipment_status
ALTER TYPE public.equipment_status RENAME VALUE 'Operativo' TO 'Satisfactorio';
ALTER TYPE public.equipment_status RENAME VALUE 'Stand By' TO 'Seguimiento';
ALTER TYPE public.equipment_status RENAME VALUE 'Falla' TO 'Crítico';

-- Update default value for weekly_reports.status
ALTER TABLE public.weekly_reports ALTER COLUMN status SET DEFAULT 'Satisfactorio'::equipment_status;
