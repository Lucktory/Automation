# Plan de ejecución — M1 → M9

Cómo se construye el resto del producto. Un ciclo fijo por etapa, sin excepciones.

---

## 1. El ciclo de cada etapa

Ninguna etapa empieza mientras la anterior tenga un check en rojo o un defecto conocido.

```
  ┌─ 1. CONSTRUIR ──── el código de la etapa
  │
  ├─ 2. VERIFICAR ──── npm run verify   (typecheck → lint → i18n parity → tests)
  │                    npx next build   (compila y prerenderiza ambos locales)
  │                    + el check propio de la etapa (abajo)
  │
  ├─ 3. RE-EXAMINAR ── releer lo construido contra su especificación:
  │                    ¿coincide con PAGES-SPEC / el diseño aprobado?
  │                    ¿viola alguna regla de ARCHITECTURE?
  │                    ¿aplica las correcciones de SEED-DATA?
  │                    ¿RESPONDE A 390px? (ver la regla de abajo)
  │
  ├─ 4. CORREGIR ───── arreglar lo encontrado y re-ejecutar 2
  │
  ├─ 5. REPORTAR ───── qué se entregó, qué dijeron los checks, qué decidí yo
  │
  └─ 6. SIGUIENTE ──── solo entonces
```

### La regla de los 390px

Ninguna pantalla se da por terminada sin comprobarla a **390px** además de a 1440px. No es
un adorno: se construyó la primera versión del back-office con una barra lateral de 240px
fijos, que en un teléfono dejaba 150px para una tabla de nueve columnas — no una versión
reducida, una pantalla rota.

Lo mínimo por pantalla:

- **Nada de anchos fijos sin escape.** Un `w-60` necesita su `lg:` o su equivalente en cajón.
- **Lo que se retira primero es el contexto, nunca el dato.** En la insignia de TRM
  desaparecen la fecha y la fuente; la cifra no se toca.
- **La identidad no se pierde.** Si un panel de marca se oculta en móvil, el logo reaparece
  en otro sitio: una pantalla de acceso sin identificar el sitio pide credenciales sin decir
  a quién.
- **Las tablas anchas se desplazan dentro de su contenedor**, y el `body` nunca se desplaza
  en horizontal.
- **Los cajones se cierran al navegar**, y `Escape` los cierra.
- Padding reducido en móvil (`p-4 sm:p-6`), no el mismo del escritorio.

`/admin/parametros` sigue siendo una herramienta de operador y no se optimiza para teléfono,
pero *degradar* y *romperse* no son lo mismo.

---

**Revisión adversarial adicional** en las tres etapas donde un error cuesta dinero real —
**M2 (motor)**, **M3 (parámetros)** y **M5 (cotizaciones y PDF)**: además del ciclo, un panel
de agentes revisa el resultado con la instrucción de *refutarlo*, y cada hallazgo se verifica
antes de aplicarse. Es el mismo método que corrigió 9 de 9 cifras en la investigación.

---

## 2. Orden de las etapas

Reordenado respecto al plan original por una razón: **si se acaba el tiempo, que lo terminado
sea la parte que gana el proyecto.** M5 se adelanta sobre M4.

| # | Etapa | Entrega | Check propio de la etapa |
|---|---|---|---|
| **M1** | Datos | `schema.prisma` completo con las 3 correcciones · migración · seed con las cifras verificadas | `db:migrate && db:seed` corre limpio; el seed carga solo filas de alta confianza |
| **M2** | **Motor** | `CostStage` registry · resolver de `TariffRule` · prorrateo · timeline · TRM | Tests verdes incl. conservación de residuo; `resolve()` nunca devuelve default silencioso; un test prueba que el dominio no importa framework |
| **M3** | Admin + parámetros | Auth, roles, shell admin, **`/admin/parametros`** según tu diseño · Simular impacto | Cambiar una tarifa en el admin cambia visiblemente una cotización, con historial de versión |
| **M5** | **Simulador + PDF** | `/simulador` · consolidación · snapshot de cotización · Smart PDF · correo | Una cotización produce un PDF que se reproduce idéntico una semana después |
| **M4** | Catálogo | Registro de 21 filtros · `/catalogo` · ficha · comparar · admin de inventario | Los 21 filtros filtran datos reales; el precio de la ficha cambia al cambiar origen |
| **M6** | Checkout + pedidos | Agregados · checkout 4 pasos · pipeline de pedidos · control tower | Un checkout produce un pedido visible en el pipeline |
| **M7** | Portal | Semáforo doble · hitos · documentos · GPS | Un hito actualizado por el admin cambia el semáforo del cliente |
| **M8** | Contenido | Home · Cómo trabajamos · mapa · blog CMS · chatbot con tool-calling | El chatbot responde una pregunta de costo con una cifra real del motor |
| **M9** | Omnicanal + lanzamiento | Social studio · feeds de canal · cola de revisión · datos demo · deploy | URL desplegada, recorrido completo en ambos idiomas |

**Después de M5 el producto ya es demostrable de punta a punta.** Ese es el punto de corte
seguro si el plazo aprieta.

---

## 3. Qué decido yo y qué te pregunto

**Decido y reporto** (no te detengo): estructura de archivos, nombres, librerías menores,
detalles de UI no especificados, orden interno dentro de una etapa.

**Te pregunto antes de seguir**, porque cambian el producto:

1. **`importadorEsConsumidorFinal`** — decide si el impoconsumo se causa en la nacionalización
   o en la venta, y mueve la base gravable. Lo implemento como parámetro configurable con el
   valor **por defecto en el lado caro y seguro**, y te lo señalo. Es la decisión de modelo de
   negocio más costosa del sistema.
2. **Híbridos** — bloqueado hasta que la SIA responda Q1/Q2 de `SEED-DATA.md` §9. Mientras
   tanto las reglas de híbrido se siembran como `NO_COTIZABLE`, no como una cifra inventada.
3. **Pasarela de pago** — Wompi vs PayU vs Mercado Pago, cuando lleguemos a M6.

---

## 4. La regla que gobierna todo el motor

> **Fallar hacia arriba, nunca hacia abajo.**

Sobrecotizar pierde un negocio; subcotizar destruye la empresa. Ante un dato ausente, vencido o
ambiguo, el motor toma el lado caro y lo marca — nunca el barato en silencio. En concreto:

- `resolve()` devuelve `VALOR` · `VALOR_CON_ADVERTENCIA` · `NO_COTIZABLE`, jamás un cero por defecto
- sin `TariffRule` para (subpartida × origen × motorización × fecha) → `TariffRuleNotFound`
- un `catch` genérico que devuelva cero queda **prohibido por lint**
- una `Quote` no pasa a `SENT` sin decisión humana explícita en cada switch determinante

---

## 5. Lo único que puede bloquear

`DATABASE_URL`. El esquema y el seed son código y se escriben sin base de datos; solo la
migración necesita conexión. Si al llegar a ese punto no está lista, sigo con M2 (el motor es
puro y no toca base de datos) y ejecuto la migración cuando llegue la cadena de conexión.

---

## 6. Cómo te reporto

Al cerrar cada etapa, un mensaje corto: qué se entregó, la salida de los checks, qué decidí, y
qué sigue. Sin narración durante la etapa.
