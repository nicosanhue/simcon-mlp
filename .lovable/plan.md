# Cruzar avisos y OT de Databricks con SIMCON

## Tablas de origen
- **Avisos (IW29):** `ams.iagen_sandbox.dmt_sap_transacciones_iw29_mst`. Se cruza con el aviso SAP de SIMCON y desde ahí se obtiene la OT asociada.
- **OT (IW39):** `ams.iagen_sandbox.dmt_sap_transacciones_iw39_mst`. Entrega el estado y la fecha planificada de la OT.

## Cómo va a funcionar
1. **Conectar Databricks**: se abre una tarjeta de conexión en el chat. Ahí ingresas los datos de tu espacio de Databricks. La clave queda guardada de forma segura y nunca llega al navegador.
2. **Identificar las tablas**: con la conexión lista, reviso qué tablas de avisos, OT y equipos tienes y te confirmo qué columnas se usan: número de aviso, número de OT, estado de la OT y fecha planificada.
3. **Sincronización diaria**: una vez al día, SIMCON toma todos los equipos que tienen un aviso SAP registrado y los busca en Databricks por número de aviso. Con eso:
   - **Completa la OT** cuando en SIMCON está vacía.
   - **Trae el estado de la OT** (abierta, en ejecución, cerrada).
   - **Actualiza la fecha planificada**.
   - Nunca cambia el estado de condición del equipo (Crítico, Alerta, etc.), que sigue saliendo de los informes y del CSV.
4. **Lo que verás**: en Avisos y OT y en el detalle de las condiciones del Dashboard aparecerán la OT, su estado con una etiqueta de color y la fecha planificada. También verás la hora de la última sincronización.
5. **Botón de respaldo**: perfiles MonCon y AdC podrán ejecutar "Sincronizar ahora" si no quieren esperar al día siguiente.

## Lo que necesito de ti
- Acceso a Databricks con permiso de lectura sobre las tablas de avisos y OT, y un SQL Warehouse activo.
- El nombre de las tablas, si ya lo sabes. Si no, las busco después de conectar.

## Detalles técnicos
- Conector Databricks de Lovable, vinculado al proyecto. Las llamadas pasan por una función de servidor `databricks-sync`, que usa `/2.0/sql/statements` con parámetros (`:avisos`), sin SQL armado con texto del usuario.
- Columnas nuevas en `weekly_reports`: `ot_status text` y `databricks_synced_at timestamptz`. `sap_order` y `planned_date` se llenan solo si llega un valor. Se agrega una tabla `integration_runs` para guardar el registro de cada ejecución (hora, filas cruzadas, errores).
- Alcance: semana más reciente cargada, avisos no vacíos y área distinta de Control Temperatura.
- Programación diaria con pg_cron + pg_net a las 06:00 hora de Chile (09:00 UTC). Corre 1 vez al día, así que el costo es mínimo y el retraso máximo es de un día.
- UI: `WorkOrders.tsx` y `CriticalAlertsList.tsx` muestran el estado de la OT, y en Admin queda el botón de sincronización, bloqueado para quien entra sin perfil.

## Datos de conexión ya identificados
- Espacio de Databricks: adb-5534975844772448.8.azuredatabricks.net
- SQL Warehouse: amsa_sql_endpoint_dev (f502d71903cb6768)
- Falta solo el acceso: un token, o una cuenta de servicio (Client ID + Secret) entregada por TI, con lectura sobre IW29 e IW39.
