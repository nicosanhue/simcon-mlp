# Subida de CSV igual que antes (sin Control Temperatura)

El área "Control Temperatura" solo existe para los informes de termografía STC/STR. No debe aparecer ni exigirse en la subida semanal del CSV.

## Cambios

1. **Panel de estado por área (Admin):** ocultar "Control Temperatura" de la lista de áreas y del conteo de equipos/reportes. Así desaparece la fila roja y el aviso "re-importe el CSV".
2. **Protección al sincronizar:** la subida borra del maestro los equipos que no están en la planilla. Se excluirán STC y STR de esa limpieza y de la vista previa de "equipos a eliminar", para que el CSV nunca los borre ni los pida (si se borraran, se perderían los informes de termografía).
3. Todo lo demás de la subida queda exactamente igual.

## Detalles técnicos

- `src/pages/AdminSettings.tsx`: filtrar `TEMP_AREA_NAME` en las consultas `debug-areas` y `debug-equipment-counts`; en el cálculo de huérfanos (importación y preview) omitir los equipos cuyo sistema pertenece al área `TEMP_AREA_NAME`.
- Sin cambios en la base de datos.
