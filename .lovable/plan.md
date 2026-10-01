# Tooltip con TAG del spool de mayor ΔT en el resumen por estación

## Resultado
- En la tabla **Resumen por Estación** de Control Temperatura (STC y STR), al pasar el cursor sobre el valor de **ΔT máx (°C)** aparecerá un tooltip con el TAG del spool que registra el mayor delta de esa estación en la semana mostrada.
- Si la estación no tiene mediciones (o todas son 0/vacías), no se mostrará tooltip.
- El comportamiento será idéntico en STC y STR, sin cambiar ningún otro cálculo ni el diseño de la tabla.

## Detalles técnicos
- En `src/pages/StcTemperatura.tsx`, extender `stationMax` para devolver también el spool con el mayor `delta_t` (misma semana `latest` que ya usa la tabla).
- Envolver la celda de ΔT máx con el componente `Tooltip` de shadcn (`src/components/ui/tooltip.tsx`), mostrando por ejemplo: `Spool: 370-STC-001` (TAG real del spool).
- Solo se renderiza el tooltip cuando existe un spool con delta > 0; en caso contrario la celda queda como está.
- Verificar en la vista previa que el tooltip aparece al hacer hover en STC y que el build no tiene errores.
