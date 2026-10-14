# Acelerar la sección Informes (opcional, solo si lo apruebas)

## Por qué se demora cada vez más
- Al abrir Informes se traen **todos** los informes de una vez (hoy 537, con 1.181 componentes), y la cantidad crece cada semana.
- Las fotos se preparan **una por una, informe tras informe**: cada informe con fotos espera su turno antes de pasar al siguiente.
- Al escribir en el buscador se vuelve a descargar todo desde cero con cada letra.

## Qué se haría
1. Preparar las fotos solo cuando abres o descargas un informe, no al cargar la lista.
2. Que el buscador filtre lo que ya está cargado, sin volver a descargar.
3. Cargar primero solo los datos que muestra la lista (sin el detalle completo de cada informe).

## Detalles técnicos
- `src/hooks/useReports.ts`: quitar el bucle `await signPhotos` de `useReports`; firmar al ver/descargar. Sacar `search` de la `queryKey` y filtrar en memoria. Reducir columnas del listado.
