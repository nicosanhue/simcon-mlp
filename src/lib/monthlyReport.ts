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
export const AREA_ORDER = ["Transporte de Fluidos", "Transporte Fluidos", "Tranque Mauro", "Puerto", "Desaladora"];
export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function sortAreaNames(a: string, b: string) {
  const ia = AREA_ORDER.indexOf(a), ib = AREA_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : Math.max(ia - 1, 0)) - (ib === -1 ? 99 : Math.max(ib - 1, 0));
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

export const FAILURE_MODES = [
  "Rodamiento", "Soltura", "Lubricación", "Desalineamiento", "Desbalanceo",
  "Estructural / Rigidez", "Vibración transmitida", "Desgaste interno / Roce", "Engranajes", "Correas", "Proceso / Operación",
  "Otra",
] as const;
export type FailureMode = (typeof FAILURE_MODES)[number];

const KEYWORDS: [FailureMode, string[]][] = [
  ["Rodamiento", ["rodamiento", "bpfo", "bpfi", "pista", "jaula", "elemento rodante", "elementos rodantes"]],
  ["Soltura", ["soltura", "holgura", "suelto", "suelta", "perno", "anclaje", "pata coja"]],
  ["Lubricación", ["lubricacion", "lubricante", "grasa", "aceite"]],
  ["Desalineamiento", ["desalineamiento", "desalineado", "desalineacion", "alineacion"]],
  ["Desbalanceo", ["desbalanceo", "desbalance"]],
  ["Estructural / Rigidez", ["rigidez", "debilidad estructural", "movilidad"]],
  ["Vibración transmitida", ["transmitida", "trasmitida", "transmitidas", "trasmitidas", "desde el reductor", "desde el motor"]],
  ["Desgaste interno / Roce", ["desgaste", "desajuste", "componentes internos", "roce"]],
  ["Engranajes", ["engranaje", "diente", "gmf"]],
  ["Correas", ["correa", "polea"]],
  ["Proceso / Operación", ["impacto", "ciclo de compresion", "peristaltica", "cavitacion"]],
];

/** Textos que no describen una falla: se excluyen del Pareto si no nombran ningún modo. */
const NO_FAILURE = ["estado satisfactorio", "valores aceptables", "vibracion aceptables", "valores estables", "en seguimiento", "sin acceso", "f/s"];

export const normalize = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Modos de falla mencionados en un texto (puede ser más de uno). Sin falla descrita → []. Sin coincidencias → "Otra". */
export function classifyDiagnosis(text: string): FailureMode[] {
  const t = normalize(text);
  const modes = KEYWORDS.filter(([, words]) => words.some((w) => t.includes(w))).map(([m]) => m);
  if (modes.length) return modes;
  return NO_FAILURE.some((w) => t.includes(w)) ? [] : ["Otra"];
}

export interface ParetoRow { mode: FailureMode; count: number; pct: number; cumPct: number }

export function buildPareto(texts: string[]): ParetoRow[] {
  return paretoFromModes(texts.map(classifyDiagnosis));
}

export function paretoFromModes(lists: string[][]): ParetoRow[] {
  const counts = new Map<FailureMode, number>();
  lists.forEach((l) => l.forEach((m) => counts.set(m as FailureMode, (counts.get(m as FailureMode) || 0) + 1)));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  let cum = 0;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || FAILURE_MODES.indexOf(a[0]) - FAILURE_MODES.indexOf(b[0]))
    .map(([mode, count]) => {
      cum += count;
      return { mode, count, pct: total ? (count / total) * 100 : 0, cumPct: total ? (cum / total) * 100 : 0 };
    });
}

export interface DiagLike { tag: string; name: string; area: string; componente: string; condicion: string; modes: string[]; month: string }

export interface CountRow { key: string; count: number; pct: number; cumPct: number }

/** Pareto de componentes dentro de un modo de falla. */
export function buildParetoByComponent(diags: DiagLike[], mode: string): CountRow[] {
  const counts = new Map<string, number>();
  diags.filter((d) => d.modes.includes(mode)).forEach((d) => {
    const k = d.componente?.trim() || "Sin componente";
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  let cum = 0;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => {
    cum += count;
    return { key, count, pct: total ? (count / total) * 100 : 0, cumPct: total ? (cum / total) * 100 : 0 };
  });
}

/** Meses "YYYY-MM" de los últimos n meses terminando en (month, year). */
export function lastMonths(month: number, year: number, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Conteo por mes y modo de falla. */
export function buildMonthlyTrend(diags: DiagLike[], months: string[]): ({ month: string } & Record<string, number>)[] {
  return months.map((m) => {
    const row: Record<string, number> = {};
    diags.filter((d) => d.month === m).forEach((d) => d.modes.forEach((mode) => (row[mode] = (row[mode] || 0) + 1)));
    return { month: m, ...row } as { month: string } & Record<string, number>;
  });
}

export interface BadActor { tag: string; name: string; area: string; count: number; modes: string[]; components: string[]; worst: string }

/** Top n equipos con más diagnósticos con falla. */
export function topBadActors(diags: DiagLike[], n = 10): BadActor[] {
  const map = new Map<string, BadActor>();
  diags.filter((d) => d.modes.length).forEach((d) => {
    const a = map.get(d.tag) || { tag: d.tag, name: d.name, area: d.area, count: 0, modes: [], components: [], worst: d.condicion };
    a.count++;
    d.modes.forEach((m) => !a.modes.includes(m) && a.modes.push(m));
    if (d.componente && !a.components.includes(d.componente)) a.components.push(d.componente);
    if ((SEVERITY[d.condicion] ?? 0) > (SEVERITY[a.worst] ?? 0)) a.worst = d.condicion;
    map.set(d.tag, a);
  });
  return [...map.values()].sort((a, b) => b.count - a.count || (SEVERITY[b.worst] ?? 0) - (SEVERITY[a.worst] ?? 0) || a.tag.localeCompare(b.tag)).slice(0, n);
}
