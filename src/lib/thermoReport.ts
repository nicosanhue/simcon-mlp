import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_SIMCON, LOGO_MLP, LOGO_BV } from "./reportLogos";
import { conditionRgb, logoJpeg, urlToJpegDataUrl, GERENCIA_FIJA } from "./pdfReport";

export type ThermoSystem = "stc" | "str";

export const THERMO_NORMA_EJECUCION = "TERMOGRAFÍA VELTB-I-CMP195-SA-0001";
export const THERMO_NORMA_EVALUACION = "ISO 18434-1";
export const MAX_STATION_PHOTOS = 6;

export const thermoDescripcion = (s: ThermoSystem) =>
  `Inspección Termográfica Ruta del ${s.toUpperCase()}`;

/** Límites condenatorios del informe de termografía (independientes de Control Temperatura). */
export function thermoCondition(delta: number | null | undefined): "Satisfactorio" | "Alerta" | "Peligro" {
  const d = Number(delta ?? 0);
  if (d >= 5) return "Peligro";
  if (d >= 2.5) return "Alerta";
  return "Satisfactorio";
}
/** Equivalente en la escala de condiciones de informes. */
export const thermoToCondicion = (c: string) =>
  c === "Peligro" ? "Crítico" : c === "Alerta" ? "Alerta" : "Satisfactorio";

const tables = (s: ThermoSystem) => ({
  stations: `${s}_stations`,
  spools: `${s}_spools`,
  readings: `${s}_temperature_readings`,
  weeks: `${s}_tracking_weeks`,
});

export interface ThermoStation { id: string; code: string; name: string; order_index: number }
export interface ThermoSpool { id: string; station_id: string; tag: string; order_index: number; spool_number: number | null }
export interface ThermoReading { spool_id: string; week_number: number; year: number; delta_t: number | null }

export interface ThermoContext {
  stations: ThermoStation[];
  spools: ThermoSpool[];
  readings: ThermoReading[];
  weeks: { week: number; year: number; published: boolean }[];
}

async function fetchAll(table: string, cols: string, order: string): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select(cols)
      .order(order)
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function loadThermoContext(system: ThermoSystem): Promise<ThermoContext> {
  const t = tables(system);
  const [stations, spools, readings, weeksRows] = await Promise.all([
    fetchAll(t.stations, "id, code, name, order_index", "order_index"),
    fetchAll(t.spools, "id, station_id, tag, order_index, spool_number", "order_index"),
    fetchAll(t.readings, "spool_id, week_number, year, delta_t", "id"),
    fetchAll(t.weeks, "week_number, year, published", "year"),
  ]);
  const map = new Map<string, { week: number; year: number; published: boolean }>();
  weeksRows.forEach((w: any) => map.set(`${w.year}-${w.week_number}`, { week: w.week_number, year: w.year, published: !!w.published }));
  readings.forEach((r: any) => {
    const k = `${r.year}-${r.week_number}`;
    if (!map.has(k)) map.set(k, { week: r.week_number, year: r.year, published: false });
  });
  const weeks = [...map.values()].sort((a, b) => b.year - a.year || b.week - a.week);
  return { stations, spools, readings, weeks };
}

export function defaultThermoWeek(ctx: ThermoContext) {
  return ctx.weeks.find((w) => w.published) || ctx.weeks[0] || null;
}

/** Semanas (hasta n) iguales o anteriores a la elegida, en orden cronológico. */
export function lastWeeks(ctx: ThermoContext, week: number, year: number, n = 3) {
  return ctx.weeks
    .filter((w) => w.year < year || (w.year === year && w.week <= week))
    .slice(0, n)
    .reverse();
}

export interface ListadoRow { tag: string; estacion: string; delta: number; condicion: string }

export function computeListado(ctx: ThermoContext, week: number, year: number): ListadoRow[] {
  const spoolById = new Map(ctx.spools.map((s) => [s.id, s]));
  const stById = new Map(ctx.stations.map((s) => [s.id, s]));
  return ctx.readings
    .filter((r) => r.week_number === week && r.year === year && r.delta_t != null)
    .map((r) => ({ r, c: thermoCondition(r.delta_t) }))
    .filter((x) => x.c !== "Satisfactorio")
    .map(({ r, c }) => {
      const sp = spoolById.get(r.spool_id);
      const st = sp ? stById.get(sp.station_id) : undefined;
      return { tag: sp?.tag || "", estacion: st?.name || "", delta: Number(r.delta_t), condicion: c };
    })
    .sort((a, b) => b.delta - a.delta);
}

