# Reordenar secciones del Reporte mensual

## Qué cambia
- **En pantalla:** "Pareto de modos de falla" pasa a ser la sección 2, con el gráfico, la tabla y el detalle al hacer clic. "Equipos críticos y en alerta por área" pasa a ser la sección 3. Las demás (4 a 6) siguen igual.
- **En el PDF descargable:** el mismo orden. 1 Resumen, 2 Pareto, 3 Críticos y alertas, 4 Comparación con el mes anterior, 5 Equipos que volvieron a fallar y 6 Control de temperatura STC y STR. Hoy el PDF tiene otra numeración ("2 y 3", "4"… "7"). Se corrige para que coincida con la pantalla.
- No cambia ningún dato ni cálculo.

## Detalles técnicos
- `src/pages/MonthlyReport.tsx`: mover el bloque `<Section>` del Pareto antes del de críticos/alertas y cambiar `n={2}`/`n={3}`.
- `src/lib/monthlyReportPdf.ts`: mover el bloque del Pareto antes del de críticos/alertas y renumerar los títulos: "2. PARETO…", "3. EQUIPOS CRÍTICOS…", "4. COMPARACIÓN…", "5. EQUIPOS QUE VOLVIERON…", "6. CONTROL DE TEMPERATURA…".
- Verificar con la verificación de tipos y con una descarga del PDF de octubre 2026.
