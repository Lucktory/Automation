# Automoción OS — Program Architecture

Companion to `PROJECT-PLAN.md`. This document defines **how the code is organized, what may
depend on what, and the mechanisms that make hardcoding structurally impossible.**

Two standards govern everything below:

> **1. Modularity is enforced, not encouraged.** Every module has one public entry point.
> Dependencies point in one direction. A violation fails CI — it is not a code-review opinion.
>
> **2. There are no magic values.** Not a rate, not a label, not a color, not a URL, not an
> env var. Every category of constant has exactly one home and a lint rule that keeps it there.

---

## 1. Architectural style

**Modular monolith, vertical slices, hexagonal core.**

One deployable Next.js app (correct for this team size and budget), internally partitioned as
if it were several services — so that if a module ever needs to become one, it can be lifted
out without untangling it.

```
┌──────────────────────────────────────────────────────────────┐
│  DELIVERY            src/app/**  — routes, RSC, API handlers │
│  (Next.js only)      Thin. Parses input, calls a use case,   │
│                      renders. Contains no business logic.    │
├──────────────────────────────────────────────────────────────┤
│  APPLICATION         modules/*/application/ — use cases      │
│                      Orchestrates domain + ports. No SQL,    │
│                      no React, no fetch.                     │
├──────────────────────────────────────────────────────────────┤
│  DOMAIN              modules/*/domain/ — entities, value     │
│  (pure TypeScript)   objects, policies, the pricing stages.  │
│                      Zero framework imports. Fully testable  │
│                      with no database and no network.        │
├──────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE      modules/*/infra/ — Prisma repositories, │
│                      HTTP clients, PDF, storage, AI.         │
│                      Implements ports defined in domain.     │
└──────────────────────────────────────────────────────────────┘
```

### The Dependency Rule

**Dependencies point inward only.**

- `domain` imports **nothing** outside `domain` and `core`. Not Prisma, not Next, not React.
- `application` imports `domain` + `core`. It depends on **port interfaces**, never on `infra`.
- `infra` imports `domain` (to implement its ports). Nothing imports *from* `infra` except the
  composition root.
- `app/**` imports only module **public APIs** (`modules/x/index.ts`) and `components/ui`.

Why this matters here: the liquidation engine is the product. Keeping it in a pure domain layer
means it runs identically on the server (official quote) and in the browser (live simulator),
and its test suite needs no database. That property is worth defending with a lint rule.

---

## 2. Module map

```
src/
├── core/                          ← shared kernel. Pure. No module-specific knowledge.
│   ├── money/                     Money value object, Currency, allocation
│   ├── result/                    Result<T,E>, AppError taxonomy
│   ├── ids/                       branded id types (VehicleId, QuoteId…)
│   ├── clock/                     Clock port — no `new Date()` in domain code
│   ├── events/                    DomainEventBus
│   └── validation/                shared Zod primitives
│
├── modules/
│   ├── identity/                  users, roles, sessions, permissions
│   ├── parameters/                ★ ParameterSet, versioning, FX/TRM, rule resolution
│   ├── pricing/                   ★ the liquidation engine — stages, proration, timeline
│   ├── catalog/                   brands, models, trims, vehicles, specs, filters
│   ├── ingestion/                 sources, scrape runs, RawListing → Vehicle promotion
│   ├── quoting/                   quote snapshots, line items, PDF proposal
│   ├── ordering/                  orders, status machine, milestones, documents, tracking
│   ├── content/                   pages, posts, categories, legal
│   ├── channels/                  TuCarro / CarroYa / Marketplace feeds, social cards
│   └── assistant/                 chatbot, tools, RAG
│
├── config/                        ← app-wide declarative registries (see §4)
│   ├── env.ts                     validated environment — the ONLY process.env reader
│   ├── routes.ts                  typed route builder — the ONLY place URLs are written
│   ├── navigation.ts              header/footer/admin nav trees
│   └── features.ts                feature flags
│
├── i18n/                          ← routing, locales, localized pathnames, middleware config
├── messages/                      ← i18n catalogs. The ONLY place user-facing text lives
│   ├── es/                        namespaced per module: common, catalog, pricing, pdf…
│   └── en/                        identical key tree — parity enforced in CI
│
├── composition/                   ← the composition root: wires ports to adapters
│   └── container.ts
│
├── components/ui/                 ← design-system primitives (shadcn). Token-driven only.
├── styles/tokens.css              ← the ONLY place a color value is written
└── app/                           ← Next.js delivery layer
```

