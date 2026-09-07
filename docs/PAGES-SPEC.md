# Automoción OS — Page Specification

Companion to `PROJECT-PLAN.md` and `ARCHITECTURE.md`. It answers three questions for every
screen: **why does this page exist (which client requirement), what is on it, and what colors
does it use.**

**42 routes · ~30 unique designs · 4 color zones.**

---

## Part I — Traceability: which pages exist and why

Every page traces to something the client asked for. Nothing here is invented scope.

| Client's requirement | Pages that deliver it |
|---|---|
| **1. Motor Paramétrico de Liquidación** | `/simulador`, `/admin/parametros`, `/admin/consolidacion`, the cost widget on `/catalogo/[slug]`, the order summary on `/checkout` |
| ↳ Módulo de Divisas (TRM API + selector manual) | `/admin/parametros` → tab *Divisas*, plus the global `TrmBadge` on every pricing surface |
| ↳ Bloque Costos de Origen (CIF) | `/admin/parametros` → tabs *Fletes* y *Origen*; `/admin/inventario/[id]` → tab *Costos de origen* |
| ↳ Bloque Nacionalización + tributos | `/admin/parametros` → tabs *Aranceles* y *Destino* |
| ↳ Consolidación / prorrateo 1..N vehículos | `/admin/consolidacion`; consolidation panel inside `/simulador` |
| **2. Catálogo y fichas técnicas (estilo Manheim)** | `/catalogo`, `/catalogo/[slug]`, `/comparar` |
| ↳ CMS híbrido (carga manual + sync automática) | `/admin/inventario`, `/admin/inventario/[id]`, `/admin/fuentes` |
| **3. Checkout de upselling + Smart PDF** | `/checkout`, `/checkout/confirmacion/[orderId]`, `/admin/cotizaciones`, `/portal/cotizaciones` |
| **4. Automatización de marketing y omnicanalidad** | `/admin/social` (fichas para Instagram), `/admin/omnicanal` (TuCarro / CarroYa / Marketplace) |
| **5. UX y Control Tower** | |
| ↳ "Cómo Trabajamos" | `/como-trabajamos` |
| ↳ Mapa Global Interactivo | `/mapa-global` |
| ↳ Blog de noticias (CMS) | `/blog`, `/blog/[slug]`, `/admin/blog`, `/admin/blog/[id]` |
| ↳ Chatbot IA 24/7 | Global widget (not a page) — present on every public and portal screen |
| ↳ Portal de Cliente + semáforo GPS/documental | `/portal`, `/portal/pedidos`, `/portal/pedidos/[id]`, `/portal/documentos`, `/portal/cotizaciones`, `/portal/perfil` |
| ↳ Control Tower (operación) | `/admin`, `/admin/pedidos`, `/admin/pedidos/[id]`, `/admin/clientes` |
| **Support (implied, not optional)** | `/login`, `/registro`, `/recuperar`, `/nosotros`, `/contacto`, `/faq`, `/legal/[slug]`, `/admin/usuarios`, `/admin/ajustes`, 404, 500 |

**Pages deliberately NOT built:** wishlist, financing simulator, dealer portal, multi-language,
reviews/ratings, live inventory auction. None were requested; each is Phase 2 if wanted.

---

## Part II — The color system

### The token vocabulary (palette A — "Graphite Showroom", recommended)

| Token | Dark | Light | Meaning |
|---|---|---|---|
| `--bg` | `#0B0D10` | `#FFFFFF` | page ground, gutters |
| `--surface` | `#12151A` | `#F7F8FA` | cards, panels, sidebars |
| `--surface-elevated` | `#1A1F26` | `#FFFFFF` | modals, dropdowns, hovered rows, sticky bars |
| `--border` | `#232A33` | `#E3E7EC` | default separators |
| `--border-strong` | `#333D49` | `#C6CDD6` | active/focused edges |
| `--text-primary` | `#F2F5F8` | `#0B0D10` | headings, values |
| `--text-secondary` | `#A3AEBB` | `#4A5561` | body, labels |
| `--text-muted` | `#6B7684` | `#7A8695` | captions, disabled |
| `--primary` | `#2E6BFF` | `#1B4FE0` | primary action, links, active filter |
| `--primary-hover` | `#1E56E6` | `#1642C4` | hover |
| `--primary-fg` | `#FFFFFF` | `#FFFFFF` | text on primary |
| `--accent` | `#00D0C0` | `#00A99B` | **data emphasis only** |
| `--success` | `#17B26A` | ← same | semáforo verde |
| `--warning` | `#F79009` | ← same | semáforo ámbar |
| `--danger` | `#F04438` | ← same | semáforo rojo |
| `--info` | `#2E90FA` | ← same | informational |
| `--neutral-status` | `#6B7684` | ← same | semáforo pendiente |

### Five rules that govern every page

1. **Elevation is the only decoration.** `--bg` → `--surface` → `--surface-elevated`. Depth is
   communicated by surface level and `--border`, not by shadow. (Light theme gets one soft shadow.)
2. **One `--primary` action per band.** If two buttons compete, the secondary becomes a ghost
   button (`--border-strong` outline, `--text-primary` label).
3. **`--accent` is never a button.** Teal marks *data*: the landed-cost figure, the highlighted
   bar in a waterfall, the "en vivo" recalculation pulse. Making it clickable destroys the signal.
4. **Semantic colors carry meaning only.** `--success/--warning/--danger` never decorate. If a
   thing is green it is *because* it is complete.
5. **The denser the screen, the less chroma.** Admin tables are near-monochrome so a single
   amber pill is impossible to miss.

### The four color zones

