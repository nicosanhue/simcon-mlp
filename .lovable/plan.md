# Informes: PDF liviano con fotos, vista previa y organización por semana/área

## 1. PDF más liviano (y que nunca pierda las fotos)

Hoy el generador intenta 4 tamaños de imagen y, si igual supera 1 MB, genera el PDF **sin fotos**. Ese es el motivo por el que las fotografías a veces no aparecen.

Cambios:
- Activar compresión interna de jsPDF (`compress: true`) — reduce el archivo sin tocar la calidad visual.
- Fotos siempre incluidas: escalado progresivo (ancho 900 → 700 → 560 → 440 px, calidad 0.7 → 0.4) y, si aún excede el límite, seguir bajando a 380 px / 0.35 en vez de eliminarlas.
- Subir el objetivo de tamaño a ~1.5 MB (sigue siendo liviano para correo) y comprimir las fotos **una sola vez** por intento, reutilizando el resultado en lugar de recomprimir desde cero.
- Logos institucionales: convertirlos a JPEG comprimido en vez de PNG base64, lo que baja el peso fijo de cada informe.
- Fotos: máximo 4 por informe en el PDF (como hoy), en grilla 2x2 con su leyenda.

Resultado esperado: informes típicos de 150–400 KB con fotos incluidas.

## 2. Visualizar el informe sin descargarlo

- Nuevo botón "Ver" (icono ojo) junto a Descargar, en la página de Informes y en la ficha de cada equipo.
- Abre un diálogo a pantalla casi completa que muestra el PDF completo en una sola página, renderizado desde un blob en memoria (sin descargar el archivo).
- Dentro del visor: botón "Descargar" por si el usuario sí lo quiere, y cierre con Escape.
- El blob se libera al cerrar para no consumir memoria.

## 3. Organización de la página de Informes

Estructura jerárquica plegable, al estilo del dashboard:

```text
Semana 31 (27 jul – 02 ago 2026)        [12 informes]
  └ Área: Transporte Fluidos            [7]
      └ 30-07-2026
          · 4330PP4000 — Bomba principal   [Crítico]  [Ver] [PDF] [Editar]
          · 4330MO2100 — Motor ...         [Alerta]
  └ Área: Puerto                        [5]
Semana 30 (20 – 26 jul 2026)            [8 informes]
```

- Nivel 1: **Semana** (calculada desde la fecha del informe), más reciente primero, con rango de fechas y contador.
- Nivel 2: **Área** del equipo.
- Nivel 3: **Fecha** del informe.
- Nivel 4: filas de **Título/ID** (tag + nombre) con tipo, condición general y acciones.
- Secciones plegables; la semana más reciente abierta por defecto.
- Se mantienen los filtros actuales (buscador por tag/nombre y tipo) y se agrega un selector de **Área** y uno de **Semana** para saltar directo.
- Botón de alternancia "Vista agrupada / Vista tabla" para quien prefiera la tabla plana actual.

## Detalles técnicos

- `src/lib/pdfReport.ts`: `compress: true`, nueva escala de intentos, sin descarte de fotos, logos en JPEG.
- `src/lib/reportLogos.ts`: reemplazar los base64 PNG por JPEG comprimidos.
- Nuevo `src/components/reports/ReportPreviewDialog.tsx`: genera el blob, lo muestra en `<iframe>` y lo revoca al cerrar.
- Nuevo `src/components/reports/ReportsGroupedList.tsx`: agrupa `week_number/year → área → fecha` usando los datos ya cargados por `useReports` (sin cambios en la base de datos).
- `src/pages/Reports.tsx` y `src/components/reports/EquipmentReportsSection.tsx`: integrar el botón Ver y la vista agrupada.

Sin cambios en la base de datos.
