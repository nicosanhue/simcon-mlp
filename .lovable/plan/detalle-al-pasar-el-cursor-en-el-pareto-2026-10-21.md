# Detalle al pasar el cursor en el Pareto

Al pasar el cursor sobre una barra del Pareto (sección 2 del Reporte), el recuadro mostrará cuántos diagnósticos de esa categorización corresponden a cada tipo específico de falla.

## Desglose por categorización

| Categorización | Tipos que se mostrarán |
|---|---|
| Rodamiento | BPFI (pista interna), BPFO (pista externa), Jaula (FTF), Elemento rodante (BSF), Rodamiento sin especificar |
| Soltura | Pernos / anclaje, Pata coja, Holgura mecánica, Soltura sin especificar |
| Lubricación | Grasa, Aceite, Falta / deficiencia de lubricación, Sin especificar |
| Desalineamiento | Angular, Paralelo, Sin especificar |
| Desbalanceo | Sin desglose (solo total) |
| Estructural / Rigidez | Debilidad estructural, Movilidad / rigidez |
| Vibración transmitida | Desde motor, Desde reductor, Desde otra fuente |
| Desgaste interno / Roce | Desgaste, Roce, Desajuste, Componentes internos |
| Engranajes | GMF / engrane, Dientes, Sin especificar |
| Correas | Correa, Polea |
| Proceso / Operación | Impacto, Cavitación, Ciclo de compresión, Peristáltica |
| Otra | Sin desglose |

- Un diagnóstico puede contar en más de un tipo si el texto menciona varios (por ejemplo BPFI y BPFO).
- Se muestra cantidad y porcentaje dentro de la categorización, ordenado de mayor a menor; los tipos sin casos no aparecen.
- Respeta los filtros de Área y Técnica. El clic en la barra sigue abriendo el detalle por componente.
- El PDF no cambia.

## Detalles técnicos
- `src/lib/monthlyReport.ts`: nueva tabla `SUBTYPES` (palabras clave normalizadas por modo) y función pura `subtypeBreakdown(diags, mode)`, con "sin especificar" cuando no coincide ningún subtipo.
- `src/test/monthlyReport.test.ts`: pruebas (texto con "BPFI" cuenta en BPFI; "rodamiento" sin subtipo cae en "Sin especificar"; texto con BPFI y BPFO cuenta en ambos).
- `ParetoSection.tsx`: tooltip personalizado en el gráfico Pareto que usa el desglose del mes filtrado.
