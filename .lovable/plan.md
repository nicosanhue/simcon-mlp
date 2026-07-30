# Corregir error al guardar informe ("out of range for integer")

## Causa confirmada

Al guardar un informe con fotos, el código asigna el orden de cada foto usando la marca de tiempo actual (`Date.now()`, ej. 1785430725778). La columna `orden` de la tabla de fotos es un entero de 4 bytes (máximo 2.147.483.647), por lo que la base de datos rechaza el valor y el guardado falla por completo. Esto ocurre en `src/hooks/useReports.ts`, en el bloque que sube las fotos nuevas.

## Corrección

1. Numerar las fotos con un correlativo simple (0, 1, 2, 3) continuando desde la cantidad de fotos ya existentes del informe, en lugar de una marca de tiempo.
2. Mantener la marca de tiempo solo en el nombre del archivo en almacenamiento (para evitar colisiones de nombre), no en la columna numérica.
3. Revisar el resto del guardado para que ningún otro campo entero reciba una marca de tiempo (ítems de componentes y semana/año).

## Detalles técnicos

- `src/hooks/useReports.ts`: en `useSaveReport`, reemplazar `let orden = Date.now()` por un contador basado en `report_photos` existentes; ruta de storage con `${reportId}/${Date.now()}-${i}.jpg` y `orden: base + i`.
- Sin cambios de base de datos ni de la interfaz.
- Verificación: guardar un informe con fotos y confirmar que se crea y que el PDF las incluye en orden.
