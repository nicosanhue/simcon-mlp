// Reporte ENEX: funciones puras sobre las filas de la hoja "Informes".
export type EnexStatus = "CRITICO" | "ALERTA" | "OPERATIVO" | "OTRO";
export const STATUSES: Exclude<EnexStatus, "OTRO">[] = ["CRITICO", "ALERTA", "OPERATIVO"];
export const NO_SITE = "Sin sitio asignado";

export interface EnexRow {
  date: string; // YYYY-MM-DD
  site: string;
  subsite: string;
  equipment: string;
  tag: string;
  component: string;
  status: EnexStatus;
}

export function normStatus(s: string | undefined): EnexStatus {
  const v = (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  if (v.startsWith("CRIT")) return "CRITICO";
  if (v.startsWith("ALERT")) return "ALERTA";
  if (v.startsWith("OPERAT") || v.startsWith("SATISF")) return "OPERATIVO";
  return "OTRO";
}

export function parseRows(values: string[][]): EnexRow[] {
  return values
    .slice(1)
    .filter((r) => r && /^\d{4}-\d{2}-\d{2}/.test(r[0] ?? ""))
    .map((r) => ({
      date: r[0].slice(0, 10),
      site: (r[1] ?? "").trim() || NO_SITE,
      subsite: (r[2] ?? "").trim(),
      equipment: (r[3] ?? "").trim(),
      tag: (r[4] ?? "").trim(),
      component: (r[5] ?? "").trim(),
      status: normStatus(r[6]),
    }));
}

export function counts(rows: EnexRow[]) {
  const c = { total: rows.length, CRITICO: 0, ALERTA: 0, OPERATIVO: 0 };
  for (const r of rows) if (r.status !== "OTRO") c[r.status]++;
  return c;
}

const addDays = (iso: string, d: number) => {
  const t = new Date(iso + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};

/** Conteos de los últimos `days` días hasta `ref` (incl.) frente a los `days` anteriores. */
export function periodDelta(rows: EnexRow[], ref: string, days = 30) {
  const start = addDays(ref, -days + 1);
  const prevStart = addDays(start, -days);
  const cur = counts(rows.filter((r) => r.date >= start && r.date <= ref));
  const prev = counts(rows.filter((r) => r.date >= prevStart && r.date < start));
  return { cur, prev };
}

/** Lunes (UTC) de la semana ISO de la fecha. */
export function weekStart(iso: string) {
  const t = new Date(iso + "T00:00:00Z");
  const dow = (t.getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

export function weeklySeries(rows: EnexRow[]) {
  const map = new Map<string, { week: string; CRITICO: number; ALERTA: number; OPERATIVO: number; total: number }>();
  for (const r of rows) {
    const w = weekStart(r.date);
    const e = map.get(w) ?? { week: w, CRITICO: 0, ALERTA: 0, OPERATIVO: 0, total: 0 };
    if (r.status !== "OTRO") e[r.status]++;
    e.total++;
    map.set(w, e);
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export function bySite(rows: EnexRow[]) {
  const map = new Map<string, { site: string; CRITICO: number; ALERTA: number; OPERATIVO: number; total: number }>();
  for (const r of rows) {
    const e = map.get(r.site) ?? { site: r.site, CRITICO: 0, ALERTA: 0, OPERATIVO: 0, total: 0 };
    if (r.status !== "OTRO") e[r.status]++;
    e.total++;
    map.set(r.site, e);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Último informe por TAG; solo los que quedaron en Crítico o Alerta. */
export function latestCritical(rows: EnexRow[]) {
  const last = new Map<string, EnexRow>();
  for (const r of rows) {
    const p = last.get(r.tag);
    if (!p || r.date > p.date) last.set(r.tag, r);
  }
  return [...last.values()]
    .filter((r) => r.status === "CRITICO" || r.status === "ALERTA")
    .sort((a, b) => (a.status === b.status ? b.date.localeCompare(a.date) : a.status === "CRITICO" ? -1 : 1));
}

const SEVERITY: Record<EnexStatus, number> = { OTRO: 0, OPERATIVO: 1, ALERTA: 2, CRITICO: 3 };

/** Matriz equipo × semana con la peor condición; equipos con más semanas en mal estado primero. */
export function heatMatrix(rows: EnexRow[], maxEquip = 25) {
  const weeks = [...new Set(rows.map((r) => weekStart(r.date)))].sort();
  const cell = new Map<string, number>();
  const bad = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.equipment}|${weekStart(r.date)}`;
    const sev = SEVERITY[r.status];
    if (sev > (cell.get(k) ?? 0)) cell.set(k, sev);
  }
  for (const [k, sev] of cell) if (sev >= 2) bad.set(k.split("|")[0], (bad.get(k.split("|")[0]) ?? 0) + 1);
  const equipments = [...bad.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxEquip).map(([e]) => e);
  const data: [number, number, number][] = [];
  equipments.forEach((e, y) => weeks.forEach((w, x) => {
    const v = cell.get(`${e}|${w}`);
    if (v) data.push([x, y, v]);
  }));
  return { weeks, equipments, data };
}
