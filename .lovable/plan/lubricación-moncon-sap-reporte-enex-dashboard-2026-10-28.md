# Lubricación MonCon (SAP) ↔ Reporte ENEX ↔ Dashboard

## Lo que encontré en SAP (IW29, creador `eleonp`)
- 187 avisos MonCon (dic-2024 a oct-2026), todos tipo A1 con descripción "MONCON; ...".
- 50 de ellos son de lubricación/aceite (palabras: LUB, ACEITE, GRASA, MUESTRA, ENGRASE): 47 cerrados, 3 abiertos.
- Los otros 137 son vibraciones, cambio de motor, etc. Quedan fuera.

## Qué se construye
1. **Búsqueda automática de avisos de lubricación**: avisos IW29 con creador `eleonp` y palabras de lubricación, junto con su OT, su estado y su fecha de inicio extremo (IW39).
2. **Cruce con cada condición ENEX**: se vincula por TAG del equipo (en la descripción del aviso o en su ubicación técnica) y se toma el aviso creado en la fecha del informe ENEX o después.
   Cada condición queda en uno de estos estados:
   - Sin aviso
   - Aviso sin OT
   - OT abierta
   - Ejecutada: aviso u OT cerrados (CERR/MECE)
3. **Actualización automática del Reporte ENEX**:
   - Una condición CRÍTICO o ALERTA con OT ejecutada se muestra como **Ejecutado** y deja de contar como pendiente.
   - Se agrega la indicación "Cobertura SAP", con el % de condiciones que tienen aviso y OT.
   - La tabla de equipos agrega las columnas Aviso, OT, Estado OT e Inicio extremo.
   - Un filtro muestra solo las condiciones "Sin aviso".
   - La planilla de Google no se modifica: SIMCON solo la lee.
4. **Dashboard principal**: cada equipo con una condición de lubricación ENEX muestra una insignia "Lubricación" con su estado (pendiente, OT abierta o ejecutada). En la ficha del equipo aparece el detalle: condición ENEX, aviso, OT y fecha.
5. Los datos se refrescan solos al abrir la página (con 2 minutos de memoria) y con el botón "Actualizar desde SAP".

## Supuestos (corregibles)
- El creador MonCon es `eleonp`. Se puede agregar más usuarios.
- Si la OT queda ejecutada, el estado se muestra como "Ejecutado" y la condición ENEX original se conserva como historial.

## Detalles técnicos
- Agregar `lookupLubricacionMonCon()` en `_shared/sap.ts`: IW29 filtrado por `lower(creado_por) in (...)` y una expresión regular en `descripcion`, unido a IW39 para la OT, su estado y su `fecha_inicio_extrema`.
- La función `enex-report` devuelve las filas junto con el bloque `sap` (con la misma caché). El cruce va como función pura `matchEnexSap()` en `src/lib/enexReport.ts`, con pruebas Vitest para: coincidencia por TAG, aviso anterior a la fecha ignorado, cerrado = Ejecutado y estado sin aviso.
- Dashboard: el hook `useEnexLubricacion` lee `enex-report` y lo une por tag con `equipment.tag`. No se escribe en `weekly_reports`, para no alterar los conteos.
- Vig-IA: herramienta opcional `lubricacion_enex` para preguntar por la cobertura.
