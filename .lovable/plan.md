# Informes: iniciar todo plegado

En la vista agrupada de Informes, hoy la semana más reciente y todas las áreas se abren automáticamente al cargar la página.

Cambio: al entrar a Informes, todos los niveles (Semana y Área) aparecen cerrados. El usuario despliega manualmente lo que necesite; el estado se mantiene mientras navega en la página.

## Detalle técnico

- `src/components/reports/ReportsGroupedList.tsx`: cambiar los valores por defecto de apertura (`gi === 0` para semanas y `true` para áreas) a `false`, manteniendo la lógica de toggle existente.

Sin cambios en la base de datos.
