# Fecha de creación del aviso (IW29) en Vig-IA

Hoy SIMCON lee de IW29 solo: aviso, orden, estado y descripción. La fecha de creación no se consulta todavía.

## Pasos

1. **Revisar IW29 en detalle**: listar todas sus columnas en Databricks e identificar la de fecha de creación del aviso (p. ej. "fecha_de_aviso", "creado_el" o similar). Confirmarla con el aviso 4637452 y algunos más, y revisar que el formato sea fecha válida. Si hay varias candidatas (fecha aviso / creado el / fecha inicio deseado), uso "creado el" y te lo informo.
2. **Agregarla a la búsqueda SAP**: cada aviso devuelve también "fecha de creación".
3. **Vig-IA**: la herramienta de SAP entrega la fecha; las instrucciones le indican usarla para responder "¿cuándo se creó el aviso?", calcular antigüedad (días desde creación) y días entre creación e inicio extremo de la OT.
4. **Probar**: preguntar a Vig-IA por el aviso 4637452 y verificar la fecha contra IW29. Borrar la conversación de prueba.

No cambia otras pantallas ni datos guardados.

## Detalle técnico
- Consulta temporal `DESCRIBE` de la tabla IW29 vía la función `sap-lookup` (solo lectura) para ver columnas.
- `_shared/sap.ts`: añadir la columna al SELECT de IW29 y el campo `fecha_creacion_aviso` en `SapAvisoInfo`.
- `vig-ia/index.ts`: actualizar descripción de `consultar_sap` y system prompt; redeploy de `vig-ia` y `sap-lookup`.
