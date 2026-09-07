# Automoción OS / Top Gear — Project Plan (MVP)

**Client:** Juan M. M. R. (Colombia) · **Product:** D2C platform for importing vehicles into Colombia
**Stack:** Next.js (App Router) + TypeScript + Postgres · **Languages:** Español (CO) + English
**Status:** PLAN — awaiting approval. No implementation until approved.

Companion documents: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`PAGES-SPEC.md`](./PAGES-SPEC.md) · [`I18N.md`](./I18N.md)

---

## 1. Guiding principle

> **We build the machine. The client loads the numbers.**

Every tariff, rate, fee, freight cost, transit day and margin is a **database row edited in an
admin screen** — never a constant in the code. The engine knows *how* the calculation chains
together; it never knows *how much* anything costs.

We ship seeded placeholder values so the product demos on day one, clearly labelled as
placeholders. The client overwrites them with the figures their SIA gives them. Correctness
becomes something we can test — "is the chain right, given the parameters" — rather than
something anyone has to research.

---

## 2. What the client asked for

Five modules, in the client's own framing:

**1 · Motor Paramétrico de Liquidación** — the calculation core.
Divisas (TRM daily API + manual override) · Costos de origen (subastas/dealers, flete terrestre,
documentos, flete marítimo por origen, seguro) · Nacionalización (gastos portuarios, Zona Franca,
VUCE/ANLA/homologación, agenciamiento, y arancel + IVA + impoconsumo según TLC y motorización) ·
Consolidación (prorrateo de 1, 2, 3 o más vehículos por contenedor).

**2 · Catálogo y fichas técnicas, estilo Manheim** — vitrina de alto rendimiento con 21 filtros
técnicos, y un CMS híbrido: carga manual primero, sincronización automática después.

**3 · Checkout de upselling y Smart PDF** — agregados en origen (Wallbox) y servicios en destino
(PPF, GarantiPlus, matrícula, SOAT, kit de mantenimiento), y una propuesta comercial en PDF con
el desglose del landing cost y los tiempos logísticos.

**4 · Marketing y omnicanalidad** — fichas gráficas automáticas para redes sociales, y
sincronización con clasificados (TuCarro, CarroYa, Marketplace).

**5 · Experiencia de usuario y Control Tower** — "Cómo Trabajamos", mapa global interactivo,
blog con CMS, chatbot de IA 24/7, y un portal de cliente con semáforo digital para el rastreo
físico (GPS) y documental del vehículo.

### Translated into a system

Three products sharing one database:

| | What it is | User |
|---|---|---|
| **La Vitrina** | Catalog, 21 filters, vehicle detail, live simulator, checkout, marketing, blog, chatbot | Buyer |
| **El Portal del Cliente** | Orders, the dual traffic light, documents, GPS | Buyer, post-purchase |
| **El Control Tower** | Inventory CMS, **the parameter engine**, quotes, orders, consolidation, channels, users | Operator |

**The thing that wins this project:** anyone can build a car catalog. The differentiator is the
Motor de Liquidación — change the origin, the motorization, or how many cars share the
container, and the landed cost in COP recomputes live, line by line, ending in a PDF.

---

## 3. Pages — 42 routes, ~30 unique designs

| Zone | Count | Pages |
|---|---|---|
| Público / marketing | **9** | Home · Cómo Trabajamos · Mapa Global · Blog · Artículo · Nosotros · Contacto · FAQ · Legal |
| Tienda | **6** | Catálogo · Ficha del vehículo · Comparar · Simulador · Checkout · Confirmación |
| Auth | **3** | Login · Registro · Recuperar contraseña |
| Portal del cliente | **6** | Dashboard · Pedidos · **Detalle con semáforo** · Cotizaciones · Documentos · Perfil |
| Control Tower (admin) | **16** | Dashboard · Inventario · Editor de vehículo · **Parámetros** · Consolidación · Cotizaciones · Pedidos · Control tower del pedido · Clientes · Fuentes · Omnicanal · Social Studio · Blog · Editor de post · Usuarios · Ajustes |
| Sistema | **2** | 404 · 500 |
| | **42** | |

