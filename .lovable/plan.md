# Mejoras al Pareto de modos de falla

## Qué cambia (sección 2 del Reporte)

**1. Filtros por área y técnica**
- Botones de área sobre el Pareto, en el orden fijo de siempre y con "Todas las áreas" seleccionada al inicio.
- Botones de técnica: Todas, Vibraciones, Termografía, Ultrasonido y Lubricación. La técnica sale del tipo de cada informe.
- Los filtros cambian el gráfico, la tabla, el detalle al hacer clic y los bloques 3 y 4.

**2. Pareto modo de falla × componente**
- Al hacer clic en un modo de falla, se ve un segundo Pareto con sus componentes (Motor, Reductor, Portarodamiento, Descanso, etc.).
- Debajo sigue la lista de diagnósticos, como hoy.

**3. Tendencia de los últimos 6 meses**
- Gráfico de barras apiladas por mes, con un color por modo de falla, que termina en el mes elegido.
- Sirve para ver si un modo crece o si una acción dio resultado.

**4. Malos actores: top 10 de equipos**
- Equipos con más diagnósticos en el mes, con su TAG, nombre, área, cantidad, modos de falla, componentes y peor condición.
- Al hacer clic en un equipo se ven sus diagnósticos.

**PDF:** se agregan la tendencia (en tabla) y el top 10 de equipos. Los filtros quedan solo en pantalla, y el PDF sale siempre con todas las áreas y técnicas.

## Detalles técnicos
- `useMonthlyReport.ts`: `fetchDiagnoses` incluye también `reports.tipo` como `tecnica`. Se agrega una carga de los diagnósticos de los 6 meses anteriores, en una sola consulta por rango de fechas, para la tendencia.
- `src/lib/monthlyReport.ts`: funciones puras `buildParetoByComponent`, `buildMonthlyTrend` y `topBadActors`, con tests en `monthlyReport.test.ts`.
- `MonthlyReport.tsx`: estado de los filtros de área y técnica, y diagnósticos filtrados con `useMemo`. Gráficos con recharts. El área usa `sortAreaNames` y "Transporte Fluidos" como alias.
- `monthlyReportPdf.ts`: las nuevas secciones van dentro de la sección 2, sin cambiar la numeración.
- Verificar con los tests, la verificación de tipos y Playwright en /reporte para octubre 2026.
