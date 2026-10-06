# Repulpeo Quillayes: arreglar el "Bad Request"

## Por qué pasa
PumpGuardian no deja iniciar sesión cuando su página se muestra dentro de otro sitio. El navegador bloquea su "galleta" de seguridad dentro de SIMCON y por eso el inicio de sesión falla con "CSRF token missing". Eso solo puede cambiarlo PumpGuardian; desde SIMCON no hay forma de saltarlo de manera segura.

## Solución
Cambiar la página **Repulpeo Quillayes** para que abra el panel directamente en PumpGuardian, donde el inicio de sesión sí funciona:
- Se quita el recuadro con el error.
- En su lugar aparece una tarjeta con el nombre, una breve descripción y dos botones grandes:
  - **Abrir panel en ventana** (abre una ventana aparte, al lado de SIMCON).
  - **Abrir en pestaña nueva**.
- El punto en la barra lateral se mantiene igual.
- Una vez que inicias sesión, el navegador recuerda la sesión y las próximas veces entras directo.

Si más adelante PumpGuardian permite mostrarse dentro de otros sitios, se puede volver a mostrar incrustado.

## Detalles técnicos
- `src/pages/RepulpeoQuillayes.tsx`: eliminar el `iframe`; usar `Card` con icono `Gauge`, botón `window.open(URL, "pumpguardian", "width=1400,height=900,noopener")` y enlace `target="_blank" rel="noopener noreferrer"`. Solo tokens semánticos.
- Causa: cookie de sesión/CSRF con `SameSite` que el navegador no envía en contexto de terceros.