The gap between 42 routes and ~30 designs is dynamic routes reusing one design (`/blog/[slug]`,
`/legal/[slug]`) and near-identical screens sharing a layout (the three auth pages, the two
system pages).

> Every page — purpose, structure, functions, colors, responsive behavior, states — is specified
> in **[`PAGES-SPEC.md`](./PAGES-SPEC.md)**, together with the requirement traceability matrix
> (which client module each page satisfies), the four-zone color system, and the build order.

---

## 4. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15**, App Router, TypeScript | Server Components for the catalog, route handlers for the API, one deploy |
| Styling | **Tailwind v4** + **shadcn/ui** | Token-driven, fast |
| Database | **Postgres** (Neon) + **Prisma** | Date-ranged parameter rules need real relational queries |
| Auth | **Auth.js v5** | Three roles, middleware-guarded admin |
| i18n | **next-intl** | ES/EN first-class, RSC-native, ICU, localized pathnames |
| Validation | **Zod** | Shared by forms, server actions and the engine contract |
| Filter state | **nuqs** | Filters must be shareable and server-rendered |
| Tables / charts | **TanStack Table** · **Recharts** | Admin lists · cost waterfall |
| PDF | **@react-pdf/renderer** | Runs serverless; no headless Chrome |
| Social cards | **@vercel/og** (Satori) | 1080×1350 / 1080×1080 Instagram renders |
| Map | **react-simple-maps** | Origin routes |
| AI chat | **Vercel AI SDK** + Claude | Streaming + tool-calling into the engine |
| Email · Cron | **Resend** · **Vercel Cron** | Quote delivery · daily TRM sync |
| Money · Testing | **decimal.js** · **Vitest** | Never float arithmetic · engine tests |

Env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `TRM_API_URL`, `TRM_API_TOKEN`,
`RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`.

---

## 5. Architecture

Full specification in **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**. In five lines:

- **Modular monolith, vertical slices, hexagonal core.** One deploy, ten modules, each with a
  single public entry point; deep imports banned by lint.
- **One-way Dependency Rule.** `app` → `application` → `domain` ← `infra`. A domain file
  importing Next, React or Prisma **fails the build** — which is what lets the engine run
  identically on the server and in the browser.
- **The engine is an open pipeline.** ~21 independent cost stages in a registry; adding a tax is
  one file plus one entry. The engine is never edited. No stage file contains a number.
- **One registry, five behaviors.** The 21 filters are declared once and derive the Zod schema,
  URL parsers, sidebar UI, Prisma query and active chips.
- **No hardcoding, enforced in CI.** Business figures in `ParameterSet` rows · copy in
  `messages/{es,en}` · colors in `styles/tokens.css` · env in `config/env.ts` · URLs in
  `config/routes.ts` · lifecycle in a transition table.

---

## 6. Data model

`prisma/schema.draft.prisma` holds a working starting point: a complete enum set plus the
identity, geography, catalog and ingestion models. M1 completes it.

**Entity groups:** Identity · Catalog (`Brand → Model → Trim → Vehicle` + `VehicleSpec`) ·
Ingestion (`Source`, `ScrapeRun`, `RawListing` staging) · **Parameters** (`PricingParameterSet`,
`FxRate`, `FreightRate`, `TariffRule`, `DestinationCostRule`, `AddOnProduct`) · Quoting
(`Quote`, `QuoteLineItem`, `Consolidation`) · Orders (`Order`, `TrackingMilestone`,
`DocumentUpload`, `GpsPing`) · Content & CRM · translation tables per [`I18N.md`](./I18N.md).

**Two decisions worth stating:**

