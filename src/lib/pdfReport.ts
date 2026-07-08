import jsPDF from "jspdf";

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

export interface ReportPdfData {
  tag: string;
  equipmentName: string;
  area: string;
  system: string;
  tipo: string;
  week: number;
  year: number;
  fecha: string;
  tecnico?: string | null;
  status: string;
  hallazgos?: string | null;
  recomendacion?: string | null;
  photos: { url: string; caption?: string | null }[];
}

export async function generateReportPdf(data: ReportPdfData): Promise<Blob> {
  // Iterate compression until <=1MB
  const attempts: [number, number][] = [
    [1280, 0.75],
    [1024, 0.65],
    [800, 0.55],
    [640, 0.45],
    [480, 0.35],
  ];

  for (const [maxW, q] of attempts) {
    const blob = await buildPdf(data, maxW, q);
    if (blob.size <= MAX_BYTES) return blob;
  }
  // Last resort: no photos
  return buildPdf({ ...data, photos: [] }, 480, 0.4);
}

async function buildPdf(data: ReportPdfData, maxW: number, q: number): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(56, 153, 168);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Informe Técnico", margin, 28);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Tipo: ${data.tipo}`, margin, 46);
  doc.text(
    `Semana ${data.week} / ${data.year}`,
    pageW - margin,
    46,
    { align: "right" }
  );
  y = 80;

  // Equipment info block
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.tag} — ${data.equipmentName}`, margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`${data.area} › ${data.system}`, margin, y);
  y += 14;
  doc.text(
    `Fecha inspección: ${data.fecha}   |   Técnico: ${data.tecnico || "—"}   |   Estado: ${data.status}`,
    margin,
    y
  );
  y += 20;

  const drawSection = (title: string, body: string) => {
    if (y > pageH - 120) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(56, 153, 168);
    doc.text(title, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(body || "—", pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 10;
  };

  drawSection("Hallazgos", data.hallazgos || "—");
  drawSection("Recomendación", data.recomendacion || "—");

  // Photos
  if (data.photos.length > 0) {
    if (y > pageH - 120) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(56, 153, 168);
    doc.text("Fotografías", margin, y);
    y += 14;

    const imgW = (pageW - margin * 2 - 12) / 2;
    const imgH = imgW * 0.75;
    let col = 0;

    for (const p of data.photos) {
      try {
        const dataUrl = await urlToJpegDataUrl(p.url, maxW, q);
        if (y + imgH + 24 > pageH - margin) {
          doc.addPage();
          y = margin;
          col = 0;
        }
        const x = margin + col * (imgW + 12);
        doc.addImage(dataUrl, "JPEG", x, y, imgW, imgH);
        if (p.caption) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          const capLines = doc.splitTextToSize(p.caption, imgW);
          doc.text(capLines, x, y + imgH + 10);
        }
        col++;
        if (col >= 2) {
          col = 0;
          y += imgH + 30;
        }
      } catch (e) {
        console.warn("Skipping photo", e);
      }
    }
  }

  return doc.output("blob");
}
