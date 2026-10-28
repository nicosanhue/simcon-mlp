# Concentraducto 370: actualización cada 5 minutos

## Resultado
- La actualización automática cada 5 minutos no usa IA, así que no gasta tokens.
- Solo lee los datos de PI y SAP desde Databricks y los muestra en la página.
- Por decisión del usuario, la frecuencia sigue igual (cada 5 minutos).

## Cambios
- Ninguno. No hay que cambiar nada en SIMCON.

## Detalle técnico
- La página vuelve a pedir los datos a la función concentraducto-370 cada 5 minutos (`refetchInterval: 5 * 60_000`).
- Esa función no llama a Lovable AI. Solo Vig-IA gasta tokens, y únicamente cuando alguien le hace una pregunta.