1. **A quote is an immutable snapshot.** We store the full calculation result, the parameter set
   and the TRM used — and never recompute a sent quote. Yesterday's PDF reproduces exactly.
2. **`TariffRule` resolution is data, not branching.** Look up by
   `(hsCode, origin, powertrain, date)`, most specific first, falling back to the general rule.
   The resolver returns the rates *and* which rule matched, so the PDF can print the basis.

---

## 7. The liquidation engine

```
ORIGEN      compra + fees + flete interno + documentos            = FOB (USD)
FLETE       + flete marítimo prorrateado + recargos + seguro      = CIF (USD)
CONVERSIÓN  × TRM(fecha) × (1 + spread)                           = CIF (COP)
TRIBUTOS    + arancel + impoconsumo + IVA        ← rates and base composition from TariffRule
DESTINO     + portuarios + Zona Franca + bodegaje + inspección
            + VUCE/ANLA/homologación + agenciamiento + transporte
SERVICIOS   + agregados en origen (USD) y en destino (COP)
COMERCIAL   + margen + fee + pasarela + 4×1000
                                                                  = LANDED COST → PRECIO FINAL
```

Every step emits a line item; that array *is* the PDF breakdown and the on-screen accordion.

**Proration** (`consolidación logística`): `EQUAL`, `BY_CIF_VALUE`, `BY_VOLUME`, `BY_WEIGHT`,
`MANUAL`. The detail that matters is **rounding residue** — splitting a container cost three ways
leaves centavos unassigned, so the algorithm floors, assigns the remainder to the last unit, and
asserts the sum is exact. Money that doesn't add up destroys trust in the whole engine.

---

## 8. The 21 catalog filters

| # | Filter | Control | # | Filter | Control |
|---|---|---|---|---|---|
| 1 | Marca | multi-select | 12 | Cilindrada (cc) | range |
| 2 | Modelo | dependent multi-select | 13 | Batería (kWh) | range |
| 3 | Versión | multi-select | 14 | Autonomía (km) | range |
| 4 | Año modelo | range | 15 | Carga DC | range |
| 5 | Motorización | chips | 16 | Transmisión | chips |
| 6 | Carrocería | icon chips | 17 | Tracción | chips |
| 7 | Precio landed (COP) | range | 18 | Puestos | stepper chips |
| 8 | País de origen | multi-select | 19 | Color exterior | swatches |
| 9 | Puerto de entrada | select | 20 | Tiempo de entrega | range |
| 10 | Potencia (HP) | range | 21 | Disponibilidad | chips |
| 11 | Torque (Nm) | range | | | |

Sidebar groups: *Vehículo* (1–4, 6, 19) · *Motorización* (5, 10–17) · *Origen y logística*
(8, 9, 20, 21) · *Precio* (7) · *Capacidad* (18). All state lives in the URL.

---

## 9. Design system

**Palette A — "Graphite Showroom" (recommended):** dark-first `#0B0D10` ground, `#2E6BFF`
primary, `#00D0C0` accent reserved for data. Reads as precision engineering rather than
discount. Alternatives: **B "Andes Premium"** (navy + gold, luxury register) and
**C "Pacífico Claro"** (light + forest, cleanest but least automotive).

**Type:** Sora display · Inter UI · tabular numerals on every figure.
`COP $ 185.400.000` in es-CO, `COP 185,400,000` in en-US — the currency never changes with the
locale, only its format.

**Shape:** radius 8 / 12 / 16 · spacing base 4px · container 1280, 12 columns · borders over
shadows on dark.

> The full token table (light + dark), the four color zones, and the per-page color assignments
> are in [`PAGES-SPEC.md`](./PAGES-SPEC.md) Part II.

---

## 10. ChatGPT design prompts

Deliverable: `docs/PROMPTS-CHATGPT.md` — **~30 prompts, one per unique screen**, produced in M0
once the palette is chosen.

