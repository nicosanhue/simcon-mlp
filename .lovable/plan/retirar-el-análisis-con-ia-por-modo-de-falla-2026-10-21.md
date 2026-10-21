# Retirar el análisis con IA por modo de falla

## Qué cambia
- La sección "Análisis con IA por modo de falla" deja de aparecer en Reporte.
- El resto del Reporte queda igual, incluido el Pareto con el detalle al hacer clic. La descarga en PDF tampoco cambia.
- Ya no se consumen créditos de IA desde la app.

## Detalles técnicos
- `src/pages/MonthlyReport.tsx`: quitar el import y el render de `AiFailureAnalysis`.
- Eliminar `src/components/report/AiFailureAnalysis.tsx` y la función `supabase/functions/failure-mode-analysis` (código y despliegue).
- Mantener `fetchDiagnoses` en `useMonthlyReport.ts`, porque `fetchReportTexts` lo usa.
- Desinstalar `react-markdown` y `remark-gfm`, que ya no se usan.
- Quitar la regla de IA en `AGENTS.md` y marcar la tarea en `roadmap.md` como retirada.
- Verificar con la verificación de tipos y abriendo /reporte.
