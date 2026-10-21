# Alinear columnas de la sección 3 del Reporte

## Qué cambia
- En "Equipos críticos y en alerta por área", cada área sigue con su propia tabla y su título, pero todas las columnas (Tag, Equipo, Sistema, Estado, Semanas, Desde, Aviso SAP, OT) tienen el mismo ancho en todas las áreas, así quedan alineadas una debajo de la otra.
- Los textos largos (nombre del equipo, sistema) bajan a una segunda línea en vez de mover las columnas.
- No cambian los datos ni el PDF.

## Detalles técnicos
- `src/pages/MonthlyReport.tsx`: el componente `Table` acepta un prop opcional `widths` (porcentajes). Cuando viene, usa `table-fixed` y un `<colgroup>` con esos anchos.
- La sección 3 pasa anchos fijos: Tag 12%, Equipo 22%, Sistema 16%, Estado 10%, Semanas 8%, Desde 9%, Aviso SAP 13%, OT 10%. Celdas con `break-words`.
- Las demás tablas no cambian.
- Verificar con Playwright en /reporte (octubre 2026).
