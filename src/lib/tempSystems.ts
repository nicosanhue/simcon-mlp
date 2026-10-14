/** Área técnica que agrupa los registros STC/STR usados solo por informes de termografía. */
export const TEMP_AREA_NAME = "Control Temperatura";
export const TEMP_SYSTEM_TAGS = ["STC", "STR"] as const;
export type TempSystemTag = (typeof TEMP_SYSTEM_TAGS)[number];