| Zone | Ground | Character | Chroma budget |
|---|---|---|---|
| **A · Marketing** (`/`, `/como-trabajamos`, `/mapa-global`, `/blog*`, `/nosotros`, `/contacto`, `/faq`, `/legal`) | `--bg` dark, full-bleed photography | Cinematic. Large type, generous space, imagery does the work. | High-impact but narrow: `--primary` for CTAs, `--accent` for one emphasized figure per section |
| **B · Tienda** (`/catalogo`, `/catalogo/[slug]`, `/comparar`, `/simulador`, `/checkout*`) | `--bg` with `--surface` cards | Dense but breathable. Content sits on surfaces. | `--primary` drives all actions; `--accent` reserved exclusively for the landed-cost figure |
| **C · Portal** (`/portal*`) | `--surface` dominant, `--bg` as gutter only | Calm, reassuring, status-forward. | Deliberately low — so the semáforo is the loudest thing on the screen |
| **D · Admin** (`/admin*`) | `--bg` with `--surface` panels, tighter spacing | Maximum density, control-room feel. | Minimum: near-monochrome tables; color only where it means something (status, validity, delta) |
| **E · Sistema** (`/login`, `/registro`, `/recuperar`, 404, 500) | `--bg`, centered `--surface` card | Focused, single-purpose. | One `--primary` action, nothing else |

### Global shell

- **Public header** — `--bg/80` with backdrop blur, `--border` bottom. Logo, nav in
  `--text-secondary` (active item `--text-primary` with a 2px `--primary` underline),
  **`ES | EN` switcher** (segmented control, `--surface` track, selected segment
  `--surface-elevated` + `--text-primary` — never a flag icon), `[Simular importación]` in
  `--primary`, account icon.
- **Public footer** — `--surface`, 4 columns, `--text-muted` links, legal row above a
  `--border` top rule.
- **Admin shell** — 240px `--surface` sidebar, `--border` right edge, active item
  `--surface-elevated` + `--primary` left bar; topbar with breadcrumb, search, `TrmBadge`, user.
- **Portal shell** — horizontal tab nav on `--surface`, active tab `--primary` underline.
- **Chat widget** — bottom-right FAB in `--primary`; panel `--surface-elevated`, agent bubbles
  `--surface`, user bubbles `--primary`.

### Global states (every page inherits)

- **Loading:** skeletons in `--surface` with a subtle `--surface-elevated` shimmer. Never spinners
  for content — only for actions in progress.
- **Empty:** centered icon in `--text-muted`, one-line explanation, one `--primary` action.
- **Error:** `--danger` left border on a `--surface` card, plain-language message, retry action.
- **Focus:** 2px `--primary` ring, 2px offset. Never removed.
- **Bilingual (ES/EN):** every layout below is designed against the **Spanish** string, which
  runs 15–25% longer than English — so English can only get shorter, never break a layout.
  No fixed-width buttons (padding, not width), table headers wrap rather than truncate, and no
  text is ever baked into an image. The `ES | EN` switcher appears in the public header and in
  the portal and admin topbars, and preserves the route, its search params and scroll position.
  Full spec: [`I18N.md`](./I18N.md).

---

## Part III — Page-by-page specification

### ZONE A · MARKETING

---

#### 1. `/` — Home
**Requirement:** Módulo 5 (UX) · entry point for the whole funnel
**User:** first-time visitor · **Goal:** get them to a simulation in under 30 seconds

**Structure (bands, top to bottom):**
1. **Sticky header** — global shell
2. **Hero** — full-bleed vehicle photograph, dark gradient scrim left→right. Grid 12:
   headline + subhead + trust line in cols 1–6; **quick-quote card** in cols 8–12 on
   `--surface-elevated` (origen select · tipo de vehículo · precio aproximado USD →
   `[Ver costo en Colombia]`)
3. **Trust strip** — thin `--surface` band, 4 metrics with `--accent` figures and
   `--text-muted` labels
4. **Vitrina destacada** — "Disponibles ahora", 3-up `VehicleCard` row + `[Ver todo el catálogo]` ghost
5. **Cómo funciona** — 4 numbered steps, connected by a hairline `--border` rule
6. **Mapa de orígenes** — map in cols 1–7, copy + origin chips in cols 8–12
7. **Desglose transparente** — a real sample `CostWaterfall`, headline "Sabes exactamente por
   qué cuesta lo que cuesta"
8. **Blog teaser** — 3 `BlogCard`
9. **CTA band** — `--surface-elevated`, single `--primary` action
10. **Footer**

**Functions:** quick-quote → prefills `/simulador`; featured vehicles from `Vehicle.featured`;
lazy map; JSON-LD Organization; chat widget.

**Color:** `--bg` ground throughout. Hero scrim `--bg` at 90%→0%. Bands alternate `--bg` /
`--surface` for rhythm — never more than two `--surface` bands adjacent. Quick-quote card is the
only `--surface-elevated` above the fold, which is what makes it the visual target. The waterfall
uses `--text-muted` bars with the final total bar in `--accent`. Exactly two `--primary` buttons
on the entire page (hero, CTA band).

**Responsive:** hero stacks, quick-quote becomes a bottom sheet triggered by a sticky
`[Simular]` bar; carousels become swipe rows; map to static image + chips.

---

#### 2. `/como-trabajamos` — Cómo Trabajamos
**Requirement:** Módulo 5, named explicitly by the client
**User:** evaluating buyer · **Goal:** remove fear of a complex, opaque process

**Structure:**
1. Page header — H1 + one-paragraph lede on `--bg`
2. **Timeline vertical** — 6 phases (Selección · Compra en origen · Flete internacional ·
   Nacionalización · Alistamiento · Entrega con placas). Each: numbered node on a `--border`
   spine, title, description, `--text-muted` day estimate, expandable detail
3. **Qué necesitamos de ti** — document checklist card grid
4. **Costos incluidos / no incluidos** — two-column comparison on `--surface`
5. FAQ accordion (top 6, links to `/faq`)
6. CTA band + footer

