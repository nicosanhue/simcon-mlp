# Lubricación: fotos, documentos por sistema y formulario condicional

## 1. Fotos y documentos accesibles desde la tabla

- En cada fila del plan de lubricación aparecen dos iconos nuevos:
  - **Cámara**: abre un pop-up (lightbox) con las fotos del equipo, navegación anterior/siguiente y zoom al hacer clic. Muestra el número de fotos como contador junto al icono.
  - **Documento**: abre un pop-up con la lista de archivos disponibles para el **sistema** del equipo (nombre, tamaño, fecha), con botón de descarga por archivo y borrado solo para perfiles MonCon/AdC.
- La subida de documentos pasa a estar **dentro del diálogo del equipo**, junto a las fotografías. Todo archivo subido desde un equipo queda guardado a nivel de sistema: al subirlo en 410PP220 queda visible para todos los equipos de "Bombas Agua Area 410".
- Se **elimina por completo** la sección "Manuales por sistema" de la página.

## 2. Formulario del equipo: campos condicionales

Reorganización en pasos claros, mostrando solo lo que aplica:

**Identificación** — N° Equipo SAP, Tipo, Descripción (sin cambios).

**Componentes presentes** — Motor, Portarodamiento, Reductor, Descanso. Cada bloque de detalle aparece **solo** si su casilla está marcada.

**Acoplamiento (Alta y Baja)** — según el tipo seleccionado:
- Grilla o Machones → Tipo de grasa, Cantidad (g), Frecuencia.
- Hidráulico → Tipo de aceite, Cantidad (L), Frecuencia.
- Rígido u Omega → mensaje "No aplica lubricación" y sin campos.

**Motor** (si está marcado):
- Tipo de lubricante: Grasa o Aceite. Según la elección, los campos de Descanso LL/LA ofrecen la lista de grasas o de aceites.
- Descansos: LL y LA con lubricante, cantidad y **frecuencia**.
- Sellos: LL y LA solo con tipos de **grasa**, cantidad y frecuencia.

**Reductor** (si está marcado):
- Aceite, Capacidad (L) y **frecuencia de cambio de aceite** (campo nuevo).
- Sellos LL y LA: grasa, cantidad y frecuencia (como hoy).

**Portarodamiento** (si está marcado):
- Tipo de lubricante: Grasa o Aceite; los descansos LL/LA usan la lista correspondiente, con cantidad y frecuencia.
- Sellos LL y LA: solo grasa, con cantidad y frecuencia.

**Descanso** (si está marcado):
- "Condición" pasa a llamarse **Tipo**, con opciones **Lubricado** o **Sellado**.
- Tipo de grasa, Cantidad (g), Frecuencia.
- Nuevo: Sello LL con tipo de grasa, Cantidad (g) y Frecuencia.

## 3. Detalles técnicos

- **Base de datos** (`lub_equipment_data`), nuevas columnas: `acop_alta_aceite`, `acop_baja_aceite`, `motor_desc_frecuencia`, `motor_sello_frecuencia`, `porta_desc_frecuencia`, `porta_sello_frecuencia`, `reductor_aceite_frecuencia`, `descanso_sello_ll`, `descanso_sello_ll_cant`, `descanso_sello_frecuencia`. `descanso_condicion` se reutiliza como "Tipo" (Lubricado/Sellado). Los campos existentes `motor_frecuencia`, `porta_frecuencia` y `reductor_frecuencia` se mantienen para no perder datos ya cargados.
- **Documentos**: se reutiliza la tabla `lub_manuals` (ya asociada al sistema) y el bucket privado `lubricacion-manuals`; el nuevo diálogo de documentos lista por `system_id` y descarga con URL firmada.
- **Fotos**: lightbox nuevo sobre `lub_photos` con URLs firmadas ya existentes.
- Se actualizan `useLubricacion.ts` (tipos y hooks de documentos por sistema), `LubEquipmentDialog.tsx` (formulario condicional + subida de documentos), `LubricacionEquipos.tsx` (iconos, pop-ups, retiro de la sección de manuales, columnas del Excel exportado) y se elimina `LubManualsSection.tsx`.
- Toda edición/subida/borrado sigue restringida a perfiles MonCon y AdC; en modo lectura solo se puede ver y descargar.
