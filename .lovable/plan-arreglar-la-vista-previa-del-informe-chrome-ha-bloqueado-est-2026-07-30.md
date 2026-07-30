# Arreglar la vista previa del informe ("Chrome ha bloqueado esta página")

## Qué ocurre

El visor actual muestra el PDF dentro de un `<iframe>` apuntando a un blob. El PDF se genera bien (16 KB, el nombre de archivo aparece correcto), pero el visor nativo de PDF de Chrome no puede cargarse dentro del iframe del entorno de previsualización, y muestra "Chrome ha bloqueado esta página". No es un error del informe, es una limitación del visor embebido.

## Solución

Dejar de depender del visor de PDF del navegador y renderizar el informe nosotros mismos:

- Renderizar la página del PDF a imagen con `pdfjs-dist` y mostrarla dentro del diálogo, ajustada al ancho para verla completa en una sola pantalla.
- Mantener el botón "Descargar".
- Agregar "Abrir en pestaña nueva" como respaldo (abre el blob fuera del iframe, donde Chrome sí lo muestra).
- Si el renderizado fallara, mostrar un mensaje claro con esos dos botones en lugar de la pantalla gris de bloqueo.

## Detalles técnicos

- Agregar dependencia `pdfjs-dist` con worker cargado vía `?url` (compatible con Vite).
- `src/components/reports/ReportPreviewDialog.tsx`: reemplazar el `<iframe>` por un `<canvas>` renderizado con pdf.js desde el mismo blob ya generado; escala según el ancho del contenedor y devicePixelRatio para que se vea nítido; liberar blob y documento al cerrar.
- Sin cambios en la generación del PDF ni en la base de datos.
- Verificación: abrir la vista previa en el navegador y comprobar por captura que el informe se ve completo.
