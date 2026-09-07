# Datos verificados para sembrar el motor

**Corte: 5 de septiembre de 2026.** Producto de 15 agentes de investigación con verificación
adversarial. **9 de 9 hechos sometidos a refutación fueron corregidos** — ninguna de las cifras
"de sentido común" sobrevivió intacta. El detalle completo está en `.research/`.

Este documento es la fuente para el seed de M1. Nada se siembra que no esté aquí.

---

## 1. Lo que la investigación cambió en el diseño

Cinco correcciones que afectan código, no solo datos.

### 1.1 El impoconsumo NO comparte base con el IVA

Es el error que rompe la mayoría de las calculadoras, y estaba escrito en nuestros propios
archivos hasta hoy. Son bases distintas, gobernadas por artículos distintos, calculadas **en
paralelo**:

```
BASE_ARANCEL = valor en aduana (CIF)                    Dto 1165/2019 art. 16
BASE_IVA     = valor en aduana + arancel                ET art. 459
BASE_INC     = valor total del bien, SIN incluir IVA    ET art. 512-3 par. 3
```

**Ningún tributo entra en la base de otro, salvo el arancel, que entra en las dos.**
Guarda de código: ninguna expresión de base de INC puede contener un término de IVA, y ninguna
base de IVA puede contener un término de INC.

*Corregido ya en `src/messages/{es,en}/pricing.json` y en `docs/PROMPTS-CHATGPT.md`.*

### 1.2 El switch más caro del modelo de negocio: quién es el importador

*ET art. 512-1 num. 2*: el impoconsumo se causa en la importación **solo cuando el importador es
el consumidor final**.

| Escenario | Cuándo se causa | Base |
|---|---|---|
| El cliente final importa (la plataforma actúa como mandataria) | En la nacionalización | Costo de nacionalización |
| La plataforma importa y luego vende | En la **venta** | **Precio de venta sin IVA** — incluye el margen |

El segundo caso tiene una base sustancialmente mayor. El motor necesita un campo
`importadorEsConsumidorFinal`, y el modelo D2C debe decidir cuál de los dos es.

### 1.3 La TRM de los tributos no es la de hoy

*Decreto 1165 de 2019, art. 15*: la conversión usa la TRM del **último día hábil de la semana
anterior** a la presentación y aceptación de la declaración — no la del día.

El motor necesita dos TRM distintas: la **comercial** (hoy, para mostrar) y la **fiscal**
(congelada por semana, para liquidar). Mostrarlas como una sola es un error de diseño.

### 1.4 El prorrateo por volumen es ilegal para la base gravable

*Resolución 1684 de 2014 CAN, arts. 20 y 31 num. 4*: el reparto debe apoyarse en datos objetivos
y cuantificables con documento soporte. El volumen ocupado no consta ni en el B/L ni en la
factura.

Nuestro `AllocationMethod` debe partirse en dos:
- `repartoComercial` — libre, admite `BY_VOLUME` / `BY_CBM` (es una decisión de negocio)
- `prorrateoBaseGravable` — restringido a `BY_FOB_VALUE` | `BY_WEIGHT`

### 1.5 Ninguna pasarela colombiana puede cobrar el vehículo completo

PSE tiene tope de COP 2.400.000 por defecto (ampliable a ~30M/día según banco); Bre-B tope
COP 11.552.000. Un vehículo de COP 185.000.000 no pasa por ahí.

**Consecuencia:** la comisión de pasarela se modela **solo sobre el anticipo**, nunca sobre el
precio final. Cobrarla sobre el total infla el landed cost con un costo que no existe.

---

## 2. Aranceles — `TariffRule` (alta confianza)

> **El campo HS exige 10 dígitos exactos.** Nunca resolver por "8703". Las subpartidas hermanas
> llevan su propia fila explícita.

| Clave | Tarifa | Fundamento | Vigencia |
|---|---|---|---|
| 13 subpartidas de combustión de 87.03 (8703210090, 8703221090, 8703229090, 8703231090, 8703239090, 8703241090, 8703249090, 8703311000, 8703319000, 8703321000, 8703329000, 8703331000, 8703339000) / origen **sin acuerdo** (CN, JP, AE, IN) | **40 %** | Dto 1432 de 2025 art. 1 (D.O. 53.347) | desde 2026-01-10 |
| 8711.10/.20/.30/.40/.50 / NMF | 35 % | Dto 1432 de 2025 art. 2 | desde 2026-01-10 |
| 8703.* / **EE.UU.** con certificado de origen + expedición directa | **0 %** | TLC Colombia–EE.UU. | desde 2022 |
| 8703.* / **Canadá** con certificado | **0 %** | TLC Colombia–Canadá | desde 2020 |
| 8703.* / **Unión Europea** con certificado | **0 %** | Acuerdo UE–Colombia | desde 2021 |
| 8703.80 (BEV) / cualquier origen | **0 %** | Régimen de vehículos eléctricos | revisar a 90 días |
| 87.04 y 87.02 | **no sembrar desde el Dto 1432** — conservan tarifa previa | por omisión del decreto | — |

