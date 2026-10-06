# Agregar "Repulpeo Quillayes" a la navegación

## Qué verás
- Nuevo punto **Repulpeo Quillayes** en la barra lateral (después de "STR Control Temperatura").
- Al abrirlo, el panel de PumpGuardian se muestra dentro de SIMCON, ocupando toda el área de contenido.
- Arriba, un botón **"Abrir en pestaña nueva"** por si el navegador no deja iniciar sesión dentro de SIMCON (algunos navegadores bloquean el inicio de sesión de sitios externos incrustados).

## Sobre las credenciales
- No se guardarán en SIMCON. Inicias sesión una vez dentro del panel con tu usuario y el navegador recuerda la sesión.
- Guardarlas en la app las dejaría visibles para cualquiera que abra SIMCON. Te recomiendo cambiar esa contraseña, porque quedó escrita en el chat.

## Detalles técnicos
- Nueva página `src/pages/RepulpeoQuillayes.tsx` con `MainLayout`, encabezado + botón externo y un `iframe` a `https://www.pumpguardian.app/pumps` (alto `calc(100vh - 10rem)`, borde y radio del sistema de diseño).
- Ruta `/repulpeo-quillayes` en `App.tsx`; ítem con icono `Gauge` en `AppSidebar.tsx`.
- El sitio no envía `X-Frame-Options` ni `frame-ancestors`, así que puede incrustarse; si sus cookies de sesión bloquean el iframe, se usa el botón de pestaña nueva.
