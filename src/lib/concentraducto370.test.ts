import { describe, it, expect } from "vitest";
import { mergeLive, buildDocument, type C370Data, type C370Live } from "./concentraducto370";

const base: C370Data = {
  snap: "2026-10-28T00:55:00Z", sapIng: "2026-10-28T00:09:00Z", hours: ["a"],
  tags: [{ tag: "370:A", t: "old", v: "1", num: 1, s: [1], node: "KM0" }, { tag: "370:B", t: "old", v: "2", num: 2, s: [2] }],
  avisos: [{ id: "1" }], ots: [{ id: "9" }], utn: { X: "x" }, weekly: { av: [], ot: [] },
};

describe("Concentraducto 370 merge", () => {
  it("un tag sin lectura reciente queda sin valor (no reutiliza la foto)", () => {
    const live: C370Live = { generatedAt: "", errors: {}, sap: null,
      pi: { hours: ["h1", "h2"], snap: "now", live: { "370:A": { t: "t1", v: "5", num: 5, s: [4, 5] }, "370:B": { t: null, v: "", num: null, s: [null, null] } } } };
    const out = mergeLive(base, live);
    expect(out.tags[0]).toMatchObject({ v: "5", num: 5, node: "KM0" });
    expect(out.tags[1].num).toBeNull();
    expect(out.tags[1].v).toBe("");
  });
  it("si SAP falla se conservan avisos y OT de la foto", () => {
    const out = mergeLive(base, { generatedAt: "", errors: { sap: "x" }, sap: null, pi: null });
    expect(out.avisos).toHaveLength(1);
    expect(out.sapIng).toBe(base.sapIng);
  });
  it("los datos inyectados no pueden cerrar la etiqueta script", () => {
    const html = '<head></head><script type="application/json" id="data">{}</script>';
    const doc = buildDocument(html, { ...base, avisos: [{ txt: "</script><b>" }] });
    expect(doc.match(/<\/script>/g)).toHaveLength(1);
  });
});