### Module public API

Every module exposes **exactly one** entry point:

```ts
// src/modules/pricing/index.ts — the module's contract with the rest of the app
export type { LiquidationInput, LiquidationResult, LineItem } from "./domain/types";
export { liquidate } from "./application/liquidate";
export { allocateContainerCost } from "./domain/proration";
// domain internals, repositories and stage implementations are NOT exported
```

Deep imports (`modules/pricing/domain/stages/duty`) are **banned by lint** outside the module.
This is what makes a module replaceable: the rest of the app can only touch its published surface.

---

## 3. The engine as an open pipeline

The single most important structural decision. A naive implementation is one long
`calculate()` function with twenty additions in it — and every new cost line means editing
that function, which is exactly the hardcoding the client will eventually pay for.

Instead the calculation is a **registry of independent stages**:

```ts
// modules/pricing/domain/stage.ts
export interface CostStage {
  /** Stable machine code, also the i18n key and the PDF line reference. */
  readonly code: string;
  readonly block: CostBlock;               // ORIGIN | FREIGHT | TAX | DESTINATION | ADDON | COMMERCIAL
  readonly order: number;                  // explicit, sparse (10, 20, 30…) so insertion needs no renumber
  /** Stages that must have run before this one can read their output. */
  readonly requires?: readonly string[];
  appliesTo(ctx: PricingContext): boolean;
  compute(ctx: PricingContext): LineItem[];
}
```

```ts
// modules/pricing/domain/stages/index.ts — the registry
export const STAGES: readonly CostStage[] = [
  originPurchase, originFees, inlandFreightOrigin, exportDocs,     // ORIGIN
  oceanFreight, freightSurcharges, marineInsurance,                // FREIGHT
  customsDuty, consumptionTax, valueAddedTax,                      // TAX
  portCharges, freeZone, storage, inspection, permits,
  customsBrokerage, inlandDelivery,                                // DESTINATION
  addOns,                                                          // ADDON
  margin, serviceFee, paymentCosts, financialTax,                  // COMMERCIAL
];
```

```ts
// modules/pricing/application/liquidate.ts
export function liquidate(input: LiquidationInput, deps: PricingDeps): LiquidationResult {
  const ctx = PricingContext.create(input, deps);
  for (const stage of resolveOrder(STAGES)) {          // topological sort on `requires`
    if (!stage.appliesTo(ctx)) continue;
    ctx.record(stage, stage.compute(ctx));             // records lineage: which rule produced what
  }
  return ctx.finalize();
}
```

**What this buys us.** Adding "impuesto verde" or a new port fee is: write one file, add one
entry to the registry. The engine is never edited. Each stage is unit-testable in isolation.
Each stage declares its own applicability, so `if (motorization === "EV")` branching lives
inside the one stage that cares, instead of spreading through a god function. And `ctx.record`
captures lineage, so the PDF can print *why* every number is what it is.

**Stages read parameters; they never contain them.**

```ts
// modules/pricing/domain/stages/customs-duty.ts
export const customsDuty: CostStage = {
  code: "TAX.ARANCEL",
  block: "TAX",
  order: 100,
  requires: ["FREIGHT.CIF"],
  appliesTo: (ctx) => ctx.regime !== "TEMPORAL",
  compute(ctx) {
    const rule = ctx.tariff.resolve({                     // ← data, from ParameterSet
      hsCode: ctx.vehicle.hsCode,
      origin: ctx.vehicle.originCountry,
      powertrain: ctx.vehicle.powertrain,
      on: ctx.valuationDate,
    });
    const base = ctx.base(rule.dutyBase);                 // ← base composition is data too
    return [ctx.line({ code: this.code, amount: base.times(rule.dutyRate), rule })];
  },
};
```

There is no number in that file. There is no number in any stage file.

### Rule resolution is data, not branching

`TariffResolver` scores candidate rules by specificity — exact origin beats wildcard, exact
powertrain beats wildcard, narrower date range beats wider — and returns the winner plus the
rule id for the audit trail. Precedence lives in one scoring function and a database table,
never in a chain of `if`s.

### Money

`core/money` is a Fowler-style value object: integer minor units, explicit currency, arithmetic
that refuses to mix currencies, and `allocate(weights)` that **guarantees the parts sum exactly
to the whole** — the container-proration primitive, with residue assignment built in and
property-tested. Raw `number` arithmetic on currency is banned by lint.

