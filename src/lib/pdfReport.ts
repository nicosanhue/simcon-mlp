import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MAX_BYTES = 1_000_000;

export async function compressImage(
  file: File | Blob,
  maxWidth = 1280,
  quality = 0.7
): Promise<{ dataUrl: string; blob: Blob }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await (await fetch(dataUrl)).blob();
  return { dataUrl, blob };
}

async function urlToJpegDataUrl(url: string, maxWidth: number, quality: number): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  const { dataUrl } = await compressImage(blob, maxWidth, quality);
  return dataUrl;
}

export const CONDICIONES = [
  "Satisfactorio",
  "Seguimiento",
  "Sin medición",
  "Alerta",
  "Crítico",
] as const;

const SEVERITY: Record<string, number> = {
  Satisfactorio: 0,
  Seguimiento: 1,
  "Sin medición": 2,
  Alerta: 3,
  "Crítico": 4,
};

export function worstCondition(conds: string[]): string {
  if (!conds.length) return "Satisfactorio";
  return conds.reduce((a, b) => ((SEVERITY[b] ?? 0) > (SEVERITY[a] ?? 0) ? b : a));
}

export function conditionRgb(cond: string): [number, number, number] {
  switch (cond) {
    case "Crítico":
      return [198, 40, 40];
    case "Alerta":
      return [237, 162, 0];
    case "Seguimiento":
      return [66, 110, 160];
    case "Sin medición":
      return [130, 130, 130];
    default:
      return [46, 139, 87];
  }
}

export interface ReportPdfItem {
  equipoTag: string;
  componente: string;
  analisis: string;
  diagnostico: string;
  recomendacion: string;
  condicion: string;
  avisoSap: string;
}

export interface ReportPdfData {
  tituloId: string;
  fechaInforme: string;
  gerencia?: string | null;
  avisoSap?: string | null;
  procesoArea?: string | null;
  otNumero?: string | null;
  condicionGeneral: string;
  items: ReportPdfItem[];
  photos: { url: string; caption?: string | null }[];
}

export async function generateReportPdf(data: ReportPdfData): Promise<Blob> {
  const attempts: [number, number][] = [
    [900, 0.7],
    [700, 0.6],
    [560, 0.5],
    [440, 0.4],
  ];
  for (const [maxW, q] of attempts) {
    const blob = await buildPdf(data, maxW, q);
    if (blob.size <= MAX_BYTES) return blob;
  }
  return buildPdf({ ...data, photos: [] }, 440, 0.4);
}

const NAVY: [number, number, number] = [26, 58, 95];

