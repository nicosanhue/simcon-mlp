# Reporte ENEX

Add a "Reporte ENEX" section to the side menu. It reads the Google Sheet "Informes Activos Críticos MLP" live and shows it as an executive dashboard in SIMCON style.

## What the user will see
1. **Top bar**: date of the sheet's last update, filters (site, status, date range), "Descargar PDF" button.
2. **Indicators**: cards for Total, Crítico, Alerta and Operativo. Each card shows a mini trend line and the change against the previous 30 days.
3. **By site and status**: stacked bars (TFT, Mina, Concentradora, Sin sitio). Clicking a bar filters the whole page.
4. **Evolución en el tiempo**: weekly area chart by status, with zoom control.
5. **Mapa de calor**: equipment against weeks, colored by status, to spot problems that repeat.
6. **Equipos críticos y en alerta**: a list you can search and sort (TAG, component, site, latest date), with badges in the SIMCON colors.
7. **PDF**: one-page export of the indicators, the charts and the critical list.

## Design direction (executive dashboard trends, 2026)
- Overview first, then filter, then detail (indicators, then charts, then table).
- One focal number per card, with context: trend and change.
- Filters connected across every chart, plus clear empty and loading states.
- Restrained palette: status colors only where they carry meaning, the rest in neutral teal and navy.

## Chart stack
- **Recharts** (already in SIMCON): indicators, mini trend lines, bars, areas.
- **Apache ECharts**: heat map, since it handles hundreds of cells smoothly.
- The other libraries on your list (FusionCharts, Victory, Visx, Chart.js, D3) would add weight without adding anything for these charts. FusionCharts also requires a paid license. They stay out unless a specific chart needs one of them.

## Technical details
- Link the Google Sheets connection to the project. A new `enex-report` edge function reads `Informes!A:H` through the gateway in a single call and keeps it in memory for 2 minutes, to respect the 60-requests-per-minute limit. The sheet is read-only.
- Normalize the data in `src/lib/enexReport.ts`: pure functions for KPIs, weekly series and the heat matrix, with Vitest tests for the counts.
- New page `src/pages/ReporteEnex.tsx` wrapped in `MainLayout`, a `/reporte-enex` route and a sidebar entry. Add `echarts` and `echarts-for-react`. Build the PDF with the existing html-to-image/jspdf approach.
- No changes to the other sections. Record the rule in AGENTS.md and the task in roadmap.md.
