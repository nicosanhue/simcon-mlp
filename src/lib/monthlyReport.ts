// Funciones puras del Reporte mensual (sin acceso a la base de datos).

export const BAD_STATUSES = ["Crítico", "Alerta"];
export const STATUS_ORDER = ["Crítico", "Alerta", "Seguimiento", "Satisfactorio", "Sin medición"];
export const SEVERITY: Record<string, number> = {
  "Crítico": 4,
  Alerta: 3,
  Seguimiento: 2,
  Satisfactorio: 1,
  "Sin medición": 0,
};
export const AREA_ORDER = ["Transporte de Fluidos", "Tranque Mauro", "Puerto", "Desaladora"];
export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function sortAreaNames(a: string, b: string) {
  const ia = AREA_ORDER.indexOf(a), ib = AREA_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.localeCompare(b);
}

export interface WeekRef { week: number; year: number }
export const wkey = (w: WeekRef) => w.year * 100 + w.week;

/** Semana ISO de una fecha UTC. */
export function isoWeekOf(d: Date): WeekRef {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3); // jueves
  const year = t.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((t.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return { week, year };
}

/** Semanas ISO cuyo jueves cae en el mes (month 1-12). Así cada semana pertenece a un solo mes. */
export function monthWeeks(month: number, year: number): WeekRef[] {
  const out: WeekRef[] = [];
  const d = new Date(Date.UTC(year, month - 1, 1));
  while (d.getUTCMonth() === month - 1) {
    if (d.getUTCDay() === 4) out.push(isoWeekOf(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function prevMonth(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

export interface WeeklyRow {
  equipment_id: string;
  week_number: number;
  year: number;
  status: string;
  sap_notification?: string | null;
  sap_order?: string | null;
}

/** Último registro de cada equipo dentro del conjunto de semanas dado. */
export function latestByEquipment(rows: WeeklyRow[], weeks: WeekRef[]) {
  const keys = new Set(weeks.map(wkey));
  const map = new Map<string, WeeklyRow>();
  rows.forEach((r) => {
    const k = wkey({ week: r.week_number, year: r.year });
    if (!keys.has(k)) return;
    const cur = map.get(r.equipment_id);
    if (!cur || wkey({ week: cur.week_number, year: cur.year }) < k) map.set(r.equipment_id, r);
  });
  return map;
}

/**
 * Semanas seguidas en Crítico/Alerta hasta la semana límite (inclusive),
 * contando registros consecutivos del equipo desde el más reciente hacia atrás.
 */
export function consecutiveBadWeeks(history: WeeklyRow[], until: WeekRef): { weeks: number; since: WeekRef | null } {
  const limit = wkey(until);
  const sorted = history
    .filter((r) => wkey({ week: r.week_number, year: r.year }) <= limit)
    .sort((a, b) => wkey({ week: b.week_number, year: b.year }) - wkey({ week: a.week_number, year: a.year }));
  let n = 0;
  let since: WeekRef | null = null;
  for (const r of sorted) {
    if (!BAD_STATUSES.includes(r.status)) break;
    n++;
    since = { week: r.week_number, year: r.year };
  }
  return { weeks: n, since };
}

/** Semana dentro del mes en que el equipo volvió a Alerta/Crítico desde Satisfactorio/Seguimiento. */
export function relapseWeek(history: WeeklyRow[], weeks: WeekRef[]): WeekRef | null {
  const keys = new Set(weeks.map(wkey));
  const sorted = [...history].sort(
    (a, b) => wkey({ week: a.week_number, year: a.year }) - wkey({ week: b.week_number, year: b.year })
  );
  let found: WeekRef | null = null;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], cur = sorted[i];
    const k = wkey({ week: cur.week_number, year: cur.year });
    if (keys.has(k) && BAD_STATUSES.includes(cur.status) && ["Satisfactorio", "Seguimiento"].includes(prev.status)) {
      found = { week: cur.week_number, year: cur.year };
    }
  }
  return found;
}

export const FAILURE_MODES = ["Rodamiento", "Soltura", "Lubricación", "Desalineamiento", "Desbalanceo", "Otra"] as const;
export type FailureMode = (typeof FAILURE_MODES)[number];

const KEYWORDS: [FailureMode, string[]][] = [
  ["Rodamiento", ["rodamiento", "bpfo", "bpfi", "pista", "jaula", "elemento rodante", "elementos rodantes"]],
  ["Soltura", ["soltura", "holgura", "suelto", "suelta", "perno", "anclaje", "pata coja"]],
  ["Lubricación", ["lubricacion", "lubricante", "grasa", "aceite"]],
  ["Desalineamiento", ["desalineamiento", "desalineado", "desalineacion", "alineacion"]],
  ["Desbalanceo", ["desbalanceo", "desbalance"]],
];

export const normalize = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Modos de falla mencionados en un texto (puede ser más de uno). Sin coincidencias → "Otra". */
export function classifyDiagnosis(text: string): FailureMode[] {
  const t = normalize(text);
  const modes = KEYWORDS.filter(([, words]) => words.some((w) => t.includes(w))).map(([m]) => m);
  return modes.length ? modes : ["Otra"];
}

export interface ParetoRow { mode: FailureMode; count: number; pct: number; cumPct: number }

export function buildPareto(texts: string[]): ParetoRow[] {
  const counts = new Map<FailureMode, number>();
  texts.forEach((t) => classifyDiagnosis(t).forEach((m) => counts.set(m, (counts.get(m) || 0) + 1)));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  let cum = 0;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || FAILURE_MODES.indexOf(a[0]) - FAILURE_MODES.indexOf(b[0]))
    .map(([mode, count]) => {
      cum += count;
      return { mode, count, pct: total ? (count / total) * 100 : 0, cumPct: total ? (cum / total) * 100 : 0 };
    });
}
