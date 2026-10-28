// Combina la plantilla del Concentraducto 370 (catálogo de tags, estaciones) con los datos PI/SAP en vivo.
export interface C370Tag { tag: string; t: string | null; v: string; num: number | null; s: (number | null)[]; [k: string]: unknown }
export interface C370Data {
  snap: string; sapIng: string; hours: string[]; tags: C370Tag[];
  avisos: unknown[]; ots: unknown[]; utn: Record<string, string>; weekly: { av: unknown[]; ot: unknown[] };
}
export interface C370Live {
  generatedAt: string;
  pi: { hours: string[]; snap: string; live: Record<string, { t: string | null; v: string; num: number | null; s: (number | null)[] }> } | null;
  sap: { avisos: unknown[]; ots: unknown[]; utn: Record<string, string>; weekly: C370Data["weekly"]; sapIng: string } | null;
  errors: { pi?: string; sap?: string };
}

const DATA_RE = /(<script type="application\/json" id="data">)([\s\S]*?)(<\/script>)/;

export function parseTemplate(html: string): C370Data {
  const m = html.match(DATA_RE);
  if (!m) throw new Error("Plantilla sin datos");
  return JSON.parse(m[2]);
}

/** Datos finales: lo que llega en vivo reemplaza a la foto de la plantilla; lo que falle conserva la foto. */
export function mergeLive(base: C370Data, live: C370Live | null): C370Data {
  if (!live) return base;
  const out: C370Data = { ...base };
  if (live.pi) {
    out.hours = live.pi.hours;
    out.snap = live.pi.snap;
    out.tags = base.tags.map((t) => {
      const l = live.pi!.live[t.tag];
      if (!l) return t;
      // Un tag sin lecturas recientes se muestra sin valor, nunca con el valor antiguo de la foto.
      return { ...t, t: l.t ?? base.snap, v: l.t ? l.v : "", num: l.t ? l.num : null, s: l.s.map((x) => x ?? 0) };
    });
  }
  if (live.sap) {
    out.avisos = live.sap.avisos;
    out.ots = live.sap.ots;
    out.utn = { ...base.utn, ...live.sap.utn };
    out.weekly = live.sap.weekly;
    out.sapIng = live.sap.sapIng;
  }
  return out;
}

// Ajusta los colores de selección al teal de SIMCON y fija el tema claro.
const SIMCON_STYLE = `<style>:root,:root[data-theme]{--sel:#3899A8;--sel-bg:#e3f2f4}</style>
<script>document.documentElement.setAttribute('data-theme','light')</script>`;

export function buildDocument(html: string, data: C370Data): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return html.replace(DATA_RE, (_m, a, _b, c) => `${a}${json}${c}`).replace("</head>", `${SIMCON_STYLE}</head>`);
}

/** Minutos desde la última lectura; null si no hay dato. */
export function minutesSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.round((now - t) / 60000) : null;
}
