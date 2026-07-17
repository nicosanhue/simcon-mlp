export type StcStatus = "satisfactorio" | "alerta_media" | "alerta_alta" | "critico";

export interface StcStatusInfo {
  key: StcStatus;
  label: string;
  colorClass: string;
  bgClass: string;
  textClass: string;
  hex: string;
}

export function getStcStatus(delta: number | null | undefined): StcStatusInfo {
  const d = delta ?? 0;
  if (d < 2.5) {
    return {
      key: "satisfactorio",
      label: "Satisfactorio",
      colorClass: "bg-status-operativo",
      bgClass: "bg-status-operativo/15",
      textClass: "text-status-operativo",
      hex: "#22c55e",
    };
  }
  if (d < 3.0) {
    return {
      key: "alerta_media",
      label: "Alerta Media",
      colorClass: "bg-status-alerta",
      bgClass: "bg-status-alerta/15",
      textClass: "text-status-alerta",
      hex: "#eab308",
    };
  }
  if (d < 3.5) {
    return {
      key: "alerta_alta",
      label: "Alerta Alta",
      colorClass: "bg-stc-orange",
      bgClass: "bg-stc-orange/15",
      textClass: "text-stc-orange",
      hex: "#f97316",
    };
  }
  return {
    key: "critico",
    label: "Crítico",
    colorClass: "bg-status-falla",
    bgClass: "bg-status-falla/15",
    textClass: "text-status-falla",
    hex: "#ef4444",
  };
}
