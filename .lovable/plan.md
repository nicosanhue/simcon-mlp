# Control Temperatura: tooltip de TAG, sección "Graficar Spool" y ocultar "Debug BD" / "Descargar Críticos"

## Resultado
1. **TAG del spool al pasar por encima del ΔT máx.** En la tabla "Resumen por Estación" (STC y STR), al poner el cursor sobre el valor de **ΔT máx (°C)** aparecerá un tooltip con el TAG del spool que registra el mayor delta de esa estación en la semana mostrada (por ejemplo `370-STC-014`). Si la estación no tiene mediciones con delta, no se muestra tooltip.
2. **Ocultar "Debug BD".** El panel lateral con "Equipos" y "Reportes" dejará de verse en la barra de navegación, tanto expandido como contraído. No se elimina el código: se conserva para reactivarlo si vuelve a hacer falta.
3. **Ocultar "Descargar Críticos".** El botón de la esquina superior derecha de la barra superior dejará de mostrarse. También se conserva el componente para reactivarlo después.
4. **Nueva sección "Graficar Spool".** Entre "Tabla completa de spools" y "Seguimiento Especial" habrá un bloque donde puedas escribir para buscar un spool por su TAG, seleccionarlo, y ver en un gráfico su historial de temperatura semana a semana, considerando todas las semanas con datos (no solo las que muestra la tabla).

## Detalles técnicos
- `src/pages/StcTemperatura.tsx`: `stationMax` pasará a devolver también el spool con el mayor `delta_t` de la semana actual (`latest`), reutilizando `spoolsByStation` y `readingsIndex` que ya usa la tabla.
- La celda de ΔT máx se envuelve con el componente `Tooltip` ya disponible (`src/components/ui/tooltip.tsx`); el tooltip solo se renderiza cuando existe un spool con delta mayor que 0.
- `src/components/layout/AppSidebar.tsx`: se retira el render de `<SidebarDebugPanel />` (y su import). El archivo `SidebarDebugPanel.tsx` queda intacto.
- `src/components/layout/MainLayout.tsx`: se retira el render de `<CriticalReportDownload />` (y su import) de la barra superior; el archivo del componente queda intacto.
- Se crea `src/components/stc/SpoolHistoryChart.tsx`, que recibe `stations`, `spools`, `readingsIndex` y `system`: buscador por TAG (con la estación y el número de spool como referencia), selección de un spool y gráfico de líneas con `recharts` (`LineChart`), donde el eje X son las semanas en orden cronológico (`S{semana}/{año}`) y el eje Y el ΔT.
- El gráfico usa todas las semanas donde el spool tenga lectura, no solo las visibles en la tabla, y muestra un mensaje claro si el spool no tiene datos o si STR todavía no tiene spools cargados. No guarda nada en la base de datos: es una vista temporal.
- `src/pages/StcTemperatura.tsx` renderiza esta sección entre el bloque de la tabla completa y `CustomChartsSection`, pasándole el mismo `system` para que funcione igual en STC y STR.
- Verificar en la vista previa: tooltip visible al hacer hover en STC, panel Debug BD ausente en la barra lateral, botón "Descargar Críticos" ausente en la barra superior, sección "Graficar Spool" entre la tabla completa y Seguimiento Especial con buscador y gráfico funcionando, y build sin errores.