---

## 4. The no-hardcoding matrix

Every category of constant, its single home, and the mechanism that keeps it there.

| Category | Examples | Single source of truth | Enforcement |
|---|---|---|---|
| **Business figures** | arancel %, IVA, freight per route, broker fee, margin | `ParameterSet` rows in Postgres, edited at `/admin/parametros` | Domain code has no numeric literals except `0` and `1`; lint rule `no-magic-numbers` in `modules/*/domain` |
| **Structural enums** | statuses, powertrains, blocks, roles | Prisma enums → generated TS types | Single generated source; string unions banned for these |
| **UI copy** | every label, button, empty state, error | `messages/{es,en}/*.json`, typed keys, ICU | `no-literal-string` in `components/**` and `app/**`; **key-parity check fails the build** ([`I18N.md`](./I18N.md)) |
| **Content copy** | posts, legal pages, FAQs, add-on names, milestone labels | translation tables + `LocalizedText` JSONB | fallback resolver; admin flags untranslated records |
| **Colors, spacing, radius** | every hex, every px | `styles/tokens.css` custom properties + Tailwind theme | Stylelint bans hex/rgb in components; CI greps for `#[0-9a-f]{6}` outside tokens |
| **Environment** | DB url, API keys, secrets | `config/env.ts`, Zod-parsed once at boot | ESLint bans `process.env` everywhere except that file |
| **URLs & routes** | every internal link | `config/routes.ts` typed builders | Lint bans string literals starting `/` in `href`/`redirect` |
| **Navigation** | header, footer, admin sidebar | `config/navigation.ts` | Nav components accept a tree; they never name a page |
| **Catalog filters** | the 21 filters | `modules/catalog/config/filters.ts` | One registry drives schema + URL + UI + query + chips (§5) |
| **Table columns** | admin lists | per-module `columns.ts` definitions | `DataTable` is generic; it never names a field |
| **Form fields** | vehicle editor, parameter forms | Zod schema → generated form | Fields derive from schema, not hand-written JSX |
| **Cost lines** | every element of the price | the `STAGES` registry (§3) | Engine iterates; it never names a cost |
| **Order lifecycle** | statuses & transitions | `modules/ordering/domain/state-machine.ts` transition table | Transitions are a data structure, not `if`s |
| **Document checklist** | required docs per regime | `DocumentRequirement` rows | Seeded data, client-editable |
| **Channels** | TuCarro, CarroYa, Marketplace | `ChannelAdapter` registry | Adding a channel = adding an adapter module |
| **Social templates** | Instagram card layouts | template registry in `channels/social` | New template = new file + registry entry |
| **Dates/time** | `new Date()` | `core/clock` Clock port | Banned in domain; injected, so tests are deterministic |

The right-hand column is the part that makes this real. A standard that is only written down
decays in three weeks; a standard that fails the build survives.

---

## 5. One registry, five behaviors — the filter system

The clearest demonstration of the principle. The 21 catalog filters are declared **once**:

```ts
// modules/catalog/config/filters.ts
export const FILTERS = defineFilters([
  { key: "marca",        kind: "multiselect", path: "trim.model.brand.slug",
    label: "filters.brand",     group: "vehicle",   options: brandOptions },
  { key: "autonomiaKm",  kind: "range",       path: "spec.rangeKm",
    label: "filters.range",     group: "powertrain", unit: "km", step: 25 },
  { key: "motorizacion", kind: "enum",        path: "spec.powertrain",
    label: "filters.powertrain", group: "powertrain", enum: Powertrain },
  // …21 total
]);
```

From that single array we **derive**, with no duplicated knowledge:

1. the Zod schema validating search params,
2. the `nuqs` URL parsers and serializers,
3. the sidebar UI (each `kind` maps to a control component),
4. the Prisma `where` clause builder,
5. the active-filter chips with their labels and clear actions.

Adding filter #22 is adding one object. Nothing else in the codebase changes — no component,
no query, no schema, no chip renderer. That is the standard the whole codebase is held to.

---

## 6. Ports, adapters, and the composition root

Domain and application code depend on **interfaces they own**:

```ts
// modules/parameters/domain/ports.ts
export interface ParameterSetRepository {
  active(on: Date): Promise<ParameterSet>;
  byId(id: ParameterSetId): Promise<ParameterSet | null>;
}
export interface FxRateProvider {
  trm(on: Date): Promise<FxRate>;
}
```

