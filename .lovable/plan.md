# Dashboard y STC: cinco ajustes

Cinco ajustes en el Dashboard y en Control Temperatura STC.

## 1. Quitar los botones de descarga

- Se retira la fila superior con "Descargar Críticos", "Descargar Excel Condiciones" y "Captura por Área".
- Se eliminan sus imports en `src/pages/Dashboard.tsx`.
- Los componentes se conservan en el proyecto (sin borrar archivos) para poder reactivarlos cuando quieras.
- El botón "Descargar Críticos" que vive en la barra del título general (`MainLayout.tsx`) queda igual; solo desaparece la fila del Dashboard.

## 2. Orden fijo en las condiciones

En la sección "Condiciones: Alerta, Críticas y Sin Medición" las tarjetas se mostrarán siempre en este orden:

```text
1. Crítico
2. Alerta
3. Sin medición
```

- Dentro de cada grupo, los equipos se ordenan por Tag (A-Z) para que la lista sea estable.
- Aplica tanto a la vista general como cuando filtrás haciendo clic en una tarjeta de estado (Satisfactorio y Seguimiento quedan al final si alguna vez aparecen en esa lista).
- El orden se aplica en `src/components/dashboard/CriticalAlertsList.tsx`, así que sirve para todas las formas en que se arma la lista.

## 3. Áreas como botones seleccionables

El selector de áreas (hoy un menú desplegable) pasa a ser una fila de botones que se pueden tocar directamente.

```text
[ Todas las áreas ] [ Transporte de Fluidos ] [ Tranque Mauro ] [ Puerto ] [ Desaladora ]
```

- Se mantienen todas las opciones, incluida "Todas las áreas", que sigue siendo la opción inicial.
- El botón activo queda resaltado; al tocar otro se cambia el área de todo el Dashboard (estadísticas, gráficos y condiciones).
- Orden fijo de siempre: Transporte de Fluidos, Tranque Mauro, Puerto, Desaladora. Si aparece un área nueva, se agrega al final en orden alfabético.
- Si hay muchas áreas o la pantalla es chica, los botones se acomodan en varias líneas sin cortarse.
- El cambio es solo visual: la forma de filtrar y los datos que se muestran siguen siendo los mismos.

## 4. Texto de los informes técnicos legible hacia abajo

En el pop-up de un equipo, el resumen de cada informe técnico hoy se muestra recortado en una sola línea.

- Se quita el recorte y el texto se acomoda en varias líneas dentro del propio recuadro.
- Las palabras largas o continuas se parten para que nunca se salgan del ancho disponible.
- La lectura queda hacia abajo: la ventana del pop-up sigue desplazándose en vertical y desaparece la barra horizontal.
- Los botones de ver, descargar, editar y eliminar del informe quedan a la derecha, sin que el texto los empuje.

## 5. Planos PDF en Control Temperatura STC

Los 5 planos (ISO-01 a ISO-05) se guardan en la nube del proyecto y quedan disponibles dentro de la sección STC.

Correspondencia entre planos y estaciones:

```text
370-ISO-01  Km 0            -> KM00
370-ISO-02  Km 22           -> KM22
370-ISO-03  Est. Monit. STC -> KM39, KM60 y KM93
370-ISO-04  Km 80           -> KM80
370-ISO-05  Km 120          -> KM120
```

- En la tabla "Resumen por Estación" se agrega una columna "Plano" a la derecha, con un ícono de descarga que baja el PDF del plano correspondiente a esa estación (las estaciones Km39, Km60 y Km93 comparten el mismo plano).
- En cada gráfico "Estación — Línea Principal" se agrega un ícono (ojo) junto al título, que abre el plano en un pop-up dentro de la misma página: se ve el PDF completo con scroll vertical, sin salir de la vista.
- El mismo visor pop-up que se usa en Informes se reutiliza aquí, así que el comportamiento es conocido: "Abrir en pestaña nueva" y "Descargar" dentro del visor.
- El usuario sin perfil (solo lectura) también puede ver y descargar los planos: solo la administración de los archivos queda para perfiles de modificación.
- Los archivos suben a la nube del proyecto; si mañana se actualiza un plano, se reemplaza el archivo y todos ven la versión nueva.
