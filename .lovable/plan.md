# Reporte mensual de equipos

## Qué se verá
- Nueva sección **"Reporte"** en la barra lateral, justo después de "Informes".
- Arriba: selector de **mes y año** (mes calendario; por defecto, el mes actual). El reporte se muestra **directo en la página**, sin descargar nada.
- En la esquina superior derecha, un solo botón **"Descargar PDF"**; el PDF se genera solo al presionarlo.
- En pantalla y en el PDF (mismo estilo que los informes actuales, con logos y encabezado "Superintendencia Confiabilidad y Mejoramiento TFT y Puerto", pero más simple):

1. **Resumen del mes:** cantidad de equipos en Crítico, Alerta, Seguimiento, Satisfactorio y Sin medición (según el último estado del mes de cada equipo).
2. **Equipos críticos y en alerta por área:** una tabla por área (orden fijo: Transporte de Fluidos, Tranque Mauro, Puerto, Desaladora) con Tag, nombre, sistema, estado, aviso SAP y OT. Orden: Crítico, luego Alerta, y por Tag.
3. **Semanas en Crítico o Alerta:** por cada equipo de la tabla anterior, cuántas semanas seguidas lleva en Crítico o Alerta hasta el final del mes (contando también semanas de meses anteriores), si tiene aviso registrado y desde qué semana.
4. **Pareto de modos de falla:** gráfico de barras ordenado de mayor a menor, con línea de porcentaje acumulado, usando los diagnósticos de los informes del mes. Categorías: **Rodamiento, Soltura, Lubricación, Desalineamiento, Desbalanceo, Otra**. Debajo, una tabla con la cantidad por categoría.

- Lectura libre para todos (no requiere perfil).
- STC/STR (Control Temperatura) quedan fuera, como en el Dashboard.

## Cómo se clasifica cada diagnóstico
Se leen los textos de diagnóstico, análisis y hallazgos de los componentes de cada informe del mes y se buscan palabras clave (sin importar mayúsculas ni tildes):
- Rodamiento: rodamiento, BPFO, BPFI, pista, jaula, elemento rodante
- Soltura: soltura, holgura, suelto, pernos, anclaje, pata coja
- Lubricación: lubricación, lubricante, grasa, aceite, falta de lubricación
- Desalineamiento: desalineamiento, desalineado, alineación
- Desbalanceo: desbalanceo, desbalance
- Otra: todo lo que no calce

Si un diagnóstico menciona dos modos, cuenta en ambos. Solo se cuentan componentes en Seguimiento, Alerta o Crítico (los Satisfactorios no son falla).

## Detalles técnicos
- Nueva página `src/pages/MonthlyReport.tsx` y ruta `/reporte`; ítem en `AppSidebar.tsx`.
- Nuevo `src/lib/monthlyReport.ts` con funciones puras: semanas ISO que caen en el mes, cálculo de semanas consecutivas en Crítico/Alerta desde `weekly_reports`, clasificación por palabras clave y armado del pareto.
- Nuevo hook `useMonthlyReport(month, year)`: lee `weekly_reports` (con equipo/sistema/área, paginado de a 1000) desde unas 26 semanas atrás para contar rachas, y `reports` + `report_items` del mes por `fecha_informe`.
- PDF con jspdf + jspdf-autotable reutilizando logos de `pdfReport.ts`; el pareto se dibuja a mano igual que en los informes de termografía. En pantalla, el pareto usa recharts. Vista previa con el `ReportPreviewDialog` existente.
- Pruebas: clasificación de diagnósticos y conteo de semanas consecutivas.
- No hay cambios en la base de datos.
