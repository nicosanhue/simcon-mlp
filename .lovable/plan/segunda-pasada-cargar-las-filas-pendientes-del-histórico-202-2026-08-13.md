# Segunda pasada: cargar las filas pendientes del histórico 2026

Cargar las filas que quedaron fuera por tags no resueltos, aplicando las equivalencias que indicaste.

## Equivalencias a aplicar

| Tag en el Excel | Equipo destino |
|---|---|
| 4150ZM003 | 4150ZM003A (principal; se descarta la variante B) |
| 410ZM002 | 410ZM002A |
| 4150AG002 | 4150TK002 |
| 4150AG003 | 4150TK003 |
| 4150AG1004 | 4150TK1004 |
| 370AG020 | 370TK020 |
| 370AG021 | 370TK021 |
| 0583AG7212 / 583AG7212 | 583TK7212 |

Regla general para sufijos A/B: cuando el Excel trae el tag sin sufijo, se carga al equipo con sufijo A (principal).

## Corrección en la base de datos

El equipo hoy registrado como `0853AG7212` ("Agitador Floculación celda N° 2") queda con el tag correcto `583TK7212`. Es el mismo activo, solo se corrige el código; sus registros históricos se mantienen.

## Filas que seguirán sin cargar

Estos tags no existen en el maestro de equipos y no tienen equivalente claro:

- 4230ZM021
- 4230ZM022
- 520AG033

Si me indicas a qué equipo corresponden (o si hay que crearlos), los cargo también.

## Detalles técnicos

- Migración de datos: `UPDATE public.equipment SET tag = '583TK7212' WHERE tag = '0853AG7212'`.
- Reproceso del archivo `Mediciones-2026.xlsx` filtrando solo las filas aún no cargadas, con el mismo criterio de agrupación (equipo + fecha informe + glosa) para no duplicar informes existentes.
- Inserción en `reports` (informes nuevos) y `report_items` (componentes), con `orden` continuo dentro de cada informe; mismo mapeo de condiciones y de tipo (Lubricación / Vibraciones) ya usado en la primera pasada.
- La condición general de cada informe se recalcula con el componente más desfavorable.
- Sin cambios de esquema ni de la interfaz.

Al terminar entrego el resumen: informes y componentes creados, y el detalle final de lo que no se pudo cargar.
