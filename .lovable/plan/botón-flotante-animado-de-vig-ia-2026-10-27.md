# Botón flotante animado de Vig-IA

## Qué verás
- Un botón redondo flotante en la esquina inferior derecha de **Dashboard**, **Informes** y **Reporte**.
- Dentro, el logo de Vig-IA (ojo + línea de pulso) dibujado de nuevo para poder animarlo:
  - El iris/pupila del ojo se mueve suavemente de lado a lado, como mirando.
  - La línea del gráfico (pulso) se desplaza de forma continua, como un monitor en vivo.
- Al pasar el cursor aparece la etiqueta "Preguntar a Vig-IA" y el botón crece un poco.
- Al hacer clic se abre la sección Vig-IA (la misma del menú lateral).
- No aparece en las demás secciones ni en el propio Vig-IA. Respeta la opción del sistema "reducir movimiento" (queda quieto).

## Detalles técnicos
- Nuevo `src/components/vigia/VigiaFab.tsx`: SVG inline que replica el logo (párpado navy, iris teal, pupila con brillo, trazo de pulso teal), usando tokens de color del tema (`--primary`, navy existente).
- Animaciones con keyframes en `tailwind.config.ts`: `vigia-look` (translateX del grupo iris/pupila ±6px, ~3s ease-in-out infinito) y `vigia-pulse` (`stroke-dashoffset` sobre el trazo del gráfico, ~2s lineal infinito). `motion-reduce:animate-none`.
- Botón `fixed bottom-6 right-6 z-40`, círculo blanco con sombra y borde teal; navega con `useNavigate('/vig-ia')`; `aria-label` y tooltip.
- Se monta en `Dashboard.tsx`, `Reports.tsx` y `MonthlyReport.tsx`. Sin cambios en otras funciones ni en el PDF.
- Verificación visual con Playwright en las tres secciones (posición, animación y clic hacia Vig-IA).
