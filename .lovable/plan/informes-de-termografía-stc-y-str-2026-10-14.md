# Informes de termografía STC y STR

## Qué verá el usuario
En **Informes → Nuevo informe**, el campo Título / ID (equipo) tendrá dos opciones nuevas: **STC** y **STR**. Al elegir una:
- El TAG queda igual al nombre (STC o STR).
- El tipo se marca solo como **Termografía**.
- El formulario cambia al formato del informe de termografía que adjuntaste.

### Página 1 – Antecedentes
- Encabezado, logos y **Resumen de condición** igual que hoy (condición más desfavorable).
- **1. Antecedentes generales**
  - Descripción elemento: "Inspección Termográfica Ruta del STR" o "del STC", según lo elegido.
  - Alcance Inspección IR: las estaciones del sistema elegido, completadas solas (STC: KM00 a KM120; STR: Cabecera 28", Cabecera 36", etc.).
  - Norma(s) Ejecución: TERMOGRAFÍA VELTB-I-CMP195-SA-0001
  - Norma(s) Evaluación: ISO 18434-1
  - Nombre Inspector(es): se escribe a mano.
- **2. Antecedentes técnicos** y **3. Equipos utilizados y técnica empleada**: los mismos textos fijos del informe adjunto (FLIR 865, emisividad 0,95, rango 10 °C > 90 °C, etc.).

### Página 2 – Resultados
- **4. Resultado de la inspección**: un cuadro de texto libre.
- **Cuadro de criticidad** copiado tal cual del adjunto (límites condenatorios):
  - Satisfactorio: ΔT < 2,4 °C
  - Alerta: ΔT > 2,5 °C y < 4,9 °C
  - Peligro: ΔT ≥ 5 °C
- **Listado de equipos**: se llena solo con los spools de la semana del informe que quedan en Alerta o Peligro (TAG, estación y ΔT). La Orden queda para escribir a mano.

### Páginas siguientes – una por estación
- Título "ESTACIÓN …" con el nombre.
- Hasta **6 fotos por estación**; cada foto se sube eligiendo el TAG del spool de esa estación.
- Debajo, un **gráfico de seguimiento de las últimas 3 semanas** para cada spool con foto, tomado de Control Temperatura.
- Las estaciones sin fotos no generan página.

El informe aparece en la lista como cualquier otro, con el mismo nombre de archivo (MLP_TER_STC_fecha.pdf) y se guarda en la nube igual que los demás.

## Para confirmar
- El cuadro de criticidad del adjunto usa límites distintos a los colores de Control Temperatura (allí Alerta empieza en 2,5 y Crítico en 3,5). Usaré los del adjunto para el informe y su listado, sin cambiar Control Temperatura.
- La semana del informe se elige en el formulario (por defecto, la última semana publicada).

## Detalles técnicos
- Nuevas columnas en `reports`: `sistema_temp` (stc/str), `inspectores`, `resultado_inspeccion`, `semana_temp`/`anio_temp`. Nueva tabla `report_station_photos` (report_id, station_code, spool_tag, storage_path, orden) con GRANT y RLS como `report_photos`; fotos en el bucket actual de informes, comprimidas.
- No se crean equipos STC/STR en Activos: el informe usa `equipment_id` nulo… como `equipment_id` es obligatorio, se crearán dos registros técnicos "STC" y "STR" en un sistema "Control Temperatura" para no romper el esquema ni el Dashboard (excluidos del conteo de condiciones).
- `ReportFormDialog.tsx`: rama de formulario termográfico. `pdfReport.ts`: nueva función `generateThermoReportPdf` multipágina (jspdf + autotable); los gráficos de 3 semanas se dibujan directamente con líneas jspdf a partir de `stc_/str_temperature_readings`.
- Al guardar, el PDF se regenera y reemplaza el guardado en la nube, igual que hoy.
