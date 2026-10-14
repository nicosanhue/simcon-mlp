# Informes de termografía STC y STR (alternativa segura)

## Qué cambia respecto al plan anterior
- No se quita la regla de que cada informe tenga equipo. Se crean dos registros fijos, **STC** y **STR**, dentro de un sistema "Control Temperatura", para asociar estos informes.
- Estos dos registros no se cuentan en el Dashboard, en las condiciones, en Avisos y OT, en el Organigrama ni en Activos.
- Al guardar un informe STC/STR no se cambia ningún estado semanal del Dashboard.

## Qué verá el usuario
Todo lo demás queda como en el plan aprobado:
- STC y STR aparecen en Título / ID; el TAG es STC o STR y el tipo queda en Termografía.
- Página 1: resumen de condición, antecedentes generales (descripción, alcance con las estaciones, normas, inspectores a mano), antecedentes técnicos y equipos/técnica con los textos fijos del adjunto.
- Página 2: resultado de la inspección (texto libre), cuadro de criticidad del adjunto (2,4 / 2,5–4,9 / ≥5 °C) y listado automático de spools en Alerta o Peligro de la semana elegida.
- Una página por estación con hasta 6 fotos, cada una con su TAG de spool, y el gráfico de las últimas 3 semanas de esos spools.

## Detalles técnicos
- Migración solo aditiva: columnas nuevas opcionales en `reports` (`sistema_temp`, `inspectores`, `resultado_inspeccion`, `semana_temp`, `anio_temp`, `ordenes_tags` jsonb con default) y tabla `report_station_photos` con GRANT + RLS igual que `report_photos`.
- Datos: área "Control Temperatura" (si no existe), sistema "Control Temperatura" y equipos `STC` y `STR` (criticidad Baja).
- Filtros de exclusión por esa área en las consultas de Dashboard, Avisos y OT, Activos, Organigrama y conteos laterales.
- `useSaveReport`: omitir la sincronización con `weekly_reports` cuando `sistema_temp` tiene valor.
- `ReportFormDialog.tsx`: rama termográfica. `pdfReport.ts`: `generateThermoReportPdf` multipágina con gráficos dibujados en jspdf; la generación y el guardado en la nube siguen el flujo actual.