**Functions:** phases and day counts read from `TimelineTemplate` parameters (not hardcoded);
expandable detail; deep-linkable phase anchors.

**Color:** timeline spine `--border`; completed-style nodes `--primary` filled, upcoming
`--surface-elevated` with `--border-strong` ring. Day badges `--text-muted` on `--surface`.
Included column uses `--success` check icons; excluded uses `--text-muted` dashes — *not*
`--danger`, because excluded is not an error.

**Responsive:** timeline stays vertical (already mobile-native), detail collapses.

---

#### 3. `/mapa-global` — Mapa Global Interactivo
**Requirement:** Módulo 5, named explicitly
**User:** buyer comparing origins · **Goal:** make "where from" a decision, not a mystery

**Structure:**
1. Page header
2. **Map canvas** — full-width, `--surface` ocean, `--border-strong` landmasses, origin markers
   as `--primary` dots, destination (Buenaventura / Cartagena) as an `--accent` dot. Animated
   great-circle route on hover/select.
3. **Origin detail panel** — slides in right on selection: flag, country, transit days, typical
   freight range, available brands, `[Ver vehículos de este origen]`
4. **Comparison table** below — all origins × transit days × typical freight × vehicle count
5. CTA + footer

**Functions:** click/tap marker → panel; route animation; link into `/catalogo?origen=`;
data from `FreightRate` + `Country` (fully parametric).

**Color:** deliberately desaturated map so the two marker colors carry all meaning. Selected
route line `--accent` with a soft glow; unselected routes `--border`. Panel `--surface-elevated`.

**Responsive:** map becomes pannable at fixed zoom; panel becomes a bottom sheet; table scrolls
horizontally in its own container.

---

#### 4. `/blog` — Blog index
**Requirement:** Módulo 5 (Blog de noticias, CMS)
**Structure:** header · featured post (large card, cols 1–8 image / 9–12 text) · category chip
row · post grid 3-up · pagination · newsletter CTA · footer.
**Functions:** category + tag filter via URL, search, pagination, RSS.
**Color:** cards `--surface` with `--border`, hover lifts to `--surface-elevated`. Category chips
`--surface-elevated` with `--text-secondary`; active chip `--primary` fill. Read-time in `--text-muted`.
**Responsive:** 3-up → 1-up; chips scroll horizontally.

---

#### 5. `/blog/[slug]` — Article
**Structure:** breadcrumb · title block (category, H1, author, date, read time) · cover image ·
two columns: content 8 / sticky TOC + share 4 · inline CTA card mid-article · author card ·
related posts 3-up · footer.
**Functions:** CMS rich content, TOC from headings, scroll progress bar, share, JSON-LD Article.
**Color:** prose `--text-secondary` at 1.125rem/1.7 for readability; headings `--text-primary`;
links `--primary` with underline; blockquote `--border-strong` left bar on `--surface`; inline
code `--surface-elevated`. Progress bar `--accent`. TOC active item `--primary`.
**Responsive:** TOC collapses to a sticky dropdown under the header.

---

#### 6. `/nosotros` — Nosotros
**Structure:** header · story block (text 6 / image 6) · numbers band (4 `--accent` figures) ·
team grid · alianzas/certificaciones logo row on `--surface` · CTA · footer.
**Color:** Zone A defaults. Logo row desaturated to `--text-muted`, full color on hover.

---

#### 7. `/contacto` — Contacto
**Structure:** header · two columns: form 7 (nombre, email, teléfono, interés select, mensaje,
habeas-data consent checkbox) / contact info 5 (WhatsApp button, email, phone, offices, hours,
small map) · footer.
**Functions:** Zod-validated server action, honeypot + rate limit, `Lead` creation with source
attribution, success state replaces the form, WhatsApp deep link.
**Color:** form on `--surface` card. Inputs `--bg` fill with `--border`, focus `--primary` ring.
WhatsApp button uses `--success` (the one place brand-green is semantically right). Consent
checkbox label `--text-muted` with a `--primary` link to `/legal/habeas-data`. Success state
`--success` icon on `--surface`.

---

#### 8. `/faq` — Preguntas frecuentes
**Structure:** header with search field · category sidebar 3 / accordion list 9 · "¿aún tienes
dudas?" CTA card · footer.
**Functions:** client-side search over CMS FAQ entries, category filter, deep-linkable anchors.
**Color:** accordion items `--surface`, open item `--surface-elevated` with `--primary` left bar.
Chevron `--text-muted` → `--primary` when open.

---

#### 9. `/legal/[slug]` — Legal (T&C, Privacidad, Habeas Data, Cookies)
**Structure:** header · sidebar index 3 / prose 9 · last-updated line · footer.
**Functions:** CMS-driven `Page` records; the slug list is data, so adding a policy needs no code.
**Color:** maximum restraint — `--text-secondary` prose, `--text-primary` headings, no accent.

---

### ZONE B · TIENDA

---

#### 10. `/catalogo` — La Vitrina ★
**Requirement:** Módulo 2 — "vitrina de alto rendimiento con 21 filtros"
**User:** buyer browsing · **Goal:** narrow hundreds of units to a shortlist fast

**Structure:**
1. Breadcrumb
2. **Title row** — H1 "Catálogo" + live count "312 vehículos disponibles" in `--text-secondary`
3. **Control bar** (sticky under header) — sort select · **density toggle** (Cuadrícula / Tabla —
   the "Manheim mode") · `[Guardar búsqueda]` ghost · results-per-page
4. **Active filter chips** — one chip per applied filter with an × , plus `[Limpiar todo]`
5. **Two columns** — sidebar cols 1–3 (sticky, own scroll) / results cols 4–12
   - Sidebar: 5 collapsible groups holding the 21 filters — *Vehículo* (marca, modelo, versión,
     año, carrocería, color) · *Motorización* (motorización, potencia, torque, cilindrada,
     batería, autonomía, carga DC, transmisión, tracción) · *Origen y logística* (país, puerto,
     tiempo de entrega, disponibilidad) · *Precio* (landed cost) · *Capacidad* (puestos).
     Each group shows an active-count badge.
   - Results: `VehicleCard` grid 3-up, or dense `DataTable` in Manheim mode
