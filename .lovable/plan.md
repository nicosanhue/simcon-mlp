# Carga única del histórico de mediciones 2026

Importar las 534 filas del archivo `Mediciones-2026.xlsx` (abril–julio 2026) al módulo de Informes, agrupadas por informe y con sus componentes.

## Qué contiene el archivo

- 1 hoja "Mediciones", 534 filas, 17 columnas.
- Gerencia: TFT (351) / PUERTO (183). Procesos: STR, Desalinizadora, Tranque Quillayes, Tranque Mauro, Puerto, STC.
- Condiciones: SATISFACTORIO (434), ALERTA (39), BUENO (38), NO MEDIDO 2 (10), PELIGRO (8), NO MEDIDO 1 (5).
- El tag no viene en columna propia: se extrae del texto de Equipo / Componente / Glosa.

## Mapeo de columnas

| Excel | Destino en la app |
|---|---|
| Glosa Informe | agrupador del informe + detección de tipo |
| Fecha Informe | Fecha del informe |
| Fecha Medición | Fecha de inspección |
| OT | N° de OT |
| N° Aviso | Aviso SAP del informe |
| Gerencia / Proceso | Proceso/Área del informe |
| Equipo | equipo (tag) del informe |
| Componente | componente de la tabla de evaluación |
| Análisis / Diagnóstico / Recomendación | campos del componente |
| Condición | condición del componente |
| N° aviso Subsecuente | aviso del componente |
| Criticidad, Estado Informe, Modo Falla | se anexan al texto de análisis (no hay campo propio) |

## Reglas acordadas

- Condición: BUENO → Satisfactorio, PELIGRO → Crítico, NO MEDIDO 1/2 → Sin medición, ALERTA y SATISFACTORIO se mantienen.
- Tipo: "Lubricación" si la glosa contiene "INFORME LUBRICANTES"; el resto "Vibraciones".
- La condición general del informe se calcula con la condición más desfavorable de sus componentes (misma lógica actual).

## Normalización de tags

Se normaliza antes de buscar el equipo y se entrega un reporte de lo ajustado y lo no resuelto:

1. Quitar espacios y guiones (`410PP-224` → `410PP224`).
2. Igualar ceros a la izquierda (`583PP7001` ↔ `0583PP7001`).
3. Corregir `TM` → `TK` cuando solo existe la variante TK (`410TM050` → `410TK050`, `340TM711` → `340TK711`).
4. Sufijo A/B: si el tag del archivo no existe pero sí una única variante con sufijo, se usa esa (`4150ZM003` → `4150ZM003A`, `410ZM002` → `410ZM002A`). Si hay A y B, se marca como ambiguo y no se carga.
5. Los tags que no calzan quedan listados en el reporte final; no se crean equipos nuevos.

## Cómo se hará la carga

Es una carga única, no una función permanente en la app: se procesa el archivo y se insertan los informes y sus componentes directamente en la base de datos, evitando duplicados por combinación equipo + fecha de informe + glosa.

Al terminar entrego un resumen: informes creados, componentes creados, tags normalizados (con el detalle antes/después) y filas no cargadas con su motivo.

## Detalles técnicos

- Inserciones en `reports` (uno por glosa+equipo+fecha) y `report_items` (uno por fila del Excel, con `orden` secuencial).
- `week_number` / `year` se derivan de la Fecha Informe para que el histórico quede filtrable por semana en el listado agrupado.
- No se modifican `weekly_reports` ni el dashboard de condiciones semanales.
- Sin cambios de esquema; solo datos.
