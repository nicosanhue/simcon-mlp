# Tendencia de 6 meses como mapa de calor

## Qué cambia (Reporte, sección 2)
- El gráfico de barras apiladas se reemplaza por una tabla tipo mapa de calor.
- Filas: cada categorización de anomalía, ordenadas de mayor a menor total de los 6 meses.
- Columnas: los 6 meses (ej. May 26 … Oct 26) más una columna "Total".
- Cada celda muestra el número y se colorea más intensa mientras mayor es la cantidad (tono teal del tema). Las celdas en cero quedan en blanco.
- Fila final "Total" por mes.
- Sigue respetando los filtros de área y técnica.
- El PDF no cambia (ya muestra la tendencia como tabla).

## Detalles técnicos
- Solo `src/components/monthly/ParetoSection.tsx`: quitar el `BarChart` de tendencia y renderizar una `<table>` a partir de `trend` y `trendModes`.
- Intensidad: `hsl(var(--primary) / alpha)` con alpha = valor / máximo (0.1–0.85); texto `text-primary-foreground` cuando alpha > 0.5.
- Verificar con Playwright en /reporte octubre 2026.
