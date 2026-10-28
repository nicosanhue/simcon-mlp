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
