# Restaurar las tres opciones de descarga

## Objetivo

Volver a mostrar las tres opciones retiradas anteriormente, conservando exactamente la información y el funcionamiento que ya tenían:

- **Descargar Críticos**
- **Descargar Excel Condiciones**
- **Captura por Área**

## Cambios

1. **Barra superior**
   - Restaurar **Descargar Críticos** en su ubicación anterior, a la derecha.
   - Reutilizar el componente existente sin alterar su consulta ni el PDF: seguirá tomando la última semana disponible e incluyendo equipos en estado **Crítico** y **Alerta**, con sus datos técnicos, SAP, área y sistema.

2. **Dashboard**
   - Restaurar la fila de acciones con **Descargar Excel Condiciones** y **Captura por Área**.
   - El Excel conservará su contenido actual para la semana seleccionada: estados Crítico, Alerta y Seguimiento, junto con área, sistema, TAG, equipo, criticidad, descripción y datos SAP.
   - Las capturas conservarán las opciones por área y todas las áreas, usando la semana y el año seleccionados.

3. **Verificación**
   - Confirmar que los tres controles aparecen correctamente en pantallas grandes y pequeñas.
   - Probar que cada descarga sigue generando su archivo con los datos existentes, sin modificar consultas, formatos ni registros.
   - Revisar que la aplicación quede sin errores.

## Alcance técnico

Solo se restaurarán los componentes ya existentes en `MainLayout` y `Dashboard`. No se cambiará la base de datos ni el contenido generado por las descargas.
