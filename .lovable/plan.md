# Dashboard: retirar botones y ordenar condiciones

Dos ajustes en el Dashboard.

## 1. Quitar los botones de descarga

- Se retira la fila superior con "Descargar Críticos", "Descargar Excel Condiciones" y "Captura por Área".
- Se eliminan sus imports en `src/pages/Dashboard.tsx`.
- Los componentes se conservan en el proyecto (sin borrar archivos) para poder reactivarlos cuando quieras.
- El botón "Descargar Críticos" que vive en la barra del título general (`MainLayout.tsx`) queda igual; solo desaparece la fila del Dashboard.

## 2. Orden fijo en las condiciones

En la sección "Condiciones: Alerta, Críticas y Sin Medición" las tarjetas se mostrarán siempre en este orden:

```text
1. Crítico
2. Alerta
3. Sin medición
```

- Dentro de cada grupo, los equipos se ordenan por Tag (A-Z) para que la lista sea estable.
- Aplica tanto a la vista general como cuando filtrás haciendo clic en una tarjeta de estado (Satisfactorio y Seguimiento quedan al final si alguna vez aparecen en esa lista).
- El orden se aplica en `src/components/dashboard/CriticalAlertsList.tsx`, así que sirve para todas las formas en que se arma la lista.
