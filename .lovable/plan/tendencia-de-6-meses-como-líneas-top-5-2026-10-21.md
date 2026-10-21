# Tendencia de 6 meses como líneas (top 5)

## Qué cambia (Reporte, sección 2)
- El mapa de calor se reemplaza por un gráfico de líneas.
- Se muestran las 5 categorizaciones de anomalía con más casos en los 6 meses. El resto se suma en una línea "Otras", gris y punteada.
- Cada línea tiene un color propio y bien distinto, con puntos en cada mes y una leyenda abajo.
- Al pasar el mouse se ven las cantidades de ese mes.
- Sigue respetando los filtros de área y técnica. El PDF no cambia.

## Detalles técnicos
- Solo `ParetoSection.tsx`: recharts `LineChart` con datos derivados de `trend`; top 5 por total y la clave "Otras" sumada.
- Paleta de 5 colores con tokens nuevos `--chart-1..5` en `index.css` y `--muted-foreground` para "Otras".
- Verificar con Playwright en /reporte, octubre 2026.
