# Perfiles MonCon y AdC — Modo lectura por defecto

## Comportamiento general

- Al ingresar a la app, el usuario está en **modo lectura**: no aparece ningún control que modifique datos.
- Nueva sección **"Perfil"** al final del sidebar con dos opciones: **Perfil MonCon** y **Perfil AdC**.
- Al hacer clic sobre un perfil se abre un diálogo que pide clave:
  - MonCon → `BVMLP`
  - AdC → `NSM`
- Perfil activo se guarda en `localStorage` (persistente entre recargas).
- Ambos perfiles tienen **exactamente los mismos permisos**. Única diferencia: el nombre mostrado.
- El sidebar indica el perfil activo con un badge y un botón **"Cerrar sesión de perfil"** que vuelve al modo lectura.
- Los controles neutrales (colapsables, toggles de vista, filtros, buscadores, descargas de PDF/Excel, screenshots) **siguen disponibles para todos**.

## Acciones detrás del perfil

Se ocultan cuando no hay perfil activo. Se muestran cuando hay perfil.

**Control Temperatura STC (`/stc-temperatura`)**
- Botón "Agregar semana de seguimiento".
- Inputs editables ΔT en la tabla completa (en lectura se muestra el número como texto con el color de estado).
- Botón "+ Agregar seguimiento" y diálogo en Seguimiento Especial.
- Botón basurero + confirmación en cada gráfico de Seguimiento Especial.

**Registro Semanal (`/data-entry`)** — inputs de estado y "Guardar cambios".
**Activos (`/assets`)** — Nuevo/Guardar y basureros de Equipos, Sistemas, Áreas.
**Informes (`/reports`)** — Nuevo informe, editar y eliminar. Descargar PDF sigue público.
**Avisos y OT (`/work-orders`)** — crear/editar/eliminar.
**Lubricación Equipos (`/lubricacion-equipos`)** — Editar por fila y Guardar cambios.
**Admin (`/admin`)** — Importar CSV y acciones destructivas.
**Organigrama / Historial / Dashboard** — Sin cambios (ya son lectura o solo descargas).

## Semanas STC como "borrador" hasta publicar

Nuevo flujo cuando un perfil crea una semana de seguimiento en STC:

1. Al usar "Agregar semana de seguimiento" la semana se crea en estado **borrador** (`published = false`). No aparece en el modo lectura.
2. Auto-guardado por celda: cada ΔT editada se persiste inmediatamente al backend (ya ocurre `onBlur`; se refuerza para que no se pierda al recargar). Todas las ediciones del perfil se guardan sin necesidad de un "Guardar" manual.
3. En el modo perfil aparece un panel **"Semana en borrador — S{n}/{año}"** encima de la tabla que muestra:
   - Contador `X de N spools con temperatura confirmada`.
   - Lista/aviso de los spools **sin confirmar** con su TAG. Un spool queda "sin confirmar" mientras el analista no lo haya tocado — un valor en blanco o `0` es válido, pero requiere confirmación explícita.
   - Cada celda de la semana borrador muestra un indicador visual (borde ámbar) hasta ser confirmada.
   - Cada celda tiene un botón/checkbox **"Confirmar"** que marca ese spool como revisado (queda con el valor ingresado, incluso si es blanco o 0).
   - Botón masivo **"Confirmar todos los pendientes"**.
4. Botón **"Cargar semana de seguimiento"** aparece deshabilitado hasta que los N spools estén confirmados. Al hacer clic marca la semana como `published = true` y desde ese momento la semana es visible en el modo lectura general (resumen, gráficos, tabla y seguimientos especiales).
5. Semanas ya publicadas siguen siendo editables por los perfiles (auto-guardado igual), pero no requieren reconfirmación.
6. Toast de éxito al publicar + el panel de borrador desaparece.

En el modo lectura, las semanas con `published = false` se filtran fuera de: resumen por estación, gráficos por estación, tabla completa y gráficos de Seguimiento Especial. En modo perfil, las semanas borrador se ven marcadas con un badge "Borrador".