6. **Pagination** — cursor-based, skeleton streaming
7. Footer

**Functions:** all 21 filters from the registry, faceted counts per option, URL-synced state
(shareable/bookmarkable), server-rendered results with Suspense streaming, compare checkboxes
feeding `/comparar`, save search (auth), empty state with "relaja estos filtros" suggestions.

**Color:** sidebar `--surface` with `--border` right edge; group headers `--text-primary`, options
`--text-secondary`. Range slider track `--border-strong`, filled portion + handles `--primary`.
Checked boxes `--primary`. Active-count badges `--primary` at 15% with `--primary` text.
Filter chips `--surface-elevated` with `--border`, × in `--text-muted`.
`VehicleCard`: `--surface`, `--border`, hover → `--surface-elevated` + `--border-strong`, image on
a neutral `#15181D` plate. **Price in `--accent`**, label "landed cost estimado · desde EE. UU."
in `--text-muted`. Availability badge: `--success` disponible / `--info` en tránsito /
`--text-muted` bajo pedido. In table mode, rows alternate `--bg`/`--surface` at 40% and the only
color is the price and the status pill.

**Responsive:** sidebar → full-screen sheet with a fixed `--primary` footer button
"Ver 312 resultados"; cards 1-up; control bar collapses to sort + filter count.

---

#### 11. `/catalogo/[slug]` — Ficha del vehículo (VDP) ★
**Requirement:** Módulo 2 (ficha técnica) + Módulo 1 (landed cost visible per unit)
**User:** buyer evaluating one unit · **Goal:** the single most commercial screen in the product

**Structure:**
1. Breadcrumb
2. **Split hero** — gallery cols 1–7 (main image + thumbnail rail + fullscreen), summary cols
   8–12 **sticky**:
   - marca · modelo · versión · año
   - spec pills (motorización, potencia, autonomía)
   - **landed cost, large, in `--accent`**, with "COP" and the `TrmBadge` beneath
   - origin selector (segmented control: EE.UU. · China · Dubái · Europa · Canadá)
   - container-share selector (1 · 2 · 3 · 4+ vehículos) with a "ahorras X" hint
   - `[Cotizar ahora]` primary · `[Descargar PDF]` ghost · `[WhatsApp]` ghost
3. **Tab bar** — Ficha técnica · Costo en Colombia · Agregados · Tiempos · Documentos
4. **Ficha técnica** — 2-column definition grid, grouped (Motor · Desempeño · Batería y carga ·
   Dimensiones · Equipamiento · Seguridad)
5. **Costo en Colombia** — `CostWaterfall` chart + breakdown accordion by block (Origen · Flete y
   seguro · Tributos · Nacionalización · Servicios · Comercial), each line with its note and rule basis
6. **Agregados** — `AddOnCard` grid with checkboxes that update the sticky total live
7. **Tiempos** — `TimelineStrip`, 6 phases with day counts
8. **Documentos** — checklist of what the buyer must provide
9. **Similares** — 4-up cards
10. Footer

**Functions:** origin change → engine recompute (browser-side, same module as the server);
container-share change → re-proration; add-on toggle → live total delta; quote creation →
snapshot + PDF; gallery keyboard nav; JSON-LD Product.

**Color:** gallery plate `#15181D`, thumbnails `--surface` with the active one ringed `--primary`.
Summary panel `--surface-elevated` — the only elevated surface above the fold. Landed cost in
`--accent` at 2.25rem, tabular numerals. Segmented control: track `--surface`, selected segment
`--surface-elevated` + `--primary` text. Waterfall: increases `--text-muted`, taxes `--warning`
(they are the number people react to), final total `--accent`. Accordion rows separated by
`--border`; rule-basis notes `--text-muted` at 0.75rem. Add-on cards get a `--primary` border when
selected. Timeline phases `--border-strong` connectors with `--primary` nodes.

**Responsive:** summary collapses to a sticky bottom bar (price + `[Cotizar]`); tabs become
sequential accordions; waterfall becomes a horizontal-scroll container.

---

#### 12. `/comparar` — Comparador
**Structure:** header with count · sticky column headers (up to 4 vehicles, each with image,
name, landed cost, remove ×, `[+ Añadir]` slot) · spec rows grouped by section, differences
highlighted · cost comparison row · action row per column.
**Functions:** up to 4 units, "solo diferencias" toggle, share via URL, remove/add, per-column quote.
**Color:** header row `--surface-elevated` sticky. Differing values get a `--surface-elevated` cell
fill with `--text-primary`; identical values stay `--text-muted`. Best-in-row value marked with a
small `--success` caret. Landed costs in `--accent`.
**Responsive:** horizontal scroll with the spec-label column frozen left.

---

#### 13. `/simulador` — Simulador de importación ★
**Requirement:** Módulo 1 — the parametric engine, exposed to the buyer
**User:** buyer or advisor · **Goal:** the screen that proves the product is real

**Structure:**
1. Page header — H1 + `TrmBadge` (value, date, source AUTO/MANUAL)
2. **Two panes** — parameters cols 1–5 / results cols 6–12 sticky
   - **Parameters** — accordion sections mirroring the engine blocks exactly:
     *Vehículo* (or pick from catalog) · *Origen* (país, puerto, precio de compra, fees, flete
     interno, documentos) · *Flete y seguro* (modo, contenedor, recargos, tasa de seguro) ·
     *Consolidación* (nº de vehículos, método de prorrateo) · *Nacionalización* (overrides) ·
     *Servicios* · *Comercial* (margen)
   - **Results** — landed cost headline · `CostWaterfall` · breakdown accordion · `TimelineStrip`
