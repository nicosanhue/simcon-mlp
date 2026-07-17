## Cambios previos (se mantienen)

1. **Tendencia por estación**: ↑ si algún spool subió ≥ 0.5 °C vs semana anterior; ↓ si alguno bajó ≥ 0.5 y ninguno subió; — en otro caso. Solo icono, sin número.
2. **Gráficos por estación**: solo spools `principal`, título `{code} — Línea Principal`, envueltos en Card colapsable "Gráfico por Estación — Línea Principal", **cerrada por defecto**.
3. **Tabla completa**: cada estación en `Collapsible` **cerrada por defecto**, conservando ramas, edición inline y toggle "Mostrar todas las semanas".

## Nuevo: Seguimiento Especial

Sección al final de `/stc-temperatura` que permite crear gráficos personalizados con spools elegidos por el usuario.

### Estructura de datos (nueva tabla)

`stc_custom_charts`:
- `name` (text) — título del gráfico
- `spool_ids` (uuid[]) — spools incluidos
- `created_at`, `updated_at`

RLS pública (patrón del proyecto), GRANTs a `anon`, `authenticated`, `service_role`.

### UI

- Card final **"Seguimiento Especial"** con botón **"+ Agregar seguimiento"**.
- **Diálogo de creación**:
  - Campo `Nombre del seguimiento`.
  - Buscador de spools con dos filtros combinables:
    - Filtro por **estación** (`Select` con las 7 estaciones + "Todas").
    - Buscador de texto por **TAG** del spool.
  - Lista con checkboxes de los spools filtrados; muestra chips con los seleccionados.
  - Botón "Crear gráfico" (deshabilitado si nombre vacío o 0 spools).
- Los gráficos creados se listan al final de la página, uno debajo del otro:
  - `BarChart` con los spools seleccionados usando la **última semana** registrada.
  - Eje X = TAG, eje Y = ΔT, mismos colores por estado y líneas de referencia 2.5 / 3.0 / 3.5.
  - Botón de basurero en la esquina superior derecha → `AlertDialog` de confirmación "¿Eliminar este seguimiento?" antes de borrar.

### Detalles técnicos

- Hooks nuevos en `useStcData.ts`: `useCustomCharts`, `useCreateCustomChart`, `useDeleteCustomChart`.
- Componente `src/components/stc/CustomChartsSection.tsx` con el diálogo de creación y renderizado de los gráficos guardados.
- Reutiliza `getStcStatus` y estilos de gráfico existentes.

## Archivos afectados
- `src/pages/StcTemperatura.tsx` (ajustes previos + integración de la nueva sección)
- `src/hooks/useStcData.ts` (nuevos hooks)
- `src/components/stc/CustomChartsSection.tsx` (nuevo)
- Migración: crea `stc_custom_charts` con RLS y GRANTs.

## Fuera de alcance
- Edición del nombre o spools de un seguimiento ya creado (solo crear/eliminar).
- Selección de semana por gráfico (siempre usa la última registrada).