## Diseño técnico

### Backend
- Migración: nueva tabla `stc_tracking_weeks` (una fila por `week_number` + `year`) con columnas: `published` (bool default false), `published_at`, y un timestamp de creación. Sirve como fuente de verdad para saber qué semanas están publicadas. RLS pública + GRANTs (`anon`, `authenticated`, `service_role`) siguiendo el patrón del proyecto.
- Migración: agregar columna `confirmed` (bool default false) a `stc_temperature_readings`. Un valor puede tener `delta_t = null` o `0` con `confirmed = true` — eso es lo que valida el flujo de publicación.
- `useAddWeek` crea/asegura la fila en `stc_tracking_weeks` (unpublished) además de las filas vacías por spool.
- Nuevo hook `usePublishWeek({ week, year })` que setea `published = true` y `published_at = now()`.
- Nuevo hook `useConfirmReading` y `useConfirmAllPending(week, year)`.
- `useStcReadings` / hooks derivados filtran por semanas publicadas cuando `!isEditor` (join con `stc_tracking_weeks`).

### Frontend
- Nuevo contexto `ProfileContext` en `src/contexts/ProfileContext.tsx` con estado `profile: "MonCon" | "AdC" | null`, métodos `login(profile, key)` y `logout()`, persistencia en `localStorage` (`simcon.profile`). Hook `useProfile()` expone `{ profile, isEditor, login, logout }`.
- `ProfileProvider` montado en `src/App.tsx`.
- `src/components/profile/ProfileMenu.tsx` — grupo "Perfil" en el sidebar con las dos entradas + badge/cerrar sesión.
- `src/components/profile/ProfileLoginDialog.tsx` — input de clave, validación local, `toast` de error/éxito.
- `src/components/layout/AppSidebar.tsx` — agregar el grupo al final.
- `src/pages/StcTemperatura.tsx`:
  - Consumo de `useProfile()`; toda acción de edición envuelta con `{isEditor && …}`.
  - Panel de borrador con contador, lista de pendientes, botón "Confirmar todos" y botón "Cargar semana de seguimiento" (deshabilitado hasta 100 % confirmado).
  - `DeltaCell` en modo perfil auto-guarda `onBlur` (ya) y marca `confirmed = true` al confirmar; borde ámbar mientras no está confirmada. En lectura, muestra un `<span>` coloreado.
- `src/components/stc/CustomChartsSection.tsx` — la "última semana" que consulta ahora es la última **publicada** en modo lectura; para perfil incluye borradores.
- Resto de páginas con acciones editables: envolver botones/inputs con `isEditor` como se detalló arriba.

## Claves y advertencias

- Claves hardcodeadas en constante. Es un gating de UI, no seguridad real: cualquiera con acceso al backend puede escribir. Si en el futuro se necesita seguridad real, migrar a auth Supabase con roles y RLS.

## Fuera de alcance

- Auth real, roles en base, RLS por perfil.
- Registro/edición de perfiles o cambio de claves desde la UI.
- Auditoría de quién hizo cada cambio.

## Archivos afectados

- Migración nueva: crea `stc_tracking_weeks` y agrega `confirmed` a `stc_temperature_readings`.
- Nuevos: `src/contexts/ProfileContext.tsx`, `src/components/profile/ProfileMenu.tsx`, `src/components/profile/ProfileLoginDialog.tsx`.
- Editados: `src/App.tsx`, `src/components/layout/AppSidebar.tsx`, `src/hooks/useStcData.ts`, `src/pages/StcTemperatura.tsx`, `src/components/stc/CustomChartsSection.tsx`, `src/pages/DataEntry.tsx`, `src/pages/Assets.tsx`, `src/pages/Reports.tsx`, `src/pages/WorkOrders.tsx`, `src/pages/LubricacionEquipos.tsx`, `src/pages/AdminSettings.tsx`.
