# Control Temperatura STC

Nueva sección para monitorear el delta térmico (ΔT) de spools en 7 estaciones del STC (KM00, KM22, KM39, KM60, KM80, KM93, KM120), con carga inicial desde el Excel proporcionado y edición semanal.

## Estructura de datos (Lovable Cloud)

Tres tablas nuevas:

- `stc_stations` — catálogo fijo: `code` (KM00…KM120), `order_index`, `name`.
- `stc_spools` — un registro por spool:
  - `station_id` → stc_stations
  - `spool_number` (# Spool)
  - `tag` (TAG SPOOL)
  - `branch` enum: `principal` | `variable_emergencia`
  - `order_index`
- `stc_temperature_readings` — una fila por spool/semana:
  - `spool_id` → stc_spools
  - `week_number`, `year`
  - `delta_t` (numeric, nullable)
  - `t_max`, `t_min` (numeric, opcionales — desde el Excel inicial)
  - `measured_at` (date)
  - Único: (spool_id, week_number, year)

RLS pública lectura/escritura (patrón actual del proyecto). GRANTs a `anon`, `authenticated`, `service_role`.

## Seed inicial

Migración que:
1. Inserta las 7 estaciones.
2. Inserta todos los spools de cada pestaña, marcando `branch` según la fila separadora "RAMA PRINCIPAL" / "RAMA VARIABLE / EMERGENCIA".
3. Inserta las lecturas de la **Semana 29 / 2026** con `delta_t`, `t_max`, `t_min` de las columnas C, D, E.

Todos los spools se conservan, incluidos los sin medición (reading con `delta_t = null`, tratados como 0 en cálculos y gráficos).

## Página `/stc-temperatura`

Ruta nueva en `App.tsx`, ítem "Control Temperatura STC" en `AppSidebar` (ícono `Thermometer`).

Selector Semana/Año arriba (reutiliza `WeekSelector`).

### 1. Tabla resumen por estación

| Estación | ΔT máx | Tendencia | Estado |
|---|---|---|---|
| KM00 | 1.3 | ↓ 0.2 | Satisfactorio |
| KM22 | 2.6 | ↑ 0.4 | Alerta Media |

- **ΔT máx**: mayor ΔT de los spools de la estación en la semana seleccionada (spools sin medición cuentan como 0).
- **Tendencia**: flecha ↑ / ↓ / = comparando ΔT máx con la semana anterior.
- **Estado / color** (según ΔT máx):
  - 0–2.4 → Verde · Satisfactorio
  - 2.5–2.9 → Amarillo · Alerta Media
  - 3.0–3.4 → Naranjo · Alerta Alta
  - 3.5–10 → Rojo · Crítico

### 2. Gráficos por estación

Un `BarChart` (recharts) por estación:
- Eje X: TAG del spool
- Eje Y: ΔT (°C); spools sin medición → 0
- Color de barra según estado del spool
- Líneas de referencia horizontales en 2.5 / 3.0 / 3.5

### 3. Tabla completa editable

Una tabla por estación con secciones "Rama Principal" y "Rama Variable / Emergencia".

Columnas:
- # / TAG / (últimas semanas como columnas dinámicas) / Estado actual

Reglas:
- Solo el campo **ΔT** de cada semana es editable (inline, guardado on blur).
- Botón **"Agregar semana de seguimiento"** → abre diálogo con semana/año (default: semana siguiente a la última) y crea filas de readings vacías (`delta_t = null`) para **todos los spools**.
- Vista por defecto: últimas 3 semanas registradas.
- Toggle **"Mostrar todas las semanas"**.

TAG, rama y # son de solo lectura.

## Detalles técnicos

- Hook `useStcData(week, year)` que trae stations + spools + readings del rango visible.
- Seed vía SQL literal en la migración a partir del parseo del Excel.
- Helper `getStcStatus(delta)` en `src/lib/stcStatus.ts` (trata null como 0).
- Token nuevo `status-alerta-alta` (naranjo) en `index.css` + `tailwind.config.ts`.
- Componentes en `src/components/stc/`: `StationSummaryTable.tsx`, `StationChart.tsx`, `SpoolReadingsTable.tsx`, `AddWeekDialog.tsx`.
- Página: `src/pages/StcTemperatura.tsx`.

## Fuera de alcance

- Autenticación / permisos por rol.
- Exportación PDF/Excel de esta sección.
- Alta/baja/renombrado de spools desde la UI (solo edición de ΔT).
