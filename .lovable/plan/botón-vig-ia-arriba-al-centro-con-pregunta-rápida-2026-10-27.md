# Botón Vig-IA arriba al centro con pregunta rápida

## Qué cambia
- El botón animado de Vig-IA pasa de la esquina inferior derecha a la **parte superior central** de Dashboard, Informes y Reporte (fijo, justo bajo la cabecera de SIMCON, sin tapar el contenido principal).
- Al pulsarlo se abre un **cuadro de texto** desplegado bajo el botón: "¿Qué quieres preguntarle a Vig-IA?", con botón Enviar (Enter también envía, Esc cierra).
- Al enviar, se abre la sección **Vig-IA** y la pregunta se **envía automáticamente**, mostrando la respuesta en el chat.
- La animación (ojo y gráfico) se mantiene igual.

## Detalles técnicos
- `VigiaFab.tsx`: posición `fixed top-[~72px] left-1/2 -translate-x-1/2`; usar Popover con Textarea; navegar a `/vig-ia?ask=<pregunta>`.
- `VigIA.tsx`: leer `ask` de la URL; tras cargar historial, enviar el mensaje una sola vez y limpiar el parámetro para no reenviarlo al recargar. El flujo existente `?tag=` queda igual.
- Sin perfil (solo lectura) se mantiene el comportamiento actual de Vig-IA.
- Verificar en pantalla en las tres páginas y el envío automático.
