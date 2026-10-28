// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseRows, counts, bySite, latestCritical, periodDelta, weekStart, heatMatrix, NO_SITE } from "./enexReport";

const H = ["Fecha", "Sitio", "Subsitio", "Equipo", "TAG", "Componente", "Estado"];
const rows = parseRows([
  H,
  ["2026-10-15", "TFT", "TF", "ESP", "A", "A - x", "CRÍTICO"],
  ["2026-10-01", "TFT", "TF", "ESP", "A", "A - x", "OPERATIVO"],
  ["2026-10-14", "", "", "BOOST", "B", "B - y", "ALERTA"],
  ["2026-09-10", "MINA", "", "PALA", "C", "C - z", "OPERATIVO"],
  ["", "basura"],
]);

describe("enexReport", () => {
  it("ignora filas sin fecha y asigna sitio vacío", () => {
    expect(rows).toHaveLength(4);
    expect(rows[2].site).toBe(NO_SITE);
  });
  it("cuenta por estado, aceptando tildes", () => {
    expect(counts(rows)).toEqual({ total: 4, CRITICO: 1, ALERTA: 1, OPERATIVO: 2 });
  });
  it("agrupa por sitio", () => {
    expect(bySite(rows)[0]).toMatchObject({ site: "TFT", CRITICO: 1, OPERATIVO: 1, total: 2 });
  });
  it("usa el último informe de cada TAG para la lista crítica", () => {
    expect(latestCritical(rows).map((r) => r.tag)).toEqual(["A", "B"]);
  });
  it("compara los últimos 30 días con los 30 anteriores", () => {
    const { cur, prev } = periodDelta(rows, "2026-10-15");
    expect(cur.total).toBe(3);
    expect(prev.total).toBe(1);
  });
  it("semana empieza el lunes", () => {
    expect(weekStart("2026-10-15")).toBe("2026-10-12");
  });
  it("mapa de calor toma la peor condición de la semana", () => {
    const m = heatMatrix(rows);
    expect(m.equipments).toEqual(["ESP", "BOOST"]);
    expect(m.data.find(([x, y]) => y === 0 && m.weeks[x] === "2026-10-12")?.[2]).toBe(3);
  });
});

import { linkRow, enexTagKey, coverage, type LubAviso } from "./enexReport";
describe("cruce ENEX ↔ avisos MonCon", () => {
  const row = (tag: string, status: "CRITICO" | "ALERTA" | "OPERATIVO", date = "2026-09-01") =>
    ({ date, site: "TFT", subsite: "", equipment: "", tag, component: "", status });
  const av = (p: Partial<LubAviso>): LubAviso => ({ aviso: "1", descripcion: "", creado_el: "2026-09-02", status_aviso: "METR ORAS", orden: "5", status_ot: "LIB", fecha_inicio_extrema: null, ...p });

  it("vincula por TAG con sufijo", () => {
    expect(enexTagKey("340TM711 C")).toEqual({ letters: "TM", num: 711, suf: "C" });
    const l = linkRow(row("340TM711 C", "ALERTA"), [av({ descripcion: "MONCON; CAMBIO ACEITE TM711-C" })]);
    expect(l.state).toBe("OT_ABIERTA");
  });
  it("ignora avisos de otro sufijo o anteriores al informe", () => {
    expect(linkRow(row("340TM711 C", "ALERTA"), [av({ descripcion: "MONCON; LUB TM711-D" })]).state).toBe("SIN_AVISO");
    expect(linkRow(row("370PP914", "CRITICO"), [av({ descripcion: "MONCON; LUB PP914", creado_el: "2026-08-01" })]).state).toBe("SIN_AVISO");
  });
  it("aviso u OT cerrados = Ejecutado; operativo no requiere aviso", () => {
    expect(linkRow(row("370PP914", "CRITICO"), [av({ descripcion: "MONCON; LUB PP914", status_aviso: "ORAS MECE" })]).state).toBe("EJECUTADO");
    expect(linkRow(row("370PP914", "CRITICO"), [av({ descripcion: "LUB PP914", orden: null })]).state).toBe("AVISO_SIN_OT");
    expect(linkRow(row("370PP914", "OPERATIVO"), []).state).toBe("NO_REQUIERE");
  });
  it("cobertura cuenta solo Crítico/Alerta con OT", () => {
    const c = coverage([{ state: "EJECUTADO", aviso: null }, { state: "SIN_AVISO", aviso: null }, { state: "NO_REQUIERE", aviso: null }]);
    expect(c).toMatchObject({ total: 2, EJECUTADO: 1, SIN_AVISO: 1, pct: 50 });
  });
});
