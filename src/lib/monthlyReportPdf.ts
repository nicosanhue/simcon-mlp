import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_SIMCON, LOGO_MLP, LOGO_BV } from "./reportLogos";
import { logoJpeg, GERENCIA_FIJA, conditionRgb } from "./pdfReport";
import { MONTHS, STATUS_ORDER, FAILURE_MODES, buildMonthlyTrend, topBadActors } from "./monthlyReport";
import { getStcStatus } from "./stcStatus";
import type { MonthlyReportData } from "@/hooks/useMonthlyReport";

const NAVY: [number, number, number] = [26, 58, 95];
const TEAL: [number, number, number] = [56, 153, 168];

const hexRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
];
const wk = (w: { week: number; year: number } | null) => (w ? `S${w.week}/${w.year}` : "—");

export function monthlyFileName(month: number, year: number) {
  return `MLP_REPORTE_MENSUAL_${year}${String(month).padStart(2, "0")}.pdf`;
}

export async function generateMonthlyReportPdf(d: MonthlyReportData): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 34;
  const cw = pageW - m * 2;

  try {
    const [a, b, c] = await Promise.all([logoJpeg(LOGO_SIMCON), logoJpeg(LOGO_MLP), logoJpeg(LOGO_BV)]);
    doc.addImage(a, "JPEG", m, 6, 40, 34);
    doc.addImage(b, "JPEG", pageW / 2 - 34, 11, 69, 24);
    doc.addImage(c, "JPEG", pageW - m - 35, 7, 35, 32);
  } catch (e) {
    console.warn("logos", e);
  }
  doc.setFillColor(...NAVY);
  doc.rect(0, 46, pageW, 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`REPORTE MENSUAL DE EQUIPOS — ${MONTHS[d.month - 1].toUpperCase()} ${d.year}`, m, 70);
  doc.setFontSize(8.5);
  doc.text(GERENCIA_FIJA, m, 86);
  doc.setTextColor(0, 0, 0);

  let y = 110;
  const ensure = (h: number) => {
    if (y + h > pageH - 40) { doc.addPage(); y = 40; }
  };
  const section = (title: string) => {
    ensure(40);
    doc.setFillColor(...TEAL);
    doc.rect(m, y, cw, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, m + 6, y + 12.5);
    doc.setTextColor(0, 0, 0);
    y += 24;
  };
  const subtitle = (t: string) => {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(t, m, y);
    y += 6;
  };
  const table = (head: string[], body: (string | number)[][], statusCol = -1) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body: body.length ? body : [[{ content: "Sin registros", colSpan: head.length, styles: { halign: "center", textColor: 120 } } as any]],
      margin: { left: m, right: m },
      styles: { fontSize: 7.5, cellPadding: 3 },
      headStyles: { fillColor: NAVY, fontSize: 7.5 },
      didParseCell: (h) => {
        if (statusCol >= 0 && h.section === "body" && h.column.index === statusCol && typeof h.cell.raw === "string") {
          h.cell.styles.fillColor = conditionRgb(h.cell.raw);
          h.cell.styles.textColor = 255;
          h.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Semanas consideradas: ${d.weeks.map((w) => w.week).join(", ")}`, m, y);
  y += 12;

  section("1. RESUMEN DEL MES (último estado de cada equipo)");
  table(STATUS_ORDER, [STATUS_ORDER.map((s) => d.counts[s] || 0)]);

  section(`2. PARETO DE CATEGORIZACIÓN DE ANOMALÍAS (${d.diagCount} diagnósticos del mes)`);
  if (d.pareto.length) {
    ensure(170);
    const h = 130, x0 = m + 30, w = cw - 60;
    const max = Math.max(...d.pareto.map((p) => p.count));
    const bw = w / d.pareto.length;
    doc.setDrawColor(150);
    doc.line(x0, y + h, x0 + w, y + h);
    const pts: [number, number][] = [];
    d.pareto.forEach((p, i) => {
      const bh = (p.count / max) * (h - 10);
      const bx = x0 + i * bw + bw * 0.15;
      doc.setFillColor(...TEAL);
      doc.rect(bx, y + h - bh, bw * 0.7, bh, "F");
      doc.setFontSize(7.5);
      doc.text(String(p.count), bx + bw * 0.35, y + h - bh - 3, { align: "center" });
      doc.text(p.mode, bx + bw * 0.35, y + h + 10, { align: "center" });
      pts.push([bx + bw * 0.35, y + h - (p.cumPct / 100) * (h - 10)]);
    });
    doc.setDrawColor(220, 80, 60);
    doc.setLineWidth(1.2);
    pts.forEach((p, i) => {
      if (i) doc.line(pts[i - 1][0], pts[i - 1][1], p[0], p[1]);
      doc.circle(p[0], p[1], 1.8, "S");
    });
    doc.setLineWidth(0.5);
    y += h + 20;
  }
  table(["Categorización de anomalía", "Cantidad", "%", "% acumulado"], d.pareto.map((p) => [p.mode, p.count, p.pct.toFixed(1), p.cumPct.toFixed(1)]));

  const trend = buildMonthlyTrend(d.trendDiagnoses, d.trendMonths);
  const tModes = FAILURE_MODES.filter((m) => trend.some((r) => (r as any)[m]));
  if (tModes.length) {
    subtitle(`Tendencia últimos ${d.trendMonths.length} meses (diagnósticos por categorización de anomalía)`);
    table(
      ["Categorización de anomalía", ...d.trendMonths.map((m) => `${MONTHS[Number(m.slice(5)) - 1].slice(0, 3)} ${m.slice(2, 4)}`)],
      tModes.map((m) => [m, ...trend.map((r) => (r as any)[m] || 0)]),
    );
  }
  const actors = topBadActors(d.diagnoses, 10);
  if (actors.length) {
    subtitle("Malos actores: top 10 de equipos con más diagnósticos");
    table(["#", "TAG", "Equipo", "Área", "Diag.", "Categorización de anomalías", "Componentes", "Peor condición"],
      actors.map((a, i) => [i + 1, a.tag, a.name, a.area, a.count, a.modes.join(", "), a.components.join(", "), a.worst]), 7);
  }

  section("3. EQUIPOS CRÍTICOS Y EN ALERTA POR ÁREA — SEMANAS SEGUIDAS");
  if (!d.byArea.length) table(["Tag"], []);
  d.byArea.forEach((a) => {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${a.area} (${a.rows.length})`, m, y);
    y += 6;
    table(
      ["Tag", "Equipo", "Sistema", "Estado", "Semanas", "Desde", "Aviso SAP", "OT"],
      a.rows.map((r) => [r.tag, r.name, r.system, r.status, r.weeks, wk(r.since), r.aviso || "Sin aviso", r.ot || "—"]),
      3
    );
  });

  section("4. COMPARACIÓN CON EL MES ANTERIOR");
  table(
    ["Estado", "Mes anterior", "Este mes", "Variación"],
    ["Crítico", "Alerta"].map((s) => {
      const diff = (d.counts[s] || 0) - (d.prevCounts[s] || 0);
      return [s, d.prevCounts[s] || 0, d.counts[s] || 0, diff > 0 ? `▲ +${diff}` : diff < 0 ? `▼ ${diff}` : "="];
    })
  );
  table(["Empeoraron: Tag", "Equipo", "Área", "Antes", "Ahora"], d.worsened.map((r) => [r.tag, r.name, r.area, r.from, r.to]), 4);
  table(["Mejoraron: Tag", "Equipo", "Área", "Antes", "Ahora"], d.improved.map((r) => [r.tag, r.name, r.area, r.from, r.to]), 4);

  section("5. EQUIPOS QUE VOLVIERON A FALLAR");
  table(["Tag", "Equipo", "Área", "Estado", "Semana"], d.relapses.map((r) => [r.tag, r.name, r.area, r.status, wk(r.week)]), 3);

  section("6. CONTROL DE TEMPERATURA STC Y STR");
  d.thermo.forEach((t) => {
    ensure(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `${t.system.toUpperCase()} — ${t.weeks.length ? `semanas publicadas ${t.weeks.map((w) => w.week).join(", ")}` : "sin semanas publicadas en el mes"} — spools ≥ 2,5 °C: ${t.over25}`,
      m, y
    );
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Estación", "ΔT máx (°C)", "Spool más caliente", "Estado"]],
      body: t.stations.map((s) => [s.name || s.code, s.maxDelta.toFixed(2), s.tag, getStcStatus(s.maxDelta).label]),
      margin: { left: m, right: m },
      styles: { fontSize: 7.5, cellPadding: 3 },
      headStyles: { fillColor: NAVY },
      didParseCell: (h) => {
        if (h.section === "body" && h.column.index === 3) {
          const st = t.stations[h.row.index];
          h.cell.styles.fillColor = hexRgb(getStcStatus(st.maxDelta).hex);
          h.cell.styles.textColor = 255;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    table(["Top 5 spools", "Estación", "ΔT máx (°C)"], t.top.map((x) => [x.tag, x.station, x.delta.toFixed(2)]));
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`SIMCON — Reporte mensual ${MONTHS[d.month - 1]} ${d.year} — Página ${i} de ${pages}`, pageW / 2, pageH - 18, { align: "center" });
  }
  return doc.output("blob");
}
