# Retirar botones de descarga del Dashboard

Quita temporalmente los tres botones que aparecen sobre el Dashboard:
"Descargar Críticos", "Descargar Excel Condiciones" y "Captura por Área".

## Qué se hace

- En `src/pages/Dashboard.tsx` se eliminan los tres componentes de la fila de acciones superior (líneas ~135-149) y sus imports.
- El contenedor con la referencia para captura (`dashboardRef`) se mantiene, porque otras funciones pueden usarlo; solo se retira la fila de botones.

## Qué NO se toca

- Los archivos de los componentes (`CriticalReportDownload`, `ConditionsExcelDownload`, `DashboardScreenshotDownload`) se conservan intactos para poder reactivarlos después.
- El botón "Descargar Críticos" que vive en el layout general (`MainLayout.tsx`) no se modifica; solo desaparece la fila del Dashboard.