async function buildPdf(data: ReportPdfData, maxW: number, q: number): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 34;
  const contentW = pageW - margin * 2;

  // ── Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 58, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("INFORME EQUIPO / COMPONENTES", margin, 28);
  doc.setFontSize(9.5);
  doc.text("SISTEMA DE MONITOREO DE CONDICIONES Y DIAGNÓSTICO OPERACIONAL", margin, 44);

  let y = 74;

  // ── Info block (2 columns, label + value)
  const rows: [string, string, string, string][] = [
    ["TÍTULO / ID:", data.tituloId || "", "FECHA INFORME:", data.fechaInforme || ""],
    ["GERENCIA:", data.gerencia || "", "N° AVISO SAP:", data.avisoSap || ""],
    ["PROCESO / ÁREA:", data.procesoArea || "", "OT N°:", data.otNumero || ""],
  ];
  const labelW = 110;
  const halfW = contentW / 2;
  const rowH = 20;
  doc.setFontSize(9);
  rows.forEach((r, i) => {
    const ry = y + i * rowH;
    for (let c = 0; c < 2; c++) {
      const x = margin + c * halfW;
      const label = r[c * 2];
      const value = r[c * 2 + 1];
      doc.setFillColor(237, 241, 246);
      doc.rect(x, ry, labelW, rowH, "F");
      doc.setFillColor(250, 251, 253);
      doc.rect(x + labelW, ry, halfW - labelW, rowH, "F");
      doc.setDrawColor(210, 217, 226);
      doc.rect(x, ry, labelW, rowH);
      doc.rect(x + labelW, ry, halfW - labelW, rowH);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(label, x + 6, ry + 13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(doc.splitTextToSize(value, halfW - labelW - 12)[0] || "", x + labelW + 6, ry + 13);
    }
  });
  y += rows.length * rowH + 16;

  // ── Section 1
  const sectionTitle = (t: string) => {
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, contentW, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(t, margin + 6, y + 12.5);
    y += 18;
  };

  sectionTitle("1. RESUMEN DE CONDICIÓN DEL EQUIPO");
  const cond = data.condicionGeneral || "Satisfactorio";
  const [cr, cg, cb] = conditionRgb(cond);
  doc.setFillColor(cr, cg, cb);
  doc.rect(margin, y, contentW, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(cond.toUpperCase(), pageW / 2, y + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Condición más desfavorable de la evaluación detallada", pageW / 2, y + 28, {
    align: "center",
  });
  y += 34 + 14;

  // ── Section 2
  sectionTitle("2. EVALUACIÓN DETALLADA POR EQUIPO Y COMPONENTE");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[
      "Equipo / Tag",
      "Componente",
      "Análisis Técnico",
      "Diagnóstico",
      "Recomendación",
      "Condición",
      "Aviso SAP",
    ]],
    body: data.items.map((it) => [
      it.equipoTag,
      it.componente,
      it.analisis,
      it.diagnostico,
      it.recomendacion,
      it.condicion,
      it.avisoSap,
    ]),
    styles: { fontSize: 7.2, cellPadding: 3, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7.4 },
    alternateRowStyles: { fillColor: [249, 250, 252] },
    columnStyles: {
      0: { cellWidth: 68 },
      1: { cellWidth: 60 },
      2: { cellWidth: 118 },
      3: { cellWidth: 96 },
      4: { cellWidth: 96 },
      5: { cellWidth: 55, halign: "center" },
      6: { cellWidth: 51, halign: "center" },
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 5) {
        const [r, g, b] = conditionRgb(String(d.cell.raw));
        d.cell.styles.textColor = [r, g, b];
        d.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 14;

  // ── Photos (max 4, 2x2 grid), fitted into remaining space above signatures
  const signaturesH = 62;
  const availH = pageH - margin - signaturesH - y;
  const photos = data.photos.slice(0, 4);
  if (photos.length > 0 && availH > 60) {
    const cols = photos.length > 1 ? 2 : 1;
    const rowsN = Math.ceil(photos.length / cols);
    const gap = 8;
    const imgW = (contentW - gap * (cols - 1)) / cols;
    const maxRowH = (availH - 12 - gap * (rowsN - 1)) / rowsN;
    const imgH = Math.min(imgW * 0.68, maxRowH - (photos.some((p) => p.caption) ? 10 : 0));

    if (imgH > 40) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text("FOTOGRAFÍAS", margin, y);
      y += 8;
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (imgW + gap);
        const py = y + row * (imgH + gap + 10);
        try {
          const dataUrl = await urlToJpegDataUrl(p.url, maxW, q);
          doc.addImage(dataUrl, "JPEG", x, py, imgW, imgH);
        } catch (e) {
          console.warn("Skipping photo", e);
        }
        if (p.caption) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(90, 90, 90);
          doc.text(doc.splitTextToSize(p.caption, imgW)[0] || "", x, py + imgH + 8);
        }
      }
    }
  }

  // ── Signatures (fixed at bottom)
  const sigY = pageH - margin - 34;
  const sigW = contentW / 3;
  const sigs: [string, string, string][] = [
    ["Especialista MonCon", "Bureau Veritas", ""],
    ["Líder Técnico", "Giovanni Gonzalez", ""],
    ["Senior MonCon MLP", "Nicolás Sanhueza", "Minera Los Pelambres"],
  ];
  sigs.forEach(([role, name, org], i) => {
    const cx = margin + sigW * i + sigW / 2;
    doc.setDrawColor(60, 60, 60);
    doc.line(margin + sigW * i + 20, sigY, margin + sigW * (i + 1) - 20, sigY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(role, cx, sigY + 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 100, 120);
    doc.text(name, cx, sigY + 23, { align: "center" });
    if (org) doc.text(org, cx, sigY + 33, { align: "center" });
  });

  // ── Footer
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("SIMCON - Sistema de Monitoreo de Condiciones", margin, pageH - 14);
  doc.text(`Página 1 de ${doc.getNumberOfPages()}`, pageW - margin, pageH - 14, { align: "right" });

  return doc.output("blob");
}
