# Vig-IA dentro del marco de SIMCON

## Problema
La página de Vig-IA se muestra sola: le falta la barra lateral y la cabecera que tienen las demás secciones (Dashboard, Reporte, Informes...), así que no hay cómo volver al resto de SIMCON.

## Cambio
- Mostrar Vig-IA dentro del mismo marco que las otras secciones, con la barra lateral visible, "Vig-IA" marcado como activo y la cabecera superior de siempre.
- Ajustar la altura del chat para que quepa bajo la cabecera sin dejar doble barra de desplazamiento.
- El chat, el historial guardado y el botón "Preguntar a Vig-IA" siguen funcionando igual.

## Detalles técnicos
- En `src/pages/VigIA.tsx`, envolver el contenido en `MainLayout` (`@/components/layout/MainLayout`), igual que hace `MonthlyReport.tsx`.
- Revisar en pantalla que el menú funcione para ir y volver entre Vig-IA y las demás secciones.