3. **Consolidation panel** — per-unit allocation table showing each vehicle's share and the
   residue row
4. **Action bar** — `[Guardar cotización]` · `[Descargar PDF]` · `[Enviar por correo]`
5. Footer

**Functions:** debounced live recompute on every input; every field defaults from the active
`ParameterSet` and shows its default as placeholder; per-field "restablecer"; proration method
switch recomputes allocations; quote snapshot; PDF; shareable URL state.

**Color:** parameter pane `--surface` with `--border` sections; inputs `--bg` fill; a field
overridden from its default gets a `--warning` left bar and a "modificado" tag — this is
important, because the operator must see at a glance where they departed from the standard set.
Results pane `--surface-elevated`. Headline figure `--accent` at 3rem. During recompute the
figure pulses to `--accent` at 60% opacity for 200ms — the "en vivo" signal. Waterfall as in the
VDP. Residue row `--text-muted` italic with the exact centavos.
**Responsive:** panes stack; results collapse to a sticky summary bar, expandable to full sheet.

---

#### 14. `/checkout` — Checkout con upselling ★
**Requirement:** Módulo 3 — "pasarela de agregados en origen y servicios en destino"
**Structure:**
1. Slim header (logo + secure indicator only — no nav, to protect the funnel)
2. **Stepper rail** — 4 steps: Configuración · Agregados en origen · Servicios en destino · Datos y pago
3. **Two columns** — step content cols 1–7 / **sticky order summary** cols 8–12
   - Step 1: vehicle confirm, origin, port, container share, delivery city
   - Step 2: origin add-ons (Wallbox, accesorios) as `AddOnCard`s
   - Step 3: destination add-ons (PPF en Zona Franca, GarantiPlus, matrícula, SOAT, kit de
     mantenimiento)
   - Step 4: personal + fiscal data (CC/NIT), billing address, payment method, T&C consent
   - Summary: vehicle line, cost blocks collapsed, add-on lines, total, reservation amount,
     ETA, validity countdown
4. Footer (minimal, legal links only)

**Functions:** step validation before advance, back without data loss, summary recomputes
server-side on every change with an animated delta, reservation payment, order creation,
abandoned-cart lead capture.
**Color:** stepper — completed `--success` filled, current `--primary` filled with ring, upcoming
`--surface-elevated` with `--text-muted`. Summary panel `--surface-elevated` with a `--border`
edge. When a line changes, the delta flashes `--accent` and settles to `--text-primary`. Total in
`--accent`. Reservation amount in `--text-primary` with a `--warning` note about the balance due.
Validity countdown `--warning` under 24h, `--danger` under 2h. Single `--primary` CTA per step.
**Responsive:** summary collapses to an expandable sticky bottom bar; stepper becomes "Paso 2 de 4".

---

#### 15. `/checkout/confirmacion/[orderId]` — Confirmación
**Structure:** centered success card (`--success` check, order number, thank-you) · "qué sigue"
3-step strip · order summary card · `[Descargar propuesta PDF]` primary · `[Ir a mi portal]`
ghost · advisor contact card · footer.
**Functions:** idempotent (safe to refresh), PDF download, portal magic-link if guest, email + WhatsApp confirmation.
**Color:** `--success` used once, large, at the top; everything else neutral. Zone B defaults.

---

### ZONE E · AUTH & SYSTEM

---

#### 16–18. `/login`, `/registro`, `/recuperar`
**Structure:** split screen — brand panel cols 1–5 (full-bleed vehicle image, logo, one-line
value prop) / form card cols 6–12 centered, max-width 420px.
- `/login`: email, password, `[Entrar]`, magic-link alternative, links to registro/recuperar
- `/registro`: nombre, email, teléfono, password, **habeas-data consent checkbox (required)**,
  `[Crear cuenta]`
- `/recuperar`: email → sent state → new-password form
**Functions:** Auth.js credentials + magic link, Zod validation with inline errors, rate limiting,
redirect back to the intended route.
**Color:** brand panel carries the photograph with a `--bg` scrim. Form card `--surface` on `--bg`.
Inputs `--bg` with `--border`; error state `--danger` border + `--danger` helper text. One
`--primary` submit, full width. Secondary links `--text-secondary` with `--primary` on hover.

---

#### 41–42. `not-found` (404) and `error` (500)
**Structure:** centered — oversized `--text-muted` code, headline, one line of help, search field
(404 only), `[Volver al catálogo]` primary, 3 popular vehicles (404) or `[Reintentar]` (500).
**Color:** Zone E. The numeral is `--text-muted` at 6rem — large but quiet. One `--primary` action.

---

### ZONE C · PORTAL DEL CLIENTE

---

#### 19. `/portal` — Dashboard
**Requirement:** Módulo 5 — "Portal de Cliente (Dashboard)"
**Structure:** greeting + portal tab nav · **active order cards** (each: vehicle thumb, order
number, dual mini traffic light, current phase, ETA, `[Ver detalle]`) · **next action alert** if
a document is pending · quick links (cotizaciones, documentos, perfil) · notifications list.
**Functions:** live order status, pending-action surfacing, quote validity warnings.
**Color:** Zone C — `--surface` dominant so cards read as the content, not as objects on a page.
The **next-action alert** is the only saturated element: `--warning` left bar on `--surface-elevated`.
Traffic lights use the four status colors at full saturation. Everything else `--text-secondary`.

---

#### 20. `/portal/pedidos` — Mis pedidos
**Structure:** tab nav · status filter chips · order rows (thumb, number, vehicle, dual mini
semáforo, phase, ETA, chevron) · empty state.
**Color:** rows `--surface`, hover `--surface-elevated`. Status filter chips as in `/catalogo`.
Mini semáforos are two 8px dots — documental and física — with a tooltip.

