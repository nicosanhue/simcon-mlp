# Hacer visible la creación de informes

## Qué está pasando

El botón "Nuevo informe" sí existe en la sección Informes, pero solo se muestra cuando hay un perfil activo (MonCon o AdC). En modo visualización (sin perfil), el botón queda completamente oculto, así que parece que la opción no existe. No hay errores en consola en esa página.

## Qué haré

1. **Botón siempre visible en Informes**: mostrar "Nuevo informe" también en modo lectura, pero deshabilitado con ícono de candado y un mensaje al pasar el mouse: "Inicia sesión con un perfil (MonCon / AdC) para crear informes". Al hacer clic se abre el diálogo de inicio de perfil en vez de no hacer nada.

2. **Aviso en la parte superior de la página**: una franja discreta en modo lectura indicando que se está en modo visualización y con acceso directo a iniciar perfil.

3. **Mismo tratamiento en el detalle del equipo**: en la sección de informes dentro de cada equipo del dashboard, el botón de crear informe se mostrará deshabilitado en lugar de oculto, con el mismo mensaje.

4. **Estado vacío más claro**: cuando no hay informes, el recuadro "Sin informes registrados" incluirá el botón de creación (activo o bloqueado según perfil).

## Detalles técnicos

- `src/pages/Reports.tsx`: reemplazar el `{isEditor && ...}` por un botón siempre renderizado, `disabled` cuando `!isEditor`, con tooltip y disparo del diálogo de login de perfil.
- `src/components/reports/EquipmentReportsSection.tsx`: mismo patrón para el botón de nuevo informe.
- Se reutiliza `ProfileLoginDialog` y `useProfile()`; no se cambian las claves ni los permisos: seguir sin perfil no permite guardar nada.
- Sin cambios de base de datos.
