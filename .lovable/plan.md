## Objetivo

Añadir un módulo de **Informes técnicos** al dashboard principal, con clasificación por tipo (Vibraciones / Termografía / Ultrasonido), generación de PDF (≤ 1 MB), repositorio consultable y visibilidad desde cada equipo. Los equipos en **Crítico** o **Alerta** que no tengan informe quedan marcados con advertencia visible.

Este alcance es adicional al plan de Lubricación previamente aprobado; se implementa en el dashboard principal (`equipment` + `weekly_reports`), no en Lubricación.

## Modelo de datos

Nueva tabla `public.reports`:

```text
reports (
  id uuid pk
  equipment_id uuid fk -> equipment(id)
  weekly_report_id uuid null fk -> weekly_reports(id)   -- opcional, si se emite por un reporte semanal
  tipo text check in ('Vibraciones','Termografia','Ultrasonido')
  week_number int, year int
  fecha_inspeccion date
  tecnico text
  hallazgos text
  recomendacion text
  status_resultante equipment_status   -- reutiliza enum existente
  created_at, updated_at
)
```

Nueva tabla `report_photos` (fotos comprimidas embebidas en el PDF):

```text
report_photos (
  id uuid pk
  report_id uuid fk -> reports(id) on delete cascade
  storage_path text        -- ruta en bucket 'report-photos'
  caption text
  orden int
  created_at
)
```

- Bucket de Storage: `report-photos` (privado, con policy pública de lectura o URLs firmadas).
- Todas las tablas con GRANT + RLS pública consistente con el resto del proyecto.
- Índices: `(equipment_id)`, `(tipo)`, `(year, week_number)`.

## UI / Rutas

1. **Nueva ruta `/reports`** ("Informes") en el sidebar (icono `FileText`), con:
   - Filtros: tipo, área, equipo, semana/año, estado.
   - Buscador por Tag/Nombre.
   - Tabla listando todos los informes con acciones **Ver**, **Descargar PDF**, **Editar**, **Eliminar**.
   - Botón **"+ Nuevo informe"**.
2. **Modal "Nuevo/Editar informe"**:
   - Select equipo (con buscador), tipo (Vibraciones / Termografía / Ultrasonido), fecha, semana/año, técnico.
   - Campos de texto: hallazgos, recomendación.
   - Selector de estado resultante (Satisfactorio/Seguimiento/Alerta/Crítico).
   - Uploader de fotos (múltiple). Antes de subir se comprimen en el cliente con `canvas` (resize a 1280 px y `image/jpeg` q≈0.7) para asegurar que el PDF final quede ≤ 1 MB.
3. **Descarga PDF** con `jspdf` + plantilla en el cliente:
   - Encabezado con logo Los Pelambres, Tag/Nombre equipo, tipo, fecha, semana/año, técnico.
   - Secciones: hallazgos, recomendación, fotos (con caption).
   - Validación final: si el blob > 1 MB, se re-comprimen fotos a menor calidad iterativamente hasta cumplir.
4. **Dashboard principal**:
   - Al abrir un equipo (modal/detalle actual de `CriticalAlertsList` o nuevo drawer sobre las tarjetas), se muestra la sección **"Informes"** con la lista de informes de ese equipo (tipo, fecha, botón Descargar PDF).
   - Botón **"+ Nuevo informe"** dentro del detalle del equipo.
5. **Advertencia Crítico/Alerta sin informe**:
   - En `CriticalAlertsList` (Dashboard) y en la fila del equipo, mostrar badge amarillo **"Informe pendiente"** cuando el reporte de la semana seleccionada esté en Crítico/Alerta y no exista `report` con misma `week_number`/`year`/`equipment_id`.
   - Contador en el header del Dashboard: *"N equipos Crítico/Alerta sin informe"*.

## Detalles técnicos

- Nuevo hook `useReports.ts` con queries y mutations (react-query).
- Generación PDF: `jspdf` + `jspdf-autotable`; fotos como `addImage` con formato JPEG.
- Compresión cliente: helper `compressImage(file, maxWidth=1280, quality=0.7)`.
- Subida a Storage: `supabase.storage.from('report-photos').upload(...)`; se guarda `storage_path`, no URL pública, para poder rotar.
- En listados se genera URL firmada de 1h para previsualizar.
- El tipo `equipment_status` ya existe y se reutiliza.
- La comprobación de "informe pendiente" se calcula en el cliente cruzando `equipment.currentReport` con `reports` de la misma semana/año.

## Archivos afectados

- `supabase/migrations/*`: crear `reports`, `report_photos`, índices, RLS, GRANTs, bucket + policies.
- `src/hooks/useReports.ts` (nuevo).
- `src/pages/Reports.tsx` (nuevo) + ruta en `src/App.tsx`.
- `src/components/layout/AppSidebar.tsx`: item "Informes".
- `src/components/reports/ReportFormDialog.tsx` (nuevo).
- `src/components/reports/ReportPdfGenerator.ts` (nuevo, sólo lógica jspdf).
- `src/components/reports/EquipmentReportsSection.tsx` (nuevo, usado en el detalle de equipo).
- `src/components/dashboard/CriticalAlertsList.tsx`: badge "Informe pendiente" + apertura del panel de informes.
- `src/hooks/useDashboardData.ts`: exponer flag `hasReport` por equipo para la semana seleccionada.
- `package.json`: `jspdf`, `jspdf-autotable`.

## Fuera de alcance

- Firma digital del informe.
- Notificaciones automáticas por email.
- Historial de versiones del PDF.

Si estás de acuerdo, arranco por la migración SQL (tablas + bucket + policies) y luego construyo la UI y el generador de PDF.