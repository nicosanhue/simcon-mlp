# Lubricación de Equipos — Repositorio maestro

Reemplaza la vista actual (datos locales en JSON, sin persistencia) por un repositorio real en base de datos, con la estructura completa del Excel "Plan Lubricación", listas desplegables configurables, fotos por equipo y manuales por sistema.

## Qué se construye

### 1. Repositorio de lubricación
- Cada fila se vincula a un equipo existente de Activos (Área / Sistema / Tag salen del Dashboard, no se re-escriben).
- Campos propios de lubricación, según el Excel:
  - Número de equipo SAP (columna B, queda vacío para completar después)
  - Tipo de equipo (lista configurable) y Descripción
  - Componentes presentes: Motor, Portarodamiento, Reductor, Descanso
  - Acoplamiento Alta y Baja: tipo, grasa, cantidad (g), frecuencia
  - Motor: tipo lubricante, descanso LL/LA + cantidades, sello LL/LA + cantidades, frecuencia
  - Reductor: aceite, capacidad (L), sello LL/LA + cantidades, frecuencia
  - Portarodamiento: tipo lubricante, descanso LL/LA + cantidades, sello LL/LA + cantidades, frecuencia
  - Descanso: condición, grasa, cantidad (g), frecuencia
- Todos los campos editables solo con perfil MonCon o AdC; lectura para el resto.

### 2. Listas desplegables (hoja "Listas")
Catálogo editable por categoría, precargado con:
- Aceites: Shell Tellus 32, Shell Turbo T68, Omala S2 GX 150/220/320, Omala S4 GX 460
- Grasas: PolyRem EM 103, Shell Gadus S2, Grasa Acoplamientos, Sintética Alta Temp., Sellado
- Frecuencias: 250, 500, 1000, 2000, 4000 hrs, Según análisis, Inspección visual
- Acoplamientos: Grilla, Machones, Rígido, Omega, Hidráulico
- Tipos de equipo: lista nueva, editable (bomba, etc.)

No se importan las filas de ejemplo del Excel: el repositorio parte desde los equipos de Activos.

### 3. Fotografías por equipo
- Subida de imágenes desde la ficha del equipo.
- Compresión en el navegador antes de subir (redimensión a máx. ~1600 px, JPEG calidad ~0.7) para que ocupen poco espacio, igual que ya se hace en los informes.
- Galería con vista previa y borrado (solo perfiles editores).

### 4. Manuales por sistema
- Repositorio de manuales (PDF) a nivel de Sistema, agrupado y plegable igual que el Dashboard (Área → Sistema).
- Subir, descargar y eliminar; descarga por enlace firmado.

### 5. Vista
- Buscador general por Tag/Descripción + filtros por Área, Sistema y Tipo.
- Tabla agrupada por Área/Sistema, plegable, con las columnas del Excel.
- Ficha de equipo (panel lateral) con edición por secciones (Acoplamientos, Motor, Reductor, Portarodamiento, Descanso), fotos y acceso al manual de su sistema.
- Exportación a Excel del plan completo.

## Detalles técnicos

- Tablas nuevas: `lub_equipment_data` (1:1 con `equipment.id`, todos los campos anteriores), `lub_options` (categoría + valor + orden), `lub_photos` (equipment_id, storage_path, caption, orden), `lub_manuals` (system_id, storage_path, nombre, tamaño).
- Cada `CREATE TABLE` incluye GRANTs, RLS habilitada y políticas de acceso público de lectura/escritura, consistentes con el resto del proyecto (el control de edición es por perfil en la UI).
- Trigger `update_updated_at_column` en las tablas con `updated_at`.
- Buckets de storage: `lubricacion-photos` y `lubricacion-manuals` (privados, con URLs firmadas).
- Hook nuevo `src/hooks/useLubricacion.ts` con React Query para lectura/escritura, y reescritura de `src/pages/LubricacionEquipos.tsx`; se elimina la dependencia de `src/data/lubricacionEquipos.json`.
- Edición protegida con `useProfile()` / `ReadOnlyLock`, igual que en STC e Informes.
