import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TEMP_AREA_NAME } from "@/lib/tempSystems";
import { loadThermoContext, ThermoSystem } from "@/lib/thermoReport";
import {
  WeeklyRow, WeekRef, wkey, monthWeeks, prevMonth, latestByEquipment, consecutiveBadWeeks,
  relapseWeek, paretoFromModes, lastMonths, classifyDiagnosis, isoWeekOf, ParetoRow, BAD_STATUSES, STATUS_ORDER, SEVERITY, sortAreaNames,
} from "@/lib/monthlyReport";

export interface EquipInfo { id: string; tag: string; name: string; system: string; area: string }
export interface BadRow extends EquipInfo {
  status: string; aviso: string; ot: string; weeks: number; since: WeekRef | null;
}
export interface ChangeRow extends EquipInfo { from: string; to: string }
export interface RelapseRow extends EquipInfo { status: string; week: WeekRef }
export interface ThermoStationRow { code: string; name: string; maxDelta: number; tag: string }
export interface ThermoSummary {
  system: ThermoSystem;
  weeks: WeekRef[];
  stations: ThermoStationRow[];
  over25: number;
  top: { tag: string; station: string; delta: number }[];
}
export interface MonthlyReportData {
  month: number;
  year: number;
  weeks: WeekRef[];
  counts: Record<string, number>;
  prevCounts: Record<string, number>;
  byArea: { area: string; rows: BadRow[] }[];
  pareto: ParetoRow[];
  diagnoses: DiagDetail[];
  /** Diagnósticos de los últimos TREND_MONTHS meses (incluye el mes). */
  trendDiagnoses: DiagDetail[];
  trendMonths: string[];
  diagCount: number;
  worsened: ChangeRow[];
  improved: ChangeRow[];
  relapses: RelapseRow[];
  thermo: ThermoSummary[];
}

async function fetchWeekly(fromYear: number): Promise<(WeeklyRow & { equipment: any })[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("weekly_reports")
      .select("equipment_id, week_number, year, status, sap_notification, sap_order, equipment(id, tag, name, systems(name, areas(name)))")
      .gte("year", fromYear)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export interface DiagDetail { tag: string; name: string; area: string; week: WeekRef; componente: string; condicion: string; text: string; modes: string[]; tecnica: string; month: string }

export const TREND_MONTHS = 6;

async function fetchReportTexts(month: number, year: number): Promise<DiagDetail[]> {
  const s0 = new Date(Date.UTC(year, month - 1 - (TREND_MONTHS - 1), 1));
  const start = `${s0.getUTCFullYear()}-${String(s0.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const nm = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
  const end = `${nm.y}-${String(nm.m).padStart(2, "0")}-01`;
  return fetchDiagnoses(start, end);
}

/** Diagnósticos de informes (Seguimiento/Alerta/Crítico) con fecha_informe en [start, end). */
export async function fetchDiagnoses(start: string, end: string): Promise<DiagDetail[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, sistema_temp, tipo, fecha_informe, equipment(tag, name, systems(name, areas(name))), report_items(diagnostico, analisis_tecnico, condicion, componente, equipo_tag)")
    .gte("fecha_informe", start)
    .lt("fecha_informe", end);
  if (error) throw error;
  const texts: DiagDetail[] = [];
  (data || []).forEach((r: any) => {
    const eq = r.equipment || {};
    const week = isoWeekOf(new Date(r.fecha_informe));
    if (r.sistema_temp) return;
    const items = (r.report_items || []).filter((i: any) => ["Seguimiento", "Alerta", "Crítico"].includes(i.condicion));
    items.forEach((i: any) => {
      const t = [i.diagnostico, i.analisis_tecnico].filter(Boolean).join(" ");
      if (t.trim()) texts.push({
        tag: i.equipo_tag || eq.tag || "—", name: eq.name || "", area: eq.systems?.areas?.name || "—",
        week, componente: i.componente || "", condicion: i.condicion, text: t, modes: classifyDiagnosis(t),
        tecnica: r.tipo || "", month: String(r.fecha_informe).slice(0, 7),
      });
    });
  });
  return texts;
}

async function thermoSummary(system: ThermoSystem, weeks: WeekRef[]): Promise<ThermoSummary> {
  const ctx = await loadThermoContext(system);
  const published = new Set(ctx.weeks.filter((w) => w.published).map((w) => wkey(w)));
  const keys = new Set(weeks.map(wkey).filter((k) => published.has(k)));
  const usedWeeks = weeks.filter((w) => keys.has(wkey(w)));
  const spoolMax = new Map<string, number>();
  ctx.readings.forEach((r) => {
    if (!keys.has(wkey({ week: r.week_number, year: r.year })) || r.delta_t == null) return;
    const d = Number(r.delta_t);
    if ((spoolMax.get(r.spool_id) ?? -Infinity) < d) spoolMax.set(r.spool_id, d);
  });
  const stationName = new Map(ctx.stations.map((s) => [s.id, s.name || s.code]));
  const stations: ThermoStationRow[] = ctx.stations.map((st) => {
    let best = { d: 0, tag: "—" };
    ctx.spools.filter((s) => s.station_id === st.id).forEach((s) => {
      const d = spoolMax.get(s.id);
      if (d != null && d > best.d) best = { d, tag: s.tag };
    });
    return { code: st.code, name: st.name, maxDelta: best.d, tag: best.tag };
  });
  const all = ctx.spools
    .filter((s) => spoolMax.has(s.id))
    .map((s) => ({ tag: s.tag, station: stationName.get(s.station_id) || "", delta: spoolMax.get(s.id)! }));
  return {
    system,
    weeks: usedWeeks,
    stations,
    over25: all.filter((x) => x.delta >= 2.5).length,
    top: all.sort((a, b) => b.delta - a.delta).slice(0, 5),
  };
}

const emptyCounts = () => Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<string, number>;

export async function loadMonthlyReport(month: number, year: number): Promise<MonthlyReportData> {
  const weeks = monthWeeks(month, year);
  const pm = prevMonth(month, year);
  const prevWeeks = monthWeeks(pm.month, pm.year);
  const lastWeek = weeks[weeks.length - 1];

  const [weekly, allTexts, stc, str] = await Promise.all([
    fetchWeekly(year - 1),
    fetchReportTexts(month, year),
    thermoSummary("stc", weeks).catch(() => null),
    thermoSummary("str", weeks).catch(() => null),
  ]);

  const curMonth = `${year}-${String(month).padStart(2, "0")}`;
  const texts = allTexts.filter((t) => t.month === curMonth);
  const info = new Map<string, EquipInfo>();
  const rows = weekly.filter((r) => {
    const area = r.equipment?.systems?.areas?.name;
    if (!r.equipment || area === TEMP_AREA_NAME) return false;
    if (!info.has(r.equipment_id)) {
      info.set(r.equipment_id, {
        id: r.equipment_id, tag: r.equipment.tag, name: r.equipment.name,
        system: r.equipment.systems?.name || "", area: area || "Sin área",
      });
    }
    return true;
  });
  const history = new Map<string, WeeklyRow[]>();
  rows.forEach((r) => {
    const list = history.get(r.equipment_id) || [];
    list.push(r);
    history.set(r.equipment_id, list);
  });

  const cur = latestByEquipment(rows, weeks);
  const prev = latestByEquipment(rows, prevWeeks);
  const counts = emptyCounts();
  cur.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const prevCounts = emptyCounts();
  prev.forEach((r) => { prevCounts[r.status] = (prevCounts[r.status] || 0) + 1; });

  const bad: BadRow[] = [];
  cur.forEach((r, id) => {
    if (!BAD_STATUSES.includes(r.status)) return;
    const streak = lastWeek ? consecutiveBadWeeks(history.get(id) || [], lastWeek) : { weeks: 0, since: null };
    bad.push({ ...info.get(id)!, status: r.status, aviso: r.sap_notification || "", ot: r.sap_order || "", ...streak });
  });
  const areaMap = new Map<string, BadRow[]>();
  bad.forEach((b) => areaMap.set(b.area, [...(areaMap.get(b.area) || []), b]));
  const byArea = [...areaMap.entries()]
    .sort((a, b) => sortAreaNames(a[0], b[0]))
    .map(([area, list]) => ({
      area,
      rows: list.sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status] || a.tag.localeCompare(b.tag)),
    }));

  const worsened: ChangeRow[] = [];
  const improved: ChangeRow[] = [];
  cur.forEach((r, id) => {
    const p = prev.get(id);
    if (!p || p.status === r.status || r.status === "Sin medición" || p.status === "Sin medición") return;
    const row = { ...info.get(id)!, from: p.status, to: r.status };
    if (SEVERITY[r.status] > SEVERITY[p.status]) worsened.push(row);
    else improved.push(row);
  });
  const bySev = (a: ChangeRow, b: ChangeRow) => SEVERITY[b.to] - SEVERITY[a.to] || a.tag.localeCompare(b.tag);
  worsened.sort(bySev);
  improved.sort((a, b) => a.tag.localeCompare(b.tag));

  const relapses: RelapseRow[] = [];
  history.forEach((h, id) => {
    const w = relapseWeek(h, weeks);
    if (w) {
      const st = h.find((x) => x.week_number === w.week && x.year === w.year)!.status;
      relapses.push({ ...info.get(id)!, status: st, week: w });
    }
  });
  relapses.sort((a, b) => wkey(a.week) - wkey(b.week) || a.tag.localeCompare(b.tag));

  return {
    month, year, weeks, counts, prevCounts, byArea,
    pareto: paretoFromModes(texts.map((t) => t.modes)), diagnoses: texts,
    diagCount: texts.filter((t) => t.modes.length).length,
    trendDiagnoses: allTexts, trendMonths: lastMonths(month, year, TREND_MONTHS),
    worsened, improved, relapses,
    thermo: [stc, str].filter(Boolean) as ThermoSummary[],
  };
}

export function useMonthlyReport(month: number, year: number) {
  return useQuery({
    queryKey: ["monthly-report", year, month],
    queryFn: () => loadMonthlyReport(month, year),
    staleTime: 60_000,
  });
}