export function seriesFor(ctx: ThermoContext, tags: string[], week: number, year: number) {
  const wks = lastWeeks(ctx, week, year);
  const byTag = new Map(ctx.spools.map((s) => [s.tag, s]));
  const idx = new Map(ctx.readings.map((r) => [`${r.spool_id}|${r.year}|${r.week_number}`, r.delta_t]));
  return {
    labels: wks.map((w) => `S${w.week}/${w.year}`),
    series: [...new Set(tags)].map((tag) => {
      const sp = byTag.get(tag);
      return {
        tag,
        values: wks.map((w) => {
          const v = sp ? idx.get(`${sp.id}|${w.year}|${w.week}`) : null;
          return v == null ? null : Number(v);
        }),
      };
    }),
  };
}

// ───────────────────────── PDF ─────────────────────────

export interface ThermoPdfData {
  system: ThermoSystem;
  fechaInforme: string;
  otNumero?: string | null;
  avisoSap?: string | null;
  inspectores?: string | null;
  resultado?: string | null;
  condicionGeneral: string;
  alcance: string;
  semanaLabel: string;
  listado: (ListadoRow & { orden?: string })[];
  stations: {
    name: string;
    photos: { url: string; tag: string }[];
    chart: { labels: string[]; series: { tag: string; values: (number | null)[] }[] };
  }[];
}

const NAVY: [number, number, number] = [26, 58, 95];
const LINE_COLORS: [number, number, number][] = [
  [56, 153, 168], [198, 40, 40], [237, 162, 0], [66, 110, 160], [46, 139, 87], [120, 70, 160],
];

