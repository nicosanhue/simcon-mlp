# Preparar las fotos solo al abrir un informe

## Qué cambia
- La lista de Informes deja de preparar todas las fotos al abrir la sección.
- Las fotos de un informe se preparan solo cuando lo ves, lo descargas o lo editas.
- Se vería igual que hoy y los PDF salen idénticos; solo cambia el momento en que se cargan las fotos.

## Detalles técnicos
- `src/hooks/useReports.ts`: quitar el bucle `await signPhotos(...)` de `useReports` y de `useEquipmentReports`; exportar una función `withSignedPhotos(report)` que firme las fotos de un solo informe.
- `src/pages/Reports.tsx` y `src/components/reports/EquipmentReportsSection.tsx`: en `view` y `download`, llamar a `withSignedPhotos(r)` antes de `reportToPdfData`.
- `ReportFormDialog`: firmar las fotos del informe en edición al abrirlo, para que se sigan viendo sus miniaturas.
