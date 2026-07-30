# Ajustes al informe: nombre de archivo, logos y campos

## 1. Corrección del error al guardar (bloqueante)

Al guardar un informe con fotos, el orden de cada foto se asigna con la marca de tiempo actual (ej. 1785430725778), que excede el máximo de un número entero en la base de datos, por lo que el guardado falla. Se reemplaza por un correlativo simple (0, 1, 2, 3), manteniendo la marca de tiempo solo en el nombre del archivo en almacenamiento.

## 2. Nombre del archivo PDF

Nomenclatura: `MLP_<TIPO>_<TAG>_<FECHA>.pdf`

- Vibraciones → `MLP_VIB`
- Termografía → `MLP_TER`
- Ultrasonido → `MLP_ULT`
- Fecha: fecha del informe en formato AAAAMMDD (ej. `MLP_VIB_4330PP4000_20260730.pdf`)

Se aplica tanto en la descarga desde el repositorio de Informes como desde la ficha del equipo en el dashboard.

## 3. Logos en la cabecera del informe

Banda blanca superior con tres logos: SIMCON (izquierda), Los Pelambres (centro) y Bureau Veritas (derecha), sobre la barra azul del título, tal como la imagen de referencia.

## 4. Quitar Semana y Año

Se eliminan los campos "Semana" y "Año" del formulario; la fecha del informe pasa a ser el único dato temporal. Internamente se siguen calculando a partir de esa fecha para mantener el orden y los filtros existentes, sin mostrarlos al usuario.

## 5. Gerencia fija

Se elimina el campo editable "Gerencia". El informe muestra siempre:
**"Superintendencia Confiabilidad y Mejoramiento TFT y Puerto"**

## Detalles técnicos

- `src/hooks/useReports.ts`: corregir `orden` de fotos; derivar `week_number`/`year` desde `fecha_informe`; fijar `gerencia` constante en el guardado y en `reportToPdfData`.
- `src/lib/pdfReport.ts`: agregar franja de logos (assets vía `lovable-assets` desde la imagen entregada, recortada en tres piezas), y helper `reportFileName()` con la nomenclatura.
- `src/components/reports/ReportFormDialog.tsx`: quitar inputs Semana, Año y Gerencia.
- `src/pages/Reports.tsx` y `src/components/reports/EquipmentReportsSection.tsx`: usar `reportFileName()` en la descarga.
- Sin cambios de base de datos.
- Verificación: generar un PDF de prueba y revisar la imagen renderizada (logos, cabecera, una sola hoja) antes de entregar.
