# Asistente Vig-IA para SIMCON

## Qué hará Vig-IA
Un chat dentro de SIMCON donde se escribe en lenguaje natural y Vig-IA responde usando los datos reales de la app:
- **Preguntas sobre equipos**: "¿Cómo está 4320PP4957?", "¿Qué equipos de Puerto están en alerta?"
- **Resumen del historial de informes**: condiciones semana a semana, diagnósticos, avisos SAP y OT.
- **Gráficos en el chat**: evolución del estado de un equipo, conteo por condición o área, ΔT de spools STC/STR.
- **Recomendaciones adicionales**: próximas inspecciones, técnicas sugeridas y prioridades, siempre apoyadas en los informes. Cuando una recomendación no sale de los datos, lo dice claramente.

Vig-IA solo lee información. No crea, edita ni borra informes, estados ni avisos.

## Cómo se verá en SIMCON
1. **Nueva sección "Vig-IA" en el menú** (después de "Reporte"): una página de chat con frases sugeridas para empezar.
2. **Botón "Preguntar a Vig-IA" dentro de cada equipo** (en el detalle con su historial e informes): abre la misma conversación con el TAG ya cargado, por ejemplo "Resume el historial de 4320PP4957".

La conversación es una sola y continua, con un botón "Nueva conversación" para empezar de cero. Queda guardada en la base de datos, así que se ve igual desde cualquier computador. Hay una conversación por perfil (MonCon, AdC y solo lectura).

## Qué no cambia
El Dashboard, Informes, Reporte, STC/STR, Lubricación, la importación CSV y los PDF siguen igual. Solo se agregan la sección nueva y el botón en el detalle del equipo.

## Detalles técnicos
- **Modelo**: Lovable AI con el modelo por defecto (`openai/gpt-6-astra`), mediante la API Responses con AI SDK, en una función del servidor `vig-ia` con streaming. Claude no está disponible para este tipo de proyecto.
- **Herramientas de solo lectura** que el modelo puede llamar:
  - `buscar_equipos(texto, area?, estado?)`: equipos con área, sistema y último estado.
  - `historial_equipo(tag, semanas?)`: weekly_reports, más reports/report_items (diagnóstico, recomendación, aviso, OT).
  - `resumen_estados(area?, semana?, anio?)`: conteos por condición.
  - `serie_grafico(tipo, tag|area, rango)`: datos listos para graficar. El navegador los muestra con Recharts dentro del mensaje.
  - `spools_temperatura(sistema, estacion?, tag?)`: ΔT de STC/STR.
  Se excluye el área "Control Temperatura" de los conteos de equipos.
- **Guardado**: tabla `vig_ia_messages` (perfil, mensaje en formato UIMessage, fecha), con GRANT y RLS. Se carga al abrir y se guarda al terminar cada respuesta.
- **Interfaz**: componentes de chat AI Elements, respuestas en markdown, herramientas mostradas como tarjetas colapsadas e identidad propia de Vig-IA (sin icono genérico). El botón del equipo navega a `/vig-ia?tag=XXX`.
- **Errores**: los mensajes 402/429 de créditos o límites se muestran tal cual en el chat, sin respuestas inventadas.
- **Verificación**: pruebas reales de una pregunta, un resumen con herramientas y un gráfico, luego recargar la página para confirmar que la conversación quedó guardada.
