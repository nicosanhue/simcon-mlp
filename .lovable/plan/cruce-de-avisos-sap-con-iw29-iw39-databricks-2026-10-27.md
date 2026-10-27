# Cruce de avisos SAP con IW29 / IW39 (Databricks)

## Objetivo
Cuando un informe técnico se guarda con un Aviso SAP, SIMCON busca en Databricks las OTs ligadas a ese aviso (IW39) y completa automáticamente:
- **Orden de trabajo (OT)** del aviso en la ficha del equipo y del informe.
- **Órdenes de trabajo asociadas** (lista) en el informe.
- **Fecha de planificación** = "Fecha inicio extremo" de IW39 (hoy aparece "Pendiente").

Además, un análisis de cruce: avisos del Dashboard vs IW29 (existe / estado) e IW39 (OT / fecha).

## Pasos
1. **Seguridad:** el usuario revoca el token pegado en el chat. Conectar Databricks con el conector oficial (tarjeta de conexión) usando un token nuevo. La clave nunca queda en el código.
2. **Descubrir tablas:** con el conector, listar catálogos y encontrar las tablas IW29 e IW39 y sus columnas (aviso, orden, estado, fecha inicio extremo). Mostrar al usuario qué columnas se usarán antes de seguir.
3. **Análisis de cruce (único):** comparar todos los avisos actuales de SIMCON (informes y registro semanal) con IW29/IW39 y entregar un resumen: cuántos avisos tienen OT, cuántos no existen en SAP, fechas planificadas.
4. **Función de búsqueda:** nueva función de servidor `sap-lookup` que recibe un aviso y devuelve OTs + fecha inicio extremo desde Databricks (consulta parametrizada, solo lectura).
5. **Al guardar un informe** (formulario de informes): llamar a `sap-lookup` con el Aviso SAP; guardar la OT principal en `ot_numero`, las OTs en "Órdenes asociadas" y actualizar el registro semanal del equipo (`sap_order`, `planned_date`). Si Databricks no responde, el informe se guarda igual y se muestra un aviso.
6. **Botón "Actualizar desde SAP"** en la ficha del equipo para refrescar avisos existentes.
7. Vig-IA (GPT-6 Astra) gana una herramienta de solo lectura para consultar OTs de un aviso.

## Detalles técnicos
- Conector Databricks vía gateway (`/2.0/sql/statements`, `warehouse_id` del almacén del usuario), parámetros nombrados, sin SQL libre.
- No se crean tablas nuevas; se reutilizan `reports.ot_numero`, `reports.ordenes_tags`, `weekly_reports.sap_order` y `planned_date`.
- No se modifican otras funciones; se respeta la exclusión del área "Control Temperatura".

## Pendiente del usuario
- Nombres exactos de las tablas IW29/IW39 en Databricks si no se encuentran en el paso 2.
