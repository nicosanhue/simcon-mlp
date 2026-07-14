Cambiar el texto "SCIM" en el header del layout principal por "SIMCON" con el tooltip/subtítulo "Sistema Monitoreo de Condiciones".

## Cambios

- `src/components/layout/MainLayout.tsx`: reemplazar el `<span>SCIM</span>` en el header por `<span>SIMCON</span>` y añadir un `title="Sistema Monitoreo de Condiciones"` para accesibilidad.

Reviso también otros lugares donde aparezca "SCIM" (sidebar, index.html title/meta) y los actualizo si existen, para mantener consistencia de marca.