---

#### 21. `/portal/pedidos/[id]` — Detalle con semáforo digital ★
**Requirement:** Módulo 5 — "semáforo digital para rastreo físico (GPS) y documental"
**User:** buyer who has paid · **Goal:** replace anxiety with visible progress

**Structure:**
1. **Order header** — vehicle image, marca/modelo/versión, order number, ETA, current phase
2. **The two traffic lights** — side by side, large. Each: a label (*Estado documental* /
   *Estado físico*), three stacked lamps with only the active one lit, and a one-line current
   status ("Declaración de importación presentada" / "En tránsito — arribo estimado 12 oct")
3. **Milestone timeline** — vertical, one node per phase: name, planned date, actual date,
   responsible party, status. Completed nodes filled, current node ringed and pulsing, future
   nodes hollow.
4. **Map card** — vessel or GPS position, route line, last-updated timestamp
5. **Document checklist** — table: document, required-of (cliente/nosotros), status, action.
   Pending client documents get an upload button.
6. **Cost summary** — collapsed breakdown, paid vs. pending
7. **Advisor card** — photo, name, WhatsApp, phone
8. **Event history** — reverse-chronological log

**Functions:** live status (polling or revalidation), document upload with type/size validation,
download issued documents, milestone detail expansion, advisor contact, PDF re-download.
**Color:** this is the one screen where color is the primary information channel.
Lamps: `--success` / `--warning` / `--danger`, with inactive lamps at `--neutral-status` 20%.
Timeline: completed nodes `--success` filled, current `--primary` filled with a pulsing ring,
future `--surface-elevated` with `--border-strong`. Planned dates `--text-muted`, actual dates
`--text-primary`. Document statuses as pills: `--success` recibido · `--warning` pendiente ·
`--info` en revisión · `--danger` rechazado. Map route `--accent`, vessel marker `--primary`.
Everything not carrying status is `--text-secondary` on `--surface` — deliberately quiet.
**Responsive:** traffic lights stack but stay large; timeline unchanged; map full-width;
checklist becomes cards.

---

#### 22. `/portal/cotizaciones` — Mis cotizaciones
**Structure:** tab nav · list of quote cards (vehicle, total, created date, **validity
countdown**, status) · actions: ver PDF, abrir en simulador, convertir en pedido.
**Color:** validity countdown is the focal element — `--success` >7 days, `--warning` <72h,
`--danger` expired (card desaturates to 60% opacity). Totals `--accent`.

---

#### 23. `/portal/documentos` — Documentos
**Structure:** tab nav · grouped by order (accordion) · document table per order · `[Descargar todo]`.
**Color:** Zone C. Status pills as on the order detail. File-type icons `--text-muted`.

---

#### 24. `/portal/perfil` — Perfil
**Structure:** tab nav · sections: datos personales · datos fiscales (CC/NIT, régimen) ·
direcciones · seguridad (cambiar contraseña) · notificaciones (email/WhatsApp toggles) ·
zona de peligro (eliminar cuenta).
**Color:** Zone C. Save buttons `--primary`, disabled until dirty. Danger zone `--danger` outline
card — the only `--danger` on the page, at the very bottom.

---

### ZONE D · CONTROL TOWER (ADMIN)

---

#### 25. `/admin` — Dashboard
**Structure:** topbar · KPI tile row (cotizaciones, pedidos activos, ingresos del mes, ticket
promedio — each with a period delta) · funnel chart (visitas → simulaciones → cotizaciones →
pedidos) · pipeline-by-stage bar · `TrmBadge` panel with 30-day sparkline · alerts list (documents
overdue, quotes expiring, sync failures) · recent activity feed.
**Color:** Zone D — near-monochrome. Tiles `--surface` with `--text-primary` figures and
`--text-muted` labels. Deltas are the only color: `--success` up, `--danger` down. Charts use a
single `--primary` series; comparison series in `--border-strong`. Alerts by severity.

---

#### 26. `/admin/inventario` — Inventario
**Structure:** topbar · toolbar (search, status filter, brand filter, `[Importar CSV]`,
`[+ Nuevo vehículo]`) · `DataTable` (thumb, marca/modelo/versión, año, motorización, origen,
landed cost, estado, updated, actions) · bulk selection bar · pagination.
**Functions:** sort, filter, bulk publish/unpublish/delete, duplicate, CSV import with a
validation preview, inline quick-edit of price.
**Color:** table near-monochrome — `--surface` rows, `--surface-elevated` on hover,
`--border` dividers. Status pills the only color: `--success` publicado · `--text-muted` borrador ·
`--warning` sin precio · `--info` en tránsito. Bulk bar `--surface-elevated` with `--primary` action.

---

#### 27. `/admin/inventario/[id]` — Editor de vehículo
**Structure:** breadcrumb · title + status + `[Guardar]` `[Publicar]` · **tabbed form**:
*General* (marca, modelo, versión, año, VIN/lote, descripción) · *Especificaciones* (the 21
filterable dimensions, generated from the Zod schema) · *Imágenes* (drag-drop uploader with
reorder + cover selection) · *Costos de origen* (purchase price, fees, inland, docs) ·
*Publicación* (slug, SEO title/description, OG image, canales) · right rail with a **live landed
cost preview** that recomputes as origin costs change.
**Functions:** autosave draft, validation per tab with error badges, image reorder, live preview,
publish gating on required fields.
**Color:** Zone D. Tabs with `--danger` count badges when a tab has validation errors — the
fastest way to see what is blocking publication. Inputs `--bg` on `--surface`. The live preview
rail is `--surface-elevated` with the figure in `--accent`, visually echoing the storefront so the
operator sees what the buyer will see.

---