Implementations live in `infra/` (`PrismaParameterSetRepository`, `TrmApiProvider`,
`ManualOverrideFxProvider`). They are wired in exactly one place:

```ts
// composition/container.ts — the only file that knows concrete adapters exist
export const container = {
  parameters: new PrismaParameterSetRepository(prisma),
  fx: new CachedFxProvider(new TrmApiProvider(env.TRM_API_URL), redis),
  pdf: new ReactPdfRenderer(),
  storage: new BlobStorage(env.BLOB_READ_WRITE_TOKEN),
  clock: systemClock,
};
```

Consequences: the engine's test suite injects in-memory fakes and runs in milliseconds with no
database; swapping the TRM source, the PDF renderer or the storage provider touches one line;
and no business code ever imports Prisma.

**Cross-module communication is by event, not by import.** When quoting completes an order,
it publishes `OrderPlaced`; `ordering` and `channels` subscribe. Modules stay decoupled.

---

## 7. The delivery layer stays thin

Every server action goes through one wrapper that handles auth, validation, audit and error
mapping — so no route re-implements them:

```ts
export const createQuote = defineAction({
  input: CreateQuoteInput,           // Zod
  roles: ["ASESOR", "ADMIN"],
  audit: "quote.create",
  handler: (input, ctx) => quoting.createQuote(input, ctx),
});
```

Rules for `app/**`: no business logic, no Prisma, no arithmetic on money, no literal strings.
A route parses input, calls a use case, renders a component. If a page component grows a
calculation, it is in the wrong layer.

**Prices are never trusted from the client.** The simulator computes in the browser for
responsiveness, but the order total is always recomputed server-side from the stored parameter
set before anything is persisted.

---

## 8. Enforcement

Written standards decay. These are wired into CI:

- **`eslint-plugin-boundaries`** — encodes the Dependency Rule. `domain` importing `next`,
  `@prisma/client` or `react` fails the build. `app/**` deep-importing module internals fails.
- **`import/no-restricted-paths`** — no cross-module imports except through `index.ts`.
- **`no-magic-numbers`** in `modules/*/domain/**` — catches a rate creeping into a stage.
- **`no-literal-string`** in `components/**` and `app/**` — catches copy escaping the catalog.
- **Stylelint** — no hex/rgb/hsl outside `styles/tokens.css`.
- **i18n key parity** — a key present in `messages/es` but missing in `messages/en` (or vice
  versa) fails the build; ICU messages must parse and their variables must match across locales.
  Every `CostStage.code` and every UI-facing enum value must have a label in both catalogs.
- **`process.env` ban** outside `config/env.ts`.
- **`tsc --noEmit`** with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **Vitest** — domain suites must not import Prisma; a test asserts the engine bundle has no
  framework dependency.
- **Property test** — `Money.allocate` sums to the original across thousands of random inputs.

CI runs: `typecheck → lint → boundaries → test → build`. Any failure blocks the merge.

---

## 9. Conventions

- **Naming:** files `kebab-case.ts`; types `PascalCase`; ports end in `Repository` / `Provider` /
  `Renderer`; use cases are verbs (`liquidate`, `promoteListing`, `advanceOrder`).
- **Errors:** domain failures return `Result<T, AppError>`; exceptions are for programmer
  errors only. `AppError` carries a stable `code` that maps to an i18n key.
- **Ids:** branded types (`QuoteId`), so a `VehicleId` can never be passed where a `QuoteId` belongs.
- **Immutability:** domain objects are readonly; state changes return new instances.
- **Async:** only `application` and `infra` are async. Domain is synchronous and pure — which is
  why the engine can run in a render pass.
- **Barrels:** exactly one per module, at its root. No barrel files inside modules.

---

## 10. What changes in the plan

`PROJECT-PLAN.md` §3's folder tree is superseded by §2 here. Milestone changes:

- **M0** gains: `core/` primitives (Money, Result, Clock, ids), `config/env.ts`,
  `config/routes.ts`, `messages/es-CO.ts`, the boundaries lint setup, and the CI pipeline —
  **before any feature code**. Roughly +6h, and it is the cheapest 6 hours in the project.
- **M2** builds the engine as the stage registry described in §3, not as a single function.
- **M4** builds the catalog against the filter registry in §5.
- Every later milestone inherits the enforcement, so the standard holds at milestone nine as
  firmly as at milestone one.

Revised total: **~180h**.
