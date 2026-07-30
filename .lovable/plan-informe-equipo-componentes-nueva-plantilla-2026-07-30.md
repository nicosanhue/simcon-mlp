# Informe Equipo / Componentes — nueva plantilla

Rediseño del módulo de Informes para que el formulario y el PDF sigan exactamente la plantilla entregada, en una sola página tamaño carta.

## Estructura del informe

Encabezado azul institucional:
- Título: **INFORME EQUIPO / COMPONENTES**
- Subtítulo: SISTEMA DE MONITOREO DE CONDICIONES Y DIAGNÓSTICO OPERACIONAL

Bloque de datos (2 columnas):

| Campo | Origen |
|---|---|
| TÍTULO / ID | Buscador de equipos del dashboard (por área, tag y nombre) |
| FECHA INFORME | Automática: fecha de creación del informe |
| GERENCIA | Texto editable |
| N° AVISO SAP | Texto editable |
| PROCESO / ÁREA | Se autocompleta con el área/sistema del equipo elegido (editable) |
| OT N° | Texto editable |

### 1. Resumen de condición del equipo
Una sola condición general, calculada automáticamente como la **más desfavorable** de las filas de la tabla de evaluación, con el color del estado (orden: Satisfactorio < Seguimiento < Sin medición < Alerta < Crítico). No editable manualmente.

### 2. Evaluación detallada por equipo y componente
Tabla con filas que el usuario agrega/elimina. Columnas:
Equipo / Tag · Componente · Análisis Técnico · Diagnóstico · Recomendación · Condición · Aviso SAP

- **Componente**: lista desplegable con Motor, Reductor, Portarodamiento, Descanso. Solo los componentes agregados aparecen en el informe.
- **Condición**: lista desplegable con las 5 condiciones (Satisfactorio, Seguimiento, Alerta, Crítico, Sin medición).
- La última columna se titula **Aviso SAP** (reemplaza "Modo Falla / Aviso").

### Fotografías (opcional)
Sección al final del formulario para subir hasta 4 fotografías. En el PDF se ubican en una grilla 2×2 ajustada al ancho de la página, comprimidas para que todo el informe quepa en una sola hoja carta.

### Firmas (izquierda a derecha)
| Especialista MonCon | Líder Técnico | Senior MonCon MLP |
|---|---|---|
| Bureau Veritas | Giovanni Gonzalez | Nicolás Sanhueza |
| | | Minera Los Pelambres |

## Detalles técnicos

**Base de datos**
- Nuevas columnas en `reports`: `gerencia`, `proceso_area`, `ot_numero`, `aviso_sap`, `fecha_informe` (default `now()`), `condicion_general`.
- Nueva tabla `report_items` (una fila por componente evaluado): `report_id`, `equipo_tag`, `componente`, `analisis_tecnico`, `diagnostico`, `recomendacion`, `condicion`, `aviso_sap`, `orden`. Con GRANTs y políticas públicas, igual que el resto de tablas del proyecto.
- Se conservan `report_photos` y el bucket privado `report-photos` (límite de 4 fotos por informe validado en la UI).

**Frontend**
- `src/components/reports/ReportFormDialog.tsx`: reemplazar el formulario actual por el de la plantilla (cabecera, filas dinámicas de componentes, resumen calculado, fotos máx. 4).
- `src/hooks/useReports.ts`: guardar/leer `report_items` junto al informe.
- `src/lib/pdfReport.ts`: reescribir el render con jsPDF en formato carta, una página, tabla con `jspdf-autotable`, banda azul de encabezado, bloque resumen, grilla de fotos y pie de firmas.
- `src/pages/Reports.tsx`: la tabla del repositorio muestra Título/ID, fecha, condición general y N° de componentes.

**Fuera de alcance**
- No se modifica el dashboard ni la lógica de estados semanales.
