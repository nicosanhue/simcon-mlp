## Cambios en Dashboard y Navegación

### 1. Sección "Alertas Críticas" → "Condiciones: Alerta, Críticas y Sin Medición"
Archivo: `src/components/dashboard/CriticalAlertsList.tsx` y `src/pages/Dashboard.tsx` (donde se genera la lista).

- **Título:** cambiar "Alertas Críticas" por "Condiciones: Alerta, Críticas y Sin Medición".
- **Incluir Sin Medición:** hoy la lista sólo contiene Crítico + Alerta. Extender el filtro en `useDashboardData.ts` (`criticalAlerts`) para incluir también `"Sin medición"` con su color gris.
- **Layout más compacto tipo grilla:** reemplazar la lista vertical actual por una grilla responsive de tarjetas pequeñas (ej. `grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2`) para que aproveche todo el ancho blanco disponible y muestre más ítems a la vez. Cada tarjeta mantiene: icono de estado, TAG, badge de estado, nombre corto, área · sistema. Se elimina la descripción larga de la tarjeta (queda visible al abrir el popup).
- **Quitar "Informe pendiente":** remover el badge amarillo de cada tarjeta y también el contador "N sin informe" del header. Se mantiene sólo el contador total "N equipos".

### 2. Popup de detalle de condición
Archivo: `src/pages/Dashboard.tsx` (Dialog que se abre al hacer click).

- Agregar campo **"Fecha de planificación"** debajo de Aviso SAP / OT. Si `planned_date` existe, mostrar formateada; si no, mostrar "Pendiente" en gris. El dato ya está disponible en `criticalAlerts` (`plannedDate`).

### 3. Orden de la barra lateral
Archivo: `src/components/layout/AppSidebar.tsx` — reordenar `navigationItems` a:

1. Dashboard
2. Avisos y OT
3. Control Temperatura STC
4. Lubricación Equipos
5. Historial
6. Organigrama
7. Informes
8. Activos
9. Admin

### Fuera de alcance
- No se modifica lógica de negocio ni el módulo de Informes en sí (sólo se ocultan indicadores en la lista).
- No se toca el backend.
