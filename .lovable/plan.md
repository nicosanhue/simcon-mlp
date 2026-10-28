# Concentraducto 370 en SIMCON (PI + SAP en vivo)

## Qué hay en el HTML
- Página con datos fijos tomados el 28-10-2026: 154 tags PI (370:...) con 48 horas de valores por hora, 1.471 avisos y 982 OT de SAP (ubicaciones LP2.03.*), agrupados por nodo (TK, KM0, KM22, KM39, KM60, KM80, KM93, KM120, Puerto, Fugas, Gen).
- Los tags son de 3 tipos: medición (63), alarma (66) y estado (25). 145 usan valores interpolados y 9 valores registrados.
- Cada tag tiene un grado de coincidencia con SAP (Alta, Baja, No aplica o Sin coincidencia). 11 tags no tienen nodo.
- Carga React, Recharts y ECharts desde internet. Dentro de SIMCON no hace falta, porque SIMCON ya los incluye.

## Qué se construye
1. **"Concentraducto 370" en el menú**, visible para todos, con la cabecera y la barra lateral de SIMCON y sus colores teal/navy.
2. **Mismas vistas que el HTML**, rehechas en SIMCON: esquema de nodos, tarjetas de tags PI con su mini gráfico de 48 h, avisos y OT por nodo, y las tendencias semanales de avisos y OT.
3. **SAP en vivo**: avisos de IW29 y OT de IW39 filtrados por ubicación técnica `LP2.03*`, leídos desde las tablas de `hive_metastore.amsa_provisioning` que ya funcionan.
4. **PI en vivo** desde una tabla de Databricks: último valor y las últimas 48 h de cada tag.
5. **Indicadores de confianza**: cada tag muestra la hora de su último dato. Se marca "Sin dato" o "Dato antiguo" (más de 2 h) para no confundir un tag caído con un valor normal.
6. **Botón "Actualizar"** y actualización automática cada 5 minutos. Se muestra la hora de la última lectura de PI y de SAP.
7. **Si PI o SAP fallan**, la página no se cae: muestra un aviso y la última información disponible.

## Validación (para que no falle)
- Comprobar que los 154 tags del HTML existen en la tabla PI, con los nombres escritos exactamente igual. Te entrego la lista de los que falten.
- Comparar los conteos de SAP en vivo con los del HTML (1.471 avisos y 982 OT) y explicar cualquier diferencia.
- Respetar los estados SAP compuestos (por ejemplo "ABIE DMNV…"). Para decidir si una OT está abierta o cerrada se usa la misma regla que ya usa "Avisos y OT".
- Probar la página en el navegador con datos reales.

## Mejoras propuestas (opcionales)
- Que Vig-IA pueda consultar los tags PI del concentraducto, en modo solo lectura.
- Asignar a mano un nodo a los 11 tags que hoy aparecen como "SIN".
- Mostrar las alarmas activas al inicio de la página.

## Primer paso / dato pendiente
No conozco el nombre de la tabla PI. Primero la busco en Databricks con tu clave, mirando tablas con columnas de tag, hora y valor. Si encuentro varias o ninguna, te pregunto antes de seguir. Si tu clave no tiene permiso de lectura sobre esa tabla, habrá que pedirlo al administrador.

## Detalles técnicos
- Nueva función de servidor `concentraducto-370` (solo lectura). Usa `DATABRICKS_TOKEN` y el warehouse `f502d71903cb6768`, con SQL parametrizado:
  - `pi`: última lectura y serie de 48 h por hora. La lista de tags queda fija y aceptada en el servidor; no se aceptan tags arbitrarios.
  - `sap`: IW29 e IW39 con `ubicacion LIKE 'LP2.03%'`, más los agregados semanales.
- El catálogo de tags (tag, nodo, ubicación, descripción, unidad, tipo, confianza) se extrae del HTML a `src/data/concentraducto370Tags.ts`. Los valores ya no vienen del HTML.
- Página `src/pages/Concentraducto370.tsx` dentro de `MainLayout`, ruta `/concentraducto-370`, nueva entrada en `AppSidebar`. Usa React Query con `refetchInterval` de 5 minutos y gráficos de Recharts.
