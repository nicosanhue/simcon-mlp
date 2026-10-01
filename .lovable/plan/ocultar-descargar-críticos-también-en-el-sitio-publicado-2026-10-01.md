# Ocultar "Descargar Críticos" también en el sitio publicado

## Qué está pasando

El botón ya **no** existe en la versión en edición: al abrir la vista previa, ni "Descargar Críticos"
ni el panel "Debug BD" aparecen en pantalla.

El botón que se ve en la captura pertenece a la **versión ya publicada** del sitio, que sigue siendo
una copia anterior al cambio. Se comprobó abriendo ambas:

```text
Vista previa        -> Descargar Críticos: no aparece   | Debug BD: no aparece
Sitio publicado     -> Descargar Críticos: visible      | Debug BD: visible
```

O sea: el trabajo está hecho, pero todavía no se ha publicado.

## Qué se hará

1. **Publicar la versión actual** del proyecto. No se modifica ningún archivo: solo se lleva a
   internet lo que ya está listo en la vista previa.
2. **Confirmar en el sitio publicado** que el botón de la esquina superior derecha y el panel
   "Debug BD" de la barra lateral han desaparecido.

## Qué se verá después

- Arriba a la derecha: sin el botón "Descargar Críticos".
- Barra lateral: sin el bloque "Debug BD".
- Se publican de una vez las mejoras ya terminadas: orden de condiciones (Crítico → Alerta → Sin
  medición), botones de área con "Todas las áreas", planos PDF en Control Temperatura, el aviso con
  el TAG del spool más caliente, la sección "Graficar Spool" y STR Control Temperatura.
- Los componentes de descarga y depuración siguen guardados en el proyecto: si más adelante quieres
  recuperar alguno, se vuelve a mostrar sin reconstruir nada.

## Detalles técnicos

- Acción: publicar con la herramienta de publicación del proyecto (no hay cambios de código ni de
  base de datos).
- Verificación posterior: cargar la URL publicada de Control Temperatura y comprobar que las
  coincidencias de "Descargar Críticos" y "Debug BD" sean cero, igual que en la vista previa.
- Riesgo: ninguno sobre los datos; la base de datos y la información cargada no se tocan.