**Tres cifras que circulan en internet y hoy son falsas:**

| Lo que se repite | Verificado (sep-2026) |
|---|---|
| "Arancel de vehículos: 35 %" | **40 %** para 13 subpartidas de combustión desde ene-2026 |
| "Híbridos: 5 % de arancel" | **35 %** — el cupo murió con el Dto 1550 de 2024 |
| "Híbridos 20 % / enchufables 15 %" | **nunca se expidió**; salió de un borrador no adoptado |

México (ACE 33) y Corea quedan en confianza **media** — verificar antes de cotizar.

---

## 3. Tributos — bases y tarifas

| Concepto | Valor | Fundamento |
|---|---|---|
| IVA general | 19 % | ET art. 468 |
| IVA BEV / HEV / PHEV | **5 %** | ET art. 468-1 (vigilar Proyecto de Ley 004 de 2026) |
| Tarifa INC | **8 %** si FOB < USD 30.000 · **16 %** si FOB ≥ USD 30.000. Umbral **nominal, no indexado a UVT** | ET arts. 512-3 y 512-4 |
| INC — BEV no blindado de 87.02/03/04 | **NO CAUSADO** | ET art. 512-5 num. 8 |
| INC — otras exclusiones | taxis, transporte público, ambulancias, personas con discapacidad, diplomático | ET art. 512-5 |
| INC — usados +4 años | no causado | ET art. 512-3 par. 5 |

---

## 4. Divisas — `FxRate`

| Concepto | Valor | Fuente |
|---|---|---|
| TRM COP/USD | **3.126,08** (vig. 2026-09-05 → 09-08) *verificado en vivo* | `datos.gov.co/resource/32sa-8pi3.json` |
| Resolución | por rango: `vigenciadesde <= fecha AND vigenciahasta >= fecha` | ídem |
| Publicación | ~18:05 COT para el día siguiente · Colombia UTC-5 fijo → **cron 19:00 COT** | ídem |
| TRM fiscal | último día hábil de la **semana anterior** a la aceptación | Dto 1165/2019 art. 15 |
| AED/USD | 3,6725 (peg fijo; el feed del BCE **no** trae AED) | Banco Central de EAU |
| Festivos Colombia | **19** desde 2026 (Ley 2578 añadió el 13-jul) | Ley 2578 de 2026 |

**La TRM es lo único con API oficial y gratuita. Es lo único que se automatiza.**

---

## 5. Costos de destino — `DestinationCostRule`

**CONTECAR (Cartagena) — tarifario regulado, vig. 11-may-2026**

| Concepto | Tarifa |
|---|---|
| UIP a la carga, vehículo suelto/RoRo < 20 m³ | USD 85 / unidad |
| UIP contenedor lleno 20' / 40' | USD 152 / USD 208 **por contenedor** (÷ vehículos) |
| Almacenaje < 20 m³ | USD 7,75 / veh / día, plano |
| Días libres | no están en el tarifario → parámetro con `fuente = regulatorio_inferido` |

**SPRBUN (Buenaventura) — tarifario, vig. 05-ene-2026**

| Bracket | 1-3 días | 4-5 | 6-10 | 11+ |
|---|---|---|---|---|
| ≤ 19,9 m³ | libre | USD 6,00 | USD 8,00 | USD 16,75 |
| 20-40 m³ | libre | USD 10,25 | USD 12,00 | USD 25,75 |

UIP a la carga ≤ 19,9 m³: **USD 75,00 / vehículo**.

**Matrícula, SOAT e impuestos 2026**

| Concepto | Valor |
|---|---|
| SOAT — fórmula | `TOTAL = prima × 1,52 + COP 2.400` (Circular 022 de 2025 SFC) |
| SOAT auto familiar 1500-2500cc, 0-9 años | COP 544.700 |
| SOAT campero/camioneta 1500-2500cc | COP 946.600 |
| Matrícula Bogotá 2026 | COP 708.400 + RUNT COP 22.300 *(otros organismos varían 20-40 %)* |
| Impuesto vehicular anual | 1,5 % / 2,5 % / 3,5 % por tramo, sobre avalúo oficial |
| SMMLV 2026 | COP 1.750.905 · **UVT 2026** COP 52.374 |

---

## 6. Contenedor y consolidación

| Concepto | Valor |
|---|---|
| 40'HC interior | 12.032 × 2.350 × 2.698 mm · puerta 2.340 × 2.585 mm |
| Carga útil 40'HC | ~26.300–26.600 kg tras tara |
| Capacidad | pickup full-size **2** (tope duro) · SUV grande **3** · sedán/hatch **4** con racking |
| Prorrateo de base gravable | **solo FOB o peso**. Volumen/CBM prohibido (Res. 1684 CAN) |
| Wompi | 2,65 % + COP 700 + IVA |

---

## 7. Referencias de mercado — NO sembrar como tarifa

Van a una tabla `MarketReference` que **dispara revisión**, nunca a `FreightRate`:

- **Asia → Costa Oeste Sudamérica:** USD 2.500/FEU (abr-2026) → USD 6.200 (ago) → cotizaciones de
  septiembre en **USD 8.190–10.010 / 40GP**. ×2,5 en cinco meses.