#### 28. `/admin/parametros` — Motor de parámetros ★★
**Requirement:** Módulo 1 in its entirety — this is the screen that *is* the product
**User:** operator/admin · **Goal:** change any number in the business in under ten seconds

**Structure:**
1. **Version banner** (full width, top) — "Set v12 · ACTIVO desde 01/09/2026" · `[Nueva versión]`
   `[Publicar]` · `[Ver historial]`. If a DRAFT exists, the banner switches to a warning state.
2. **Left vertical tabs** cols 1–3 — *Divisas* · *Fletes* · *Aranceles* · *Costos de destino* ·
   *Agregados* · *Márgenes*
3. **Content pane** cols 4–9 — a `DataTable` per tab with inline editing, each row carrying its
   validity dates and a source note field:
   - *Divisas*: TRM history, source (AUTO/MANUAL), `[Sincronizar ahora]`, manual override with a
     mandatory reason
   - *Fletes*: origin × port × mode × container type → cost, surcharges, transit days
   - *Aranceles*: HS code × origin × powertrain × date range → arancel %, IVA %, INC % + threshold,
     base composition toggles, legal basis text
   - *Costos de destino*: port charges, Zona Franca, storage/day, inspection, VUCE/ANLA,
     brokerage % + minimum, inland delivery
   - *Agregados*: the upsell catalog with stage, currency, price, taxable flag
   - *Márgenes*: margin %, service fee, payment processing %, GMF
4. **Right rail** cols 10–12 — **"Simular impacto"**: pick a sample vehicle and origin, see the
   landed cost *before* and *after* the pending change, line by line, with deltas.

**Functions:** create draft version → edit → simulate → publish (activating a set is atomic and
audited); every edit records who/when/why; validity-dated rows so future rates can be staged;
revert to a previous set; export/import a set as JSON.

**Color:** the most restrained screen in the product, because it is the densest. Tables are
`--surface` on `--bg` with `--border`, all text `--text-secondary` except values in
`--text-primary` with tabular numerals. Color appears in exactly four places:
- Version banner: `--success` tint when ACTIVE, `--warning` tint when an unpublished DRAFT exists
- A manually-overridden TRM row: `--warning` left bar + "manual" pill
- Rows whose validity has expired: 50% opacity with a `--text-muted` "vencida" pill
- The impact simulator: increases `--danger`, decreases `--success`, unchanged `--text-muted`
`[Publicar]` is `--primary` and is the only primary button on the screen.
**Responsive:** tablet drops the right rail into a modal; this screen is not designed for phones,
by intent — it is an operator tool.

---

#### 29. `/admin/consolidacion` — Consolidación logística ★
**Requirement:** Módulo 1 — "algoritmo de prorrateo para 1, 2, 3 o más vehículos por contenedor"
**Structure:** toolbar (nueva consolidación, origen, puerto, tipo de contenedor) · **container
visual** (top-down slot diagram, vehicles as draggable chips) · **capacity meters** (units,
weight kg, volume m³) · unassigned-vehicle tray below · right panel: proration method selector
(Partes iguales · Por valor CIF · Por volumen · Por peso · Manual) + **allocation preview table**
(vehicle, weight/value, share %, allocated cost, and the **residue row**) · `[Guardar]`.
**Functions:** drag to assign/unassign, live re-proration on every change, manual share entry
that must sum to 100%, capacity warnings, link to the resulting quotes.
**Color:** container diagram `--surface` with `--border-strong` outline; occupied slots
`--surface-elevated` with a `--primary` edge; vehicle chips `--surface-elevated`. Capacity meters:
`--success` under 80%, `--warning` 80–100%, `--danger` over. Allocation table monochrome with
share % in `--accent`. The residue row is `--text-muted` italic and always visible — never hidden,
because it is the proof the math balances.

---

#### 30. `/admin/cotizaciones` — Cotizaciones
**Structure:** toolbar (search, status, date range, advisor) · `DataTable` (número, cliente,
vehículo, total, creada, vence, estado, asesor, actions) · row actions: ver, PDF, reenviar,
clonar, convertir en pedido.
**Color:** Zone D monochrome. Status pills: `--info` enviada · `--success` aceptada ·
`--warning` por vencer · `--text-muted` vencida · `--danger` rechazada. Totals `--text-primary`
tabular.

---

#### 31. `/admin/pedidos` — Pipeline de pedidos
**Structure:** toolbar (search, filters, view toggle Kanban/Tabla) · **Kanban board**, one column
per order status, cards draggable between columns · card: order number, client, vehicle, ETA,
dual mini semáforo, SLA indicator · column headers with counts.
**Functions:** drag to advance status (validated against the transition table — invalid drops are
rejected with a reason), filters, SLA warnings, bulk export.
**Color:** columns `--bg` with `--border`; cards `--surface`, dragging state `--surface-elevated`
with a `--primary` ring. SLA indicator is the only saturated element on a card: `--success` on
time · `--warning` at risk · `--danger` overdue. Column headers `--text-muted` with count badges.

---

#### 32. `/admin/pedidos/[id]` — Control Tower del pedido ★
**Requirement:** Módulo 5 — the operator side of the client's semáforo
**Structure:** order header (client, vehicle, value, current status, `[Avanzar estado]`) ·
**three columns**:
- *Hitos y semáforo* (4 cols): both traffic-light selectors (documental / física), milestone list
  with completion checkboxes and date pickers, `[Añadir posición GPS]`
- *Documentos* (4 cols): requirement checklist, upload, approve/reject with reason, issue documents
- *Actividad* (4 cols): internal notes (never client-visible, clearly marked), event log,
  `[Vista previa de lo que ve el cliente]`
**Functions:** every status change writes an `OrderStatusEvent` and notifies the client; document
approval; GPS ping entry; cost vs. actual comparison; internal notes.
**Color:** Zone D, but the two traffic-light selectors are full-saturation and large — they mirror
exactly what the client sees. Internal notes sit on a `--warning`-tinted `--surface` with a
"solo interno" pill, so there is no chance of confusing them with client-visible content.
Approve `--success`, reject `--danger`, both as ghost buttons until confirmed.

