# Hacer visible la creación de informes

## Qué está pasando

El botón "Nuevo informe" existe en la sección Informes, pero solo se renderiza cuando hay un perfil activo (MonCon o AdC). Sin perfil (modo visualización) desaparece por completo, por eso parece que la opción no existe. No hay errores en consola en esa página.

## Qué haré

1. **Botón "Nuevo informe" siempre visible** en la cabecera de Informes. Con perfil activo funciona normal; sin perfil aparece con candado y al hacer clic abre el diálogo de inicio de perfil.
2. **Botón también en el estado vacío** ("Sin informes registrados"), para que se encuentre fácil cuando aún no hay datos.
3. **Mismo criterio en el detalle de equipo** (sección de informes del dashboard): botón visible con candado en vez de oculto.

## Detalles técnicos

- `src/pages/Reports.tsx`: quitar el `{isEditor && ...}` y renderizar siempre el botón; sin perfil muestra ícono de candado y abre `ProfileLoginDialog`.
- `src/components/reports/EquipmentReportsSection.tsx`: mismo patrón.
- Permisos sin cambios: sin perfil no se puede guardar ni editar nada. Sin cambios de base de datos.