- **Buenaventura opera degradado** desde el sismo M7,4 del 10-ago-2026 (~5 días de retraso, patio
  crítico). **Cartagena: 0 días.** Esto *invierte* hoy la lógica habitual de "Pacífico para Asia".
- **Canal de Panamá:** calado Neopanamax 47,5 pies desde el 3-sep-2026, 32 tránsitos/día.

---

## 8. El riesgo más alto, y cómo lo mitiga el producto

> **El riesgo no es equivocarse. Es equivocarse hacia abajo, con cara de certeza.**
> Sobrecotizar pierde un negocio. Subcotizar destruye la empresa.

El motor está estructuralmente sesgado a subcotizar, porque los seis switches determinantes
tienen un lado barato que es también el lado por defecto de cualquier implementación descuidada:

| Switch | Lado barato (peligroso) | Lado caro (seguro) | Delta |
|---|---|---|---|
| Certificado de origen | asumir preferencia → 0 % | sin certificado → 40 % | **40 pts de CIF** |
| Clasificación a 10 dígitos | declarar híbrido | 13 líneas de combustión | hasta **35-40 pts** |
| `importadorEsConsumidorFinal` | asumir revendedor → INC 0 | consumidor final → 8-16 % | **8-16 pts** |
| Perímetro de gastos en base INC | mínimo | conservador DIAN | 1-3 pts |
| Días en puerto | 3-5 | 15-20 reales | USD 100-200/veh |
| Antigüedad del flete | tarifa sembrada | recotización | **×2,5 en 5 meses** |

**Mitigación en el producto, no en la documentación:**

1. **`resolve()` nunca devuelve un default silencioso.** Devuelve `VALOR`,
   `VALOR_CON_ADVERTENCIA` o `NO_COTIZABLE`. Si no hay `TariffRule` para
   (subpartida × origen × motorización × fecha), lanza `TariffRuleNotFound` — **no asume 0 %**.
   Un `catch` genérico que devuelva cero es el bug más caro posible: prohibido por lint.
2. **Gate de completitud:** `Quote` no pasa a `SENT` sin decisión humana explícita en cada switch
   determinante (`QuoteReadiness`: valor elegido · fue decisión explícita · evidencia).
3. **Banda con techo** en vez de cifra única mientras haya un switch sin cerrar.
4. **Frescura visible** por familia de dato, con recotización forzada del flete.

---

## 9. Preguntas para la SIA — Bloque A (bloqueantes)

Listas para copiar y enviar. Q1 y Q2 bloquean cualquier cotización de híbrido.

1. **Arancel de híbridos** — tarifa vigente para 8703.40/.50/.60/.70 de origen sin acuerdo.
   Tenemos dos versiones contradictorias (Dto 1550 de 2024 devolvió al 35 % NMF, vs. régimen
   preferencial vigente). ¿Cuál liquidan efectivamente en 2026 y sobre qué norma?
2. **Contingente para eléctricos e híbridos** — ¿está vigente el Dto 0595 de 2026 (RTE-E) y el
   arancel del 5 % para 20.000 unidades/año? ¿Queda cupo? ¿Sigue el 0 % para 8703.80?
3. **TRM aplicable** — confirmar art. 15 Dto 1165/2019 (semana anterior). ¿Cómo determinan
   "último día hábil" con festivo? ¿Se congela en presentación, aceptación o pago?
4. **Perímetro de "gastos" en la base del INC** — ¿entran agenciamiento, almacenaje, manejo
   portuario, inspección, transporte interno? ¿Han tenido requerimientos DIAN en 2025-2026?
5. **Causación del INC según el rol del importador** — confirmar que un revendedor no causa INC
   en nacionalización. ¿Cómo se acredita ante la DIAN?
6. **CEPD ante la ANLA** — ¿tiene costo en 2026 (ref. Res. 001153 de abr-2026)? ¿Plazo real?
   ¿Puede un importador independiente ampararse en el CEPD del fabricante?
7. **Agenciamiento aduanero** — su tarifa real: % sobre CIF, mínimo, y si aplica por declaración
   o por vehículo. ¿Qué se factura aparte?
8. **Régimen de importación** — confirmar que solo son viables vehículos nuevos de año modelo
   igual o posterior al de radicación, y que un modelo 2025 radicado en 2026 es SALDO con
   licencia previa (Dto 925 de 2013 art. 15 par. 1).

---

## 10. Orden de trabajo

1. Corregir el schema **antes** de escribir `TariffRule`: bases separadas de IVA e INC, `BY_CBM`
   fuera de la base gravable, `legalBasis` obligatorio no nulo.
2. Enviar el Bloque A hoy.
3. Sembrar **solo** las filas de alta confianza de este documento.
4. Implementar el gate de completitud y la banda con techo **antes de la primera demo**.
5. Hacer la demo con un **BEV o un vehículo de combustión chino** — sus tres líneas de tributo
   están verificadas de punta a punta.
6. Automatizar **únicamente la TRM**. Todo lo demás es asistido o manual.