---

#### 33. `/admin/clientes` — Clientes
**Structure:** toolbar · `DataTable` (nombre, email, teléfono, ciudad, pedidos, valor total,
origen del lead, última actividad) · detail drawer (profile, orders, quotes, conversations, notes).
**Color:** Zone D monochrome. Lead-source pills `--surface-elevated` with `--text-secondary`.

---

#### 34. `/admin/fuentes` — Fuentes de datos (CMS híbrido)
**Requirement:** Módulo 2 — "sincronización automatizada vía API o Web Scraping"
**Structure:** source list (name, type, schedule, last run, status, `[Ejecutar ahora]`) ·
run history table (started, duration, found, new, updated, failed) · **cola de revisión**:
`RawListing` records awaiting promotion, each with a side-by-side raw-vs-mapped preview and
`[Promover]` / `[Rechazar]` / `[Editar y promover]` · field-mapping editor per source.
**Functions:** manual run trigger, schedule config, mapping rules, promote to `Vehicle`, bulk
promote, error inspection. Nothing auto-publishes — promotion is always a human decision.
**Color:** Zone D. Run status: `--success` ok · `--warning` parcial · `--danger` fallida ·
`--info` en curso (with a subtle animation). Review-queue cards `--surface` with a `--warning`
left bar while pending. Diff preview: new values `--success` tint, changed `--warning` tint.

---

#### 35. `/admin/omnicanal` — Omnicanalidad
**Requirement:** Módulo 4 — "sincronización con TuCarro, CarroYa, Marketplace"
**Structure:** channel cards row (TuCarro · CarroYa · Marketplace — each with connection status,
listing count, last sync, `[Generar feed]` / `[Descargar]`) · listing table (vehicle, channel,
external id, status, last sync, actions) · sync log · field-mapping editor per channel.
**Functions:** per-channel feed generation (CSV/XML), download, listing status tracking, retry
failed, mapping config.
**Color:** Zone D. Channel cards `--surface` with a `--success` / `--text-muted` connection dot.
Listing statuses: `--success` publicado · `--warning` pendiente · `--danger` error ·
`--text-muted` no publicado.

---

#### 36. `/admin/social` — Social Studio
**Requirement:** Módulo 4 — "renderizar fichas gráficas automáticas para redes sociales"
**Structure:** three columns — template picker (2 cols, thumbnails) · **live canvas** (7 cols,
1080×1350 or 1080×1080 preview at scale, actual render) · controls (3 cols: vehicle picker,
which fields to show, price display toggle, background choice, CTA text) · batch queue below
with `[Renderizar lote]` and `[Descargar ZIP]`.
**Functions:** live preview from the real renderer (what you see is the PNG you get), format
switch, batch across selected vehicles, ZIP download.
**Color:** the canvas is the only colorful thing — it renders in brand colors against the
`--bg` workspace. UI chrome is Zone D monochrome so it never competes with the artwork being
designed. Selected template ringed `--primary`.

---

#### 37–38. `/admin/blog`, `/admin/blog/[id]`
**Structure:** list (title, status, category, author, date, views) with toolbar · editor (title,
slug, rich text, cover, category, tags, SEO panel, schedule, `[Guardar borrador]` `[Publicar]`,
preview).
**Color:** Zone D. Status pills `--success` publicado · `--text-muted` borrador · `--info`
programado. Editor content area gets a slightly wider measure and `--text-primary` prose for
comfortable writing.

---

#### 39. `/admin/usuarios` — Usuarios y roles
**Structure:** user table (nombre, email, rol, estado, último acceso) · `[Invitar usuario]` modal ·
role editor (CLIENTE / ASESOR / ADMIN with a permission matrix).
**Color:** Zone D. Role pills: `--info` cliente · `--primary` asesor · `--warning` admin —
admin deliberately warm so elevated privilege is visible at a glance.

---

#### 40. `/admin/ajustes` — Ajustes
**Structure:** section nav · *Empresa* (razón social, NIT, dirección, contacto) · *Marca* (logo,
palette selection, favicon) · *PDF* (template, cover, footer text, validity days) ·
*Correo* (sender, templates) · *Integraciones* (API keys, webhooks, cron status) · *Legal*
(links to CMS legal pages).
**Color:** Zone D. Integration rows show a `--success` / `--danger` connection dot. API keys
masked with a reveal toggle; the reveal action is `--warning`.

---

## Part IV — Build order for screens

Screens are built in the milestone order from `PROJECT-PLAN.md`, but within a milestone always
**admin before storefront** — the storefront needs real data, and the admin is what creates it.

1. **M3:** `/admin` shell → `/admin/parametros` → `/admin/usuarios` → `/admin/ajustes`
2. **M4:** `/admin/inventario` → `/admin/inventario/[id]` → `/catalogo` → `/catalogo/[slug]` → `/comparar`
3. **M5:** `/simulador` → `/admin/consolidacion` → `/admin/cotizaciones`
4. **M6:** `/checkout` → `/checkout/confirmacion` → `/admin/pedidos` → `/admin/pedidos/[id]`
5. **M7:** `/portal` → `/portal/pedidos` → `/portal/pedidos/[id]` → remaining portal pages
6. **M8:** `/` → `/como-trabajamos` → `/mapa-global` → `/blog*` → `/admin/blog*` → `/nosotros`,
   `/contacto`, `/faq`, `/legal`
7. **M9:** `/admin/social` → `/admin/omnicanal` → `/admin/fuentes` → 404/500

Auth pages (`/login`, `/registro`, `/recuperar`) are built in M3 alongside the admin shell,
because everything after it needs a session.
