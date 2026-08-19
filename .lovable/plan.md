# Sincronizar el estado del Dashboard con el informe

## Situación actual

Al guardar un informe se escribe solo en la tabla de informes (`reports`), con su condición general. El Dashboard no lee esa tabla: toma el estado desde el registro semanal (`weekly_reports`) del equipo para la semana seleccionada. Por eso el estado del informe nunca se refleja en el Dashboard.

## Qué se va a hacer

Cuando se crea o se edita un informe, el estado del equipo en el Dashboard pasa a reflejar la condición del informe:

1. Se calcula la semana/año a partir de la fecha del informe (igual que hoy se hace para el informe).
2. Se busca el registro semanal de ese equipo en esa semana:
   - Si existe, se actualiza su estado con la condición del informe (en ambos sentidos: de Satisfactorio a Crítico y de Alerta a Satisfactorio).
   - Si no existe, se crea el registro semanal con esa condición, para que el equipo aparezca con estado en el Dashboard.
3. Se completan también, si vienen en el informe, el aviso SAP y la OT, y la descripción técnica se llena con la recomendación/hallazgos cuando esté vacía.
4. El informe queda vinculado al registro semanal (`weekly_report_id`) para trazabilidad.
5. Al eliminar un informe no se revierte el estado (el estado semanal queda como quedó); si se prefiere revertir, se puede agregar después.

Tras guardar, se refrescan los datos del Dashboard para que el cambio se vea de inmediato.

## Detalles técnicos

- Archivo: `src/hooks/useReports.ts`, dentro de `useSaveReport`, después de guardar el informe y sus componentes.
- Upsert manual sobre `weekly_reports` por `(equipment_id, week_number, year)`: `select` → `update` o `insert`.
- El valor de estado usa `status_resultante` (ya calculado como la condición más desfavorable de la tabla de evaluación), mapeado al enum `equipment_status`.
- Invalidar las queries `dashboard-equipment`, `debug-counts` y `latest-week` en `onSuccess`.
