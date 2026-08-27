ALTER TABLE public.lub_equipment_data
  ADD COLUMN IF NOT EXISTS acop_alta_aceite text,
  ADD COLUMN IF NOT EXISTS acop_baja_aceite text,
  ADD COLUMN IF NOT EXISTS motor_desc_frecuencia text,
  ADD COLUMN IF NOT EXISTS motor_sello_frecuencia text,
  ADD COLUMN IF NOT EXISTS porta_desc_frecuencia text,
  ADD COLUMN IF NOT EXISTS porta_sello_frecuencia text,
  ADD COLUMN IF NOT EXISTS reductor_aceite_frecuencia text,
  ADD COLUMN IF NOT EXISTS descanso_sello_ll text,
  ADD COLUMN IF NOT EXISTS descanso_sello_ll_cant numeric,
  ADD COLUMN IF NOT EXISTS descanso_sello_frecuencia text;