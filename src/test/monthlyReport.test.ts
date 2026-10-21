import { describe, it, expect } from "vitest";
import { classifyDiagnosis, consecutiveBadWeeks, monthWeeks, buildPareto, relapseWeek, buildParetoByComponent, topBadActors, lastMonths, buildMonthlyTrend } from "@/lib/monthlyReport";

const row = (week: number, status: string) => ({ equipment_id: "e", week_number: week, year: 2026, status });

describe("reporte mensual", () => {
  it("clasifica rodamiento y lubricación en el mismo diagnóstico", () => {
    expect(classifyDiagnosis("Daño en pista externa del rodamiento, falta de lubricación")).toEqual(["Rodamiento", "Lubricación"]);
  });
  it("clasifica soltura sin importar tildes", () => {
    expect(classifyDiagnosis("SOLTURA estructural en pernos de anclaje")).toEqual(["Soltura"]);
  });
  it("sin palabras clave queda como Otra", () => {
    expect(classifyDiagnosis("Ruido anormal en impulsor")).toEqual(["Otra"]);
  });
  it("cavitación es Proceso / Operación y falta de rigidez es Estructural", () => {
    expect(classifyDiagnosis("Cavitación en impulsor")).toEqual(["Proceso / Operación"]);
    expect(classifyDiagnosis("Falta de rigidez estructural.")).toEqual(["Estructural / Rigidez"]);
  });
  it("vibración transmitida desde el reductor se separa", () => {
    expect(classifyDiagnosis("Vibración trasmitida desde el reductor")).toEqual(["Vibración transmitida"]);
  });
  it("textos sin falla se excluyen del pareto", () => {
    expect(classifyDiagnosis("Equipo en estado satisfactorio.")).toEqual([]);
    expect(classifyDiagnosis("Equipo en seguimiento")).toEqual([]);
    expect(buildPareto(["Equipo en seguimiento", "rodamiento"]).map((p) => p.mode)).toEqual(["Rodamiento"]);
  });
  it("un texto en seguimiento que nombra un modo se cuenta", () => {
    expect(classifyDiagnosis("En seguimiento por desgaste de rodamiento")).toEqual(["Rodamiento", "Desgaste interno / Roce"]);
  });
  it("pareto por componente y top de equipos", () => {
    const d = (tag: string, comp: string, cond: string, modes: string[], month = "2026-10") => ({ tag, name: "", area: "A", componente: comp, condicion: cond, modes, month });
    const ds = [d("A1", "Motor", "Alerta", ["Rodamiento"]), d("A1", "Reductor", "Crítico", ["Rodamiento"]), d("B2", "Motor", "Alerta", ["Rodamiento"]), d("C3", "Motor", "Seguimiento", [])];
    expect(buildParetoByComponent(ds, "Rodamiento").map((r) => [r.key, r.count])).toEqual([["Motor", 2], ["Reductor", 1]]);
    const top = topBadActors(ds);
    expect(top.map((t) => t.tag)).toEqual(["A1", "B2"]);
    expect(top[0].worst).toBe("Crítico");
    expect(lastMonths(2, 2026, 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(buildMonthlyTrend(ds, ["2026-10"])[0]["Rodamiento"]).toBe(3);
  });
  it("pareto ordena de mayor a menor y acumula 100%", () => {
    const p = buildPareto(["rodamiento", "rodamiento", "soltura"]);
    expect(p[0].mode).toBe("Rodamiento");
    expect(p[0].count).toBe(2);
    expect(Math.round(p[p.length - 1].cumPct)).toBe(100);
  });
  it("cuenta semanas seguidas en Crítico/Alerta hasta la semana límite", () => {
    const h = [row(38, "Satisfactorio"), row(39, "Alerta"), row(40, "Crítico"), row(41, "Alerta"), row(45, "Satisfactorio")];
    expect(consecutiveBadWeeks(h, { week: 43, year: 2026 })).toEqual({ weeks: 3, since: { week: 39, year: 2026 } });
  });
  it("una semana satisfactoria corta la racha", () => {
    const h = [row(39, "Alerta"), row(40, "Satisfactorio"), row(41, "Crítico")];
    expect(consecutiveBadWeeks(h, { week: 41, year: 2026 }).weeks).toBe(1);
  });
  it("octubre 2026 tiene las semanas 40 a 44", () => {
    expect(monthWeeks(10, 2026).map((w) => w.week)).toEqual([40, 41, 42, 43, 44]);
  });
  it("detecta recaída dentro del mes", () => {
    const h = [row(39, "Crítico"), row(40, "Satisfactorio"), row(42, "Alerta")];
    expect(relapseWeek(h, monthWeeks(10, 2026))).toEqual({ week: 42, year: 2026 });
  });
});