export async function generateThermoReportPdf(d: ThermoPdfData): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 34;
  const cw = pageW - m * 2;
  const logos = await Promise.all([logoJpeg(LOGO_SIMCON), logoJpeg(LOGO_MLP), logoJpeg(LOGO_BV)]).catch(() => null);

  const header = (title: string, sub?: string) => {
    if (logos) {
      doc.addImage(logos[0], "JPEG", m, 6, 40, 34);
      doc.addImage(logos[1], "JPEG", pageW / 2 - 34, 11, 69, 24);
      doc.addImage(logos[2], "JPEG", pageW - m - 35, 7, 35, 32);
    }
    doc.setFillColor(...NAVY);
    doc.rect(0, 46, pageW, sub ? 50 : 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, m, 68);
    if (sub) {
      doc.setFontSize(9);
      doc.text(sub, m, 86);
    }
    return sub ? 110 : 94;
  };
  let y = 0;
  const section = (t: string) => {
    doc.setFillColor(...NAVY);
    doc.rect(m, y, cw, 17, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(t, m + 6, y + 12);
    y += 21;
  };
  const kv = (rows: [string, string][], labelW = 150) => {
    autoTable(doc, {
      startY: y,
      margin: { left: m, right: m },
      body: rows,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: [210, 217, 226] },
      columnStyles: { 0: { cellWidth: labelW, fontStyle: "bold", textColor: NAVY, fillColor: [237, 241, 246] } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  };

  // ── Página 1
  y = header("INFORME DE ENSAYO DE TERMOGRAFÍA INFRARROJA", `${d.system.toUpperCase()} · ${GERENCIA_FIJA}`);
  kv([
    ["Solicitante", "Minera Los Pelambres"],
    ["Fecha informe / Semana", `${d.fechaInforme} · ${d.semanaLabel}`],
    ["OT N° / Aviso SAP", `${d.otNumero || "-"} / ${d.avisoSap || "-"}`],
  ]);

  section("RESUMEN DE CONDICIÓN");
  const [cr, cg, cb] = conditionRgb(d.condicionGeneral);
  doc.setFillColor(cr, cg, cb);
  doc.rect(m, y, cw, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(d.condicionGeneral.toUpperCase(), pageW / 2, y + 15, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Condición más desfavorable de la inspección", pageW / 2, y + 27, { align: "center" });
  y += 44;

  section("1. ANTECEDENTES GENERALES");
  kv([
    ["Descripción elemento", thermoDescripcion(d.system)],
    ["Alcance Inspección IR", d.alcance],
    ["Norma (s) Ejecución", THERMO_NORMA_EJECUCION],
    ["Norma (s) Evaluación", THERMO_NORMA_EVALUACION],
    ["Nombre Inspector (es)", d.inspectores || ""],
  ]);

  section("2. ANTECEDENTES TÉCNICOS");
  autoTable(doc, {
    startY: y, margin: { left: m, right: m }, theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, lineColor: [210, 217, 226] },
    columnStyles: { 0: { fontStyle: "bold", textColor: NAVY, fillColor: [237, 241, 246] }, 2: { fontStyle: "bold", textColor: NAVY, fillColor: [237, 241, 246] } },
    body: [
      ["Extensión de Ensayo", "100% a sector con acceso", "Condición Lumínica", "Nocturna"],
      ["Especificación del material", "Acero Carbono", "T° Amb. / T° Material", "14°C / 21°C"],
      ["Condición superficial", "Bruta", "Procedimiento", "PTS-DII-006"],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  section("3. EQUIPOS UTILIZADOS Y TÉCNICA EMPLEADA");
  autoTable(doc, {
    startY: y, margin: { left: m, right: m }, theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, lineColor: [210, 217, 226] },
    columnStyles: { 0: { fontStyle: "bold", textColor: NAVY, fillColor: [237, 241, 246] }, 2: { fontStyle: "bold", textColor: NAVY, fillColor: [237, 241, 246] } },
    body: [
      ["Equipos", "FLIR", "Emisividad", "0,95"],
      ["Modelo / Marca", "865", "Rango Temperatura", "10°C > 90°C"],
      ["Distancia de Medición", "1 mts a 10 mts", "Campo de Visión (IFOV)", "1.31 mRad"],
      ["Sensibilidad térmica", "0.03 a 30°C", "Bloque de calibración", "Escalonado Acero"],
      ["Rango o campo", "00-20 mm", "Velocidad de Palpador", "5930 m/s"],
      ["Método de Evaluación", "Contacto Directo", "Temperatura Amb y Mat", "15°C / 20°C"],
    ],
  });

  // Firmas
  const sigY = pageH - m - 34;
  const sigW = cw / 3;
  [["Especialista MonCon", "Bureau Veritas", ""], ["Líder Técnico", "Giovanni Gonzalez", ""], ["Senior MonCon MLP", "Nicolás Sanhueza", "Minera Los Pelambres"]].forEach(([role, name, org], i) => {
    const cx = m + sigW * i + sigW / 2;
    doc.setDrawColor(60, 60, 60);
    doc.line(m + sigW * i + 20, sigY, m + sigW * (i + 1) - 20, sigY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30);
    doc.text(role, cx, sigY + 12, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setTextColor(90, 100, 120);
    doc.text(name, cx, sigY + 23, { align: "center" });
    if (org) doc.text(org, cx, sigY + 33, { align: "center" });
  });

  // ── Página 2
  doc.addPage();
  y = header("RESULTADOS DE INSPECCIÓN");
  section("4. RESULTADO DE LA INSPECCIÓN");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(d.resultado || "—", cw - 8);
  doc.text(lines, m + 4, y + 4);
  y += lines.length * 11 + 14;

  section("CUADRO DE CRITICIDAD");
  autoTable(doc, {
    startY: y, margin: { left: m, right: m }, theme: "grid",
    styles: { fontSize: 8, cellPadding: 4, lineColor: [210, 217, 226], valign: "middle" },
    headStyles: { fillColor: NAVY, textColor: 255, halign: "center" },
    head: [[{ content: "Límites condenatorios", colSpan: 2 }, "Criterio de análisis de mantenimiento", "Criticidad"]],
    body: [
      ["Satisfactorio", "ΔT° < 2,4°C", "No es necesaria ninguna acción hasta la próxima inspección", "3"],
      ["Alerta", "ΔT° > 2,5°C < 4,9°C", "Realizar seguimiento para ver tendencias de temperatura, durante un periodo moderado de tiempo", "2"],
      ["Peligro", "ΔT° >= 5°C", "Reparación inmediata (dentro de 48 Horas). Realizar ultrasonido en el sector más crítico para medir espesor de pared.", "1"],
    ].map((r) => r.map((c) => c.replace("Δ", "D"))),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { cellWidth: 95, halign: "center" }, 3: { cellWidth: 60, halign: "center" } },
    didParseCell: (c) => {
      if (c.section === "body" && (c.column.index === 0 || c.column.index === 1 || c.column.index === 3)) {
        const col = [[46, 139, 87], [237, 162, 0], [198, 40, 40]][c.row.index] as [number, number, number];
        c.cell.styles.fillColor = col; c.cell.styles.textColor = 255;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  section("LISTADO DE EQUIPOS (Alerta / Peligro)");
  autoTable(doc, {
    startY: y, margin: { left: m, right: m }, theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [["TAG", "Orden", "Texto breve", "Área / Estación", "DT °C", "Condición"]],
    body: d.listado.length
      ? d.listado.map((l) => [l.tag, l.orden || "", `DT ${l.delta.toFixed(1)} °C`, l.estacion, l.delta.toFixed(1), l.condicion])
      : [[{ content: "Sin spools en Alerta o Peligro en la semana del informe", colSpan: 6, styles: { halign: "center", textColor: [100, 100, 100] } }]],
    didParseCell: (c) => {
      if (c.section === "body" && c.column.index === 5) {
        c.cell.styles.textColor = c.cell.raw === "Peligro" ? [198, 40, 40] : [200, 130, 0];
        c.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── Páginas por estación
  for (const st of d.stations) {
    doc.addPage();
    y = header(`ESTACIÓN ${st.name.replace(/^estaci[oó]n\s*/i, "").toUpperCase()}`, "ANEXO A: Imágenes inspección");
    const cols = 3, gap = 8;
    const imgW = (cw - gap * (cols - 1)) / cols;
    const imgH = imgW * 0.75;
    for (let i = 0; i < st.photos.length; i++) {
      const p = st.photos[i];
      const x = m + (i % cols) * (imgW + gap);
      const py = y + Math.floor(i / cols) * (imgH + 22);
      try {
        const url = await urlToJpegDataUrl(p.url, 800, 0.62);
        doc.addImage(url, "JPEG", x, py, imgW, imgH, undefined, "FAST");
      } catch (e) { console.warn("foto", e); }
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...NAVY);
      doc.text(p.tag, x + imgW / 2, py + imgH + 11, { align: "center" });
    }
    y += Math.ceil(st.photos.length / cols) * (imgH + 22) + 8;
    drawChart(doc, m, y, cw, Math.min(250, pageH - y - 40), st.chart, `Seguimiento ΔT últimas ${st.chart.labels.length} semanas`);
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text("SIMCON - Sistema de Monitoreo de Condiciones", m, pageH - 14);
    doc.text(`Página ${i} de ${n}`, pageW - m, pageH - 14, { align: "right" });
  }
  return doc.output("blob");
}

function drawChart(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  chart: { labels: string[]; series: { tag: string; values: (number | null)[] }[] },
  title: string
) {
  if (h < 90 || !chart.labels.length) return;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text(title.replace("Δ", "D"), x, y + 8);
  const legendH = 14 * Math.ceil(chart.series.length / 4);
  const px = x + 30, py = y + 18, pw = w - 40, ph = h - 40 - legendH;
  const all = chart.series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const maxV = Math.max(6, ...all) * 1.1;
  const minV = Math.min(0, ...all);
  const sy = (v: number) => py + ph - ((v - minV) / (maxV - minV)) * ph;
  const sx = (i: number) => (chart.labels.length === 1 ? px + pw / 2 : px + (i / (chart.labels.length - 1)) * pw);

  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5);
  doc.rect(px, py, pw, ph);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(90, 90, 90);
  for (let v = Math.ceil(minV); v <= maxV; v += maxV > 12 ? 2 : 1) {
    doc.setDrawColor(235, 235, 235); doc.line(px, sy(v), px + pw, sy(v));
    doc.text(String(v), px - 4, sy(v) + 2, { align: "right" });
  }
  ([[2.5, [237, 162, 0]], [5, [198, 40, 40]]] as [number, [number, number, number]][]).forEach(([v, c]) => {
    doc.setDrawColor(...c); doc.setLineDashPattern([3, 2], 0);
    doc.line(px, sy(v), px + pw, sy(v));
    doc.setLineDashPattern([], 0);
  });
  chart.labels.forEach((l, i) => doc.text(l, sx(i), py + ph + 10, { align: "center" }));

  chart.series.forEach((s, si) => {
    const c = LINE_COLORS[si % LINE_COLORS.length];
    doc.setDrawColor(...c); doc.setFillColor(...c); doc.setLineWidth(1.4);
    let prev: [number, number] | null = null;
    s.values.forEach((v, i) => {
      if (v == null) { prev = null; return; }
      const pt: [number, number] = [sx(i), sy(v)];
      if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
      doc.circle(pt[0], pt[1], 2, "F");
      prev = pt;
    });
    const lx = x + 30 + (si % 4) * (pw / 4);
    const ly = py + ph + 24 + Math.floor(si / 4) * 14;
    doc.rect(lx, ly - 5, 8, 5, "F");
    doc.setTextColor(40, 40, 40);
    doc.text(s.tag, lx + 12, ly);
  });
  doc.setLineWidth(0.5);
}
