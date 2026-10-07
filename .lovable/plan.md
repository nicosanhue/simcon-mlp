# Ocultar "Captura por Área"

## Objetivo

Quitar el botón **Captura por Área** del Dashboard. Conservar el componente en el proyecto para poder reactivarlo más adelante.

## Cambios

1. **Dashboard (`src/pages/Dashboard.tsx`)**
   - Eliminar el bloque que renderiza `DashboardScreenshotDownload` (líneas ~180-186) dentro de la fila de acciones.
   - Eliminar el import del componente.
   - Mantener en la fila los otros dos botones: **Descargar Críticos** y **Descargar Excel Condiciones**, sin cambios en su información.
   - `dashboardRef` se conserva (no lo usa nada más, pero queda disponible para reactivar).

2. **Verificación**
   - Confirmar que el botón ya no aparece en el Dashboard y que los otros dos botones siguen funcionando.
   - Revisar que la aplicación quede sin errores.

## Alcance técnico

Solo se retira el componente `DashboardScreenshotDownload` (`src/components/reports/DashboardScreenshotDownload.tsx`) de la vista; el archivo y su lógica no se modifican.
