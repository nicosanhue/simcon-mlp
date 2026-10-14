# STR Control Temperatura: cargar las estaciones y spools de la planilla

## Qué se carga
Se cargan las 8 pestañas STR de la planilla como estaciones, en este orden:
Cabecera 28", Cabecera 36", Disipadora 36", Disipadora 28", Área 410, Quelen, Alto la Guardia, Camisa.

- **Spools (aprox. 205):** cada uno con el TAG de la columna B y su número de spool. Algunos TAG se repiten en más de una estación (por ejemplo, RAMA PRINCIPAL aparece dos veces en Cabecera 36"), así que se cargan por estación y por posición, sin perder filas.
- **Quelen, Alto la Guardia y Camisa:** no tienen TAG en la planilla, así que se les asigna uno propio con el formato estación, ducto y número. Por ejemplo: QUELEN-28-1, QUELEN-36-1, ALTOGUARDIA-28-1, CAMISA-36-2.
- **Mediciones:** se cargan T° máx, T° mín y ΔT (columna E) en la **semana 39 de 2026, como borrador**, para que la revises y la publiques tú.
- **Ramas y subgrupos:** "Rama principal" y "Rama variable" usan las dos ramas de STC. Los subgrupos (TK-002, TK-003, Ductos Bombas, Línea Bypass, Zona de Loops, HV-128 a HV-132, Ducto 28"/36"/72") aparecen como **encabezados dentro de la tabla**, igual que en la planilla.

## Qué se ve (igual que en STC)
- Resumen por estación con ΔT máximo, estado por color y aviso con el TAG del spool más caliente.
- Gráficos por estación, tabla completa editable solo en ΔT (con perfil), "Graficar Spool" y "Seguimiento Especial".
- Mismos rangos de color y la misma regla de tendencia que STC.
- La columna de planos queda vacía en STR hasta que subas los planos de STR.

## Detalles técnicos
- Migración: agregar a `str_spools` la columna opcional `grupo text`. STC no se toca.
- Carga de datos (run_sql) en `str_stations` (código por pestaña: CAB28, CAB36, DIS36, DIS28, A410, QUELEN, ALTOGUARDIA, CAMISA), `str_spools` (tag, spool_number, branch, grupo, order_index según el orden de las filas), `str_temperature_readings` (week 39, year 2026, measured_at a partir de la fecha de la cabecera) y `str_tracking_weeks` (39/2026, published=false).
- Las filas con ΔT vacío se cargan como lectura sin valor. "Sin Flujo" se conserva como ΔT 0, tal como viene en la planilla.
- `useStcData.ts` lee `grupo`. En `StcTemperatura.tsx`, la tabla completa inserta una fila de encabezado cada vez que `grupo` cambia dentro de una rama; STC queda igual porque `grupo` vale null.
