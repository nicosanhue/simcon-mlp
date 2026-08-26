# Que el estado del informe mande en el Dashboard

## Qué está pasando

Caso 4320PP4957: el informe del 18-08-2026 (semana 34) quedó Satisfactorio, pero no existe registro semanal para la semana 34. La última semana con datos es la 33, cargada por CSV con estado Alerta, y el Dashboard se abre en esa semana. Además, ninguno de los 263 informes existentes está vinculado a un registro semanal: la sincronización que agregamos solo actúa al guardar un informe nuevo.

## Qué se va a hacer

1. **Backfill de las semanas recientes (31 a 34 de 2026)**
   Para cada equipo con informe en esas semanas, se toma el informe más reciente de la semana y su condición pasa al registro semanal: se actualiza si existe, se crea si no. Con eso la semana 34 aparece en el Dashboard y 4320PP4957 queda Satisfactorio.
   El histórico anterior a la semana 31 queda tal cual.

2. **El informe manda sobre el CSV**
   En la carga semanal, antes de sobrescribir la semana, se detectan los equipos que ya tienen informe en esa semana/año. Para esos equipos el estado del informe se conserva (no lo pisa el CSV); el resto de los campos del CSV (aviso SAP, OT, descripción, fecha de planificación) sí se actualizan si vienen en la planilla.
   En el resumen de la importación se muestra cuántas filas quedaron con el estado del informe.

3. **Vínculo de trazabilidad**
   Los registros semanales creados o corregidos desde un informe quedan referenciados en el informe (`weekly_report_id`), igual que ya ocurre con los informes nuevos.

## Detalles técnicos

- Backfill: sentencia de datos sobre `weekly_reports` usando el informe más reciente por `(equipment_id, week_number, year)` con `week_number >= 31 AND year = 2026`; `INSERT ... ON CONFLICT (equipment_id, week_number, year) DO UPDATE SET status`. Luego `UPDATE reports SET weekly_report_id` para esas filas.
- CSV: en `src/pages/AdminSettings.tsx`, tras armar `uniqueReports`, consultar `reports` de esa semana/año y, para los `equipment_id` con informe, reemplazar el `status` del CSV por `status_resultante` del informe más reciente antes del upsert. La eliminación previa de la semana pasa a no borrar el estado (se recalcula en el upsert).
