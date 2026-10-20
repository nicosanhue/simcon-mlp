# Volver a mostrar STC y STR en los informes de termografía

## Qué pasó
La pantalla de informes sigue preparada para STC y STR, pero los dos registros STC y STR ya no están guardados. El área y el sistema "Control Temperatura" siguen ahí, sin equipos dentro. Lo más probable es que una subida del CSV anterior a la última corrección los haya borrado por no venir en la planilla. No se perdió ningún informe de termografía, porque todavía no se había guardado ninguno.

## Cambios
1. Volver a crear los registros **STC** y **STR** dentro del sistema "Control Temperatura", con criticidad Baja, igual que antes.
2. La protección que ya se agregó a la subida del CSV impide que se vuelvan a borrar. La subida sigue funcionando igual que antes, sin pedir nada de Control Temperatura.
3. Comprobar que STC y STR aparecen al principio de Título / ID en Nuevo informe y que, al elegirlos, se abre el formulario de termografía.

## Detalles técnicos
- Insertar en `equipment` (tag/name STC y STR, system_id = sistema "Control Temperatura", criticality 'Baja') con la herramienta de datos. Sin migración.
- Revisar que el cálculo de equipos a eliminar en `AdminSettings.tsx` excluya STC/STR, tanto en la vista previa como en la importación.
