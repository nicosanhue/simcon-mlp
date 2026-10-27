# SAP: rellenar fechas, Vig-IA con SAP y "Avisos y OT" actualizado

## 1. Rellenar fechas de planificación (una vez)
- Volver a cruzar con IW39 todos los avisos del registro semanal.
- Completar **solo campos vacíos**: OT (si falta) y Fecha de planificación = fecha inicio extremo. No se sobrescribe nada que ya tenga valor.
- Se excluye el área "Control Temperatura".
- Informar cuántos registros se completaron.

## 2. Vig-IA consulta SAP
- Nueva herramienta de solo lectura `consultar_sap`: recibe uno o varios avisos (o el TAG de un equipo, del que toma sus avisos) y devuelve OTs, estado del aviso, estado de la OT y fecha inicio extremo desde IW29/IW39.
- Instrucciones de Vig-IA: usarla cuando pregunten por avisos, OTs, fechas planificadas o atrasos; distinguir "dato SAP" de recomendaciones propias.
- Se mantiene GPT-6 Astra y el resto de herramientas sin cambios.

## 3. Página "Avisos y OT" con datos SAP en vivo
- Al cargar la página, consultar SAP para todos los avisos visibles (en lotes de 200).
- Columnas nuevas/actualizadas:
  - **OT**: la de SAP (si difiere de la guardada, se marca).
  - **Inicio extremo (SAP)**: fecha IW39; en rojo si ya pasó y la OT sigue abierta.
  - **Estado OT**: abierta / cerrada (según status del sistema).
- Botón **"Actualizar desde SAP"** que vuelve a consultar y además guarda OT y fecha en los registros con campos vacíos.
- Tarjeta resumen nueva: "OT abiertas atrasadas".
- Si SAP no responde, la página muestra los datos guardados y un aviso.

## Detalles técnicos
- Reutiliza la función `sap-lookup` (clave DATABRICKS_TOKEN, tablas `hive_metastore.amsa_provisioning.dmt_sap_transacciones_iw29_mst` / `_iw39_mst`).
- `vig-ia` llama a la misma consulta Databricks (helper compartido en `supabase/functions/_shared/sap.ts`) para no duplicar lógica.
- Relleno inicial vía actualización de datos sobre `weekly_reports` (sap_order, planned_date) con condición "solo si vacío".
- OT abierta = status sin CTEC/CERR.
- Verificación: probar la herramienta en Vig-IA con el aviso 4637452 y revisar la página en el navegador.
