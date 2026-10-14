# Informes más rápidos: fotos al abrir y PDF guardados en la nube

## 1. Preparar las fotos solo al abrir un informe
- La lista de Informes deja de preparar todas las fotos al abrir la sección.
- Las fotos de un informe se preparan solo cuando lo ves, lo descargas o lo editas.
- La pantalla y los PDF se ven igual que hoy.

## 2. PDF guardados en la nube
- Al guardar un informe (nuevo o editado), su PDF se genera y queda guardado en la nube.
- Al ver o descargar un informe, se usa el PDF guardado, así que se abre al instante.
- Los informes que todavía no tengan PDF guardado se generan la primera vez que alguien los abre y quedan guardados para la próxima vez.
- Al eliminar un informe, también se borra su PDF.
- Espacio estimado: unos 50 MB para los 537 informes actuales y unos 50 MB más por año.

## Detalles técnicos
- `src/hooks/useReports.ts`: quitar el bucle `await signPhotos(...)` de `useReports` y `useEquipmentReports`; agregar `withSignedPhotos(report)` para firmar las fotos de un solo informe.
- Nuevo bucket privado `report-pdfs` (con las mismas reglas de lectura y escritura que `report-photos`) y una migración que agrega a `reports` las columnas opcionales `pdf_path text` y `pdf_generated_at timestamptz`.
- `getReportPdf(report)`: si existe `pdf_path` y `pdf_generated_at >= updated_at`, descarga el blob guardado; si no, ejecuta `withSignedPhotos`, luego `generateReportPdf`, sube el archivo a `report-pdfs/<id>.pdf` (upsert) y actualiza las columnas.
- `useSaveReport`: tras guardar el informe, los componentes y las fotos, regenera el PDF y lo sube. Si eso falla, no bloquea el guardado.
- `useDeleteReport`: borra `report-pdfs/<id>.pdf`.
- `Reports.tsx`, `EquipmentReportsSection.tsx`, `ReportPreviewDialog`: ver y descargar usan `getReportPdf`; `ReportFormDialog` firma las fotos al abrir la edición.
