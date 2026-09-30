# Reordenar navegación y preparar Control Temperatura STR

## Resultado
- Reordenar la barra así: Dashboard, STC Control Temperatura, STR Control Temperatura, Informes, Avisos y OT, Historial, Organigrama, Activos, Admin y, al final, Lubricación Equipos. Se conservarán las páginas existentes; solo cambia el orden y los nombres indicados.
- Crear una sección **STR Control Temperatura** con el mismo formato y flujo visual de STC: resumen por estación, gráficos de línea principal, tabla semanal, seguimiento especial y vista de planos cuando existan. Al principio mostrará estados vacíos claros, sin copiar estaciones, mediciones, gráficos guardados ni planos STC.
- Cuando se suba la información de STR, incorporarla en su sección independiente. No se inventarán estaciones, tags, temperaturas ni archivos PDF antes de recibirlos.

## Detalles técnicos
- Añadir la ruta STR y reutilizar la pantalla/lógica STC mediante una configuración de tipo de sistema, de modo que ambas pantallas mantengan el mismo aspecto y los cambios compartidos no diverjan.
- Separar los registros STR de los STC en tablas propias para estaciones, spools, lecturas semanales, semanas de seguimiento y gráficos personalizados, con acceso de lectura y edición coherente con el módulo actual. No copiar registros existentes.
- Mantener los umbrales y el flujo de confirmación/publicación semanal de STC como formato inicial. Evitar ofrecer creación/publicación de semanas STR hasta que haya spools cargados.
- La sección de planos STR no apuntará a los PDF de STC; se activará con sus propios archivos y correspondencias cuando se entreguen.
- Comprobar navegación, pantallas vacías de STR, continuidad de STC y visualización móvil/escritorio.
