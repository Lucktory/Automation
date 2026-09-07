# Automoción OS / Top Gear — Documentation

Four documents. Read them in this order.

| # | Document | What it answers |
|---|---|---|
| 1 | **[PROJECT-PLAN.md](./PROJECT-PLAN.md)** | What the client asked for, what we build, the stack, the engine, the 42 pages, the 9 milestones, the 198 hours |
| 2 | **[ARCHITECTURE.md](./ARCHITECTURE.md)** | How the code is organized: modules, the dependency rule, the cost-stage registry, and the no-hardcoding matrix with its CI enforcement |
| 3 | **[PAGES-SPEC.md](./PAGES-SPEC.md)** | Every one of the 42 screens: purpose, structure, functions, colors, responsive behavior, states — plus the requirement traceability matrix and the four color zones |
| 4 | **[I18N.md](./I18N.md)** | How Spanish and English both work properly: routing, catalogs, database translation, formatting, SEO, enforcement |

**Status:** implemented and running. See the root [README](../README.md) for what works
and what is deliberately still inert, and [DEPLOY.md](./DEPLOY.md) for putting it online.

**Palette:** A — «Graphite Showroom», en tema claro. Los tokens viven en
`src/styles/tokens.css` y son la única fuente de color del producto.
