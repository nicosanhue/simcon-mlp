# TAG en tooltip del ΔT máx y ocultar panel "Debug BD"

## Resultado
1. **TAG del spool al pasar por encima del ΔT máx.** En la tabla "Resumen por Estación" (STC y STR), al poner el cursor sobre el valor de **ΔT máx (°C)** aparecerá un tooltip con el TAG del spool que registra el mayor delta de esa estación en la semana mostrada (por ejemplo `370-STC-014`). Si la estación no tiene mediciones con delta, no se muestra tooltip.
2. **Ocultar "Debug BD".** El panel lateral con "Equipos" y "Reportes" dejará de verse en la barra de navegación, tanto expandido como contraído. No se elimina el código: se conserva para reactivarlo si vuelve a hacer falta.

## Detalles técnicos
- `src/pages/StcTemperatura.tsx`: `stationMax` pasará a devolver también el spool con el mayor `delta_t` de la semana actual (`latest`), reutilizando `spoolsByStation` y `readingsIndex` que ya usa la tabla.
- La celda de ΔT máx se envuelve con el componente `Tooltip` ya disponible (`src/components/ui/tooltip.tsx`); el tooltip solo se renderiza cuando existe un spool con delta mayor que 0.
- `src/components/layout/AppSidebar.tsx`: se retira el render de `<SidebarDebugPanel />` (y su import). El archivo `SidebarDebugPanel.tsx` queda intacto.
- Verificar en la vista previa: tooltip visible al hacer hover en STC, panel Debug BD ausente en la barra lateral, y build sin errores.