Each prompt is three parts: a **master context block** identical across all 30 (token table,
typography, component vocabulary, es-CO instruction) + a **screen block** (the band-by-band
composition from `PAGES-SPEC.md`) + an **output block** (viewport, theme, what to avoid). The
identical context is what makes 30 separately-generated screens look like one product.

---

## 11. Execution plan

Nine milestones in dependency order. Within each, **admin before storefront** — the storefront
needs real data, and the admin is what creates it.

| | Milestone | Hours | Done when |
|---|---|---|---|
| **M0** | **Foundation & enforcement** — `create-next-app`; `core/` (Money with residue-safe `allocate`, Result, Clock, branded ids); `config/env.ts`, `config/routes.ts`; **i18n ES/EN setup**; design tokens; module skeletons; **boundaries lint + CI** | 20 | A deliberate violation (hex in a component, stray `process.env`, domain importing Prisma, missing EN key) **fails CI** |
| **M1** | **Data layer** — complete `schema.prisma`, Neon, migrations, translation tables, seed (8 brands, 12 vehicles, one ACTIVE parameter set with labelled placeholders) | 17 | `migrate && seed` gives a browsable bilingual database |
| **M2** | **The engine** — stage registry, proration, tariff resolver, timeline, TRM sync, full test suite | 22 | Vitest green, including residue conservation across all five methods |
| **M3** | **Admin shell + parameters** — auth, roles, DataTable, `/admin/parametros` with versioning and "Simular impacto", auth pages | 22 | Changing a rate in the admin visibly changes a quote, with history |
| **M4** | **Catalog** — filter registry, `/catalogo`, VDP, comparador, inventory admin | 24 | All 21 filters narrow real data; VDP price updates when origin changes |
| **M5** | **Simulator, quotes, Smart PDF** — `/simulador`, consolidation UI, quote snapshots, PDF, email | 21 | A quote produces a PDF that reproduces identically a week later |
| **M6** | **Checkout + orders** — add-ons, 4-step checkout, order pipeline, order control tower | 18 | A checkout produces an order visible in the admin pipeline |
| **M7** | **Client portal** — dual traffic light, milestones, documents, GPS | 16 | An admin milestone update changes the client's traffic light |
| **M8** | **Content, marketing, chatbot** — public pages, mapa global, blog CMS, AI chat with tool-calling | 22 | The chatbot answers a real cost question with a real figure |
| **M9** | **Omnichannel + launch** — social studio, channel feeds, source review queue, demo data, deploy | 16 | Deployed URL, demo data, full click-through in both locales |
| | **Total** | **198** | |

---

## 12. What we need from the client

Software-side inputs only — these unblock steps, nothing is blocked while we wait:

1. Brand assets: logo, photography, existing colors if any
2. Palette choice (A / B / C)
3. Their parameter values: freight per route, tariff rates by origin and motorization,
   destination cost lines, agenciamiento %, margin structure
4. The add-on catalog with prices
5. The 12 vehicles for the demo
6. Their milestone names for the traffic light, and their document checklist
7. Copy for "Cómo Trabajamos", "Nosotros" and the legal pages — **in both ES and EN**
8. Accounts at M9: MercadoLibre, Meta, payment gateway

---

## 13. Not in this MVP

Real scraping connectors and scheduled ingestion · full OAuth publishing to MercadoLibre and
Meta · production payment gateway with reconciliation · real GPS telematics and carrier BL
tracking · WhatsApp Business API · a third locale · mobile app.

---

## 14. Open decisions

1. **Palette** — A "Graphite Showroom" *(recommended)* / B "Andes Premium" / C "Pacífico Claro"
2. **Scope** — all nine milestones (198h), or stop after M5 (engine + catalog + simulator + PDF),
   the smallest genuinely impressive build

*Resolved:* language → **ES + EN, both first-class** ([`I18N.md`](./I18N.md)).
Throwaway scaffold → **deleted**; the repo now holds only `docs/` and `prisma/schema.draft.prisma`.
