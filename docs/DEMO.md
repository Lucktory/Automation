# Demo Plan — Automoción OS / Top Gear

How to show this to the client, what to build before you do, and what he will actually react to.

---

## 1. The core insight

**Do not open the demo with the homepage.** Every developer bidding on this will show him a
pretty car catalog. He has seen ten of those. He cannot tell them apart, and neither can you.

He wrote a brief where the *first* module — before the catalog, before the design — is the
Motor Paramétrico de Liquidación. That ordering is not an accident. **His problem is that
pricing an import is slow, manual, error-prone and lives in a spreadsheet only he understands.**

So the demo opens on the calculator, working, with his numbers. Everything else is supporting
material.

---

## 2. What to build before the demo — two options

### Option A — "Prototipo navegable + motor real" *(recommended)*

**~30–35 hours.**

- **Built for real:** the liquidation engine (M2), `/simulador`, `/admin/parametros`, and the
  PDF generator. These run on actual code with a real database.
- **Designed, not built:** the other ~26 screens, generated from the ChatGPT prompts and wired
  together as a clickable static prototype (plain HTML pages with working links, or Figma
  prototype mode).

**Why this one:** it proves the only thing that is genuinely hard, shows the complete vision,
and gets you in front of him in about a week instead of a month. The parts you fake are the
parts nobody doubts you can build. The part you build for real is the part he is actually
buying.

### Option B — "Vertical slice real"

**~100 hours.** M0–M2 in full plus `/catalogo`, the vehicle detail page, `/simulador`,
`/admin/parametros` and the PDF — all running on a real database with real data.

**When to choose it:** only if he has already committed and this *is* the MVP delivery rather
than a pitch.

**Recommendation: A.** Then B becomes the paid first phase.

---

## 3. What he wants to see, ranked

| Priority | What | Why he cares |
|---|---|---|
| **1** | **Landed cost recalculating live** when you change origin, motorization or container share | This is his daily pain. Watching it happen in one second is the entire pitch. |
| **2** | **`/admin/parametros` — him changing a rate himself** | Proves he is not hostage to a developer every time the TRM moves or a decree changes. This is the trust moment. |
| **3** | **The Smart PDF** | He can send it to a buyer *today*. It is the one artifact with immediate commercial value. |
| **4** | **The dual traffic light** in the customer portal | Solves his most annoying operational problem: buyers phoning to ask where the car is. |
| **5** | **Container consolidation / prorrateo** | Very few people understand this. Showing it says "I understood your brief." |
| **6** | Catálogo with the 21 filters, Manheim density toggle | Expected. Impressive if fast, unremarkable otherwise. |
| **7** | Social studio generating an Instagram card | Small, visual, memorable. Good closer. |
| — | Home, Nosotros, Blog, FAQ, mapa | Show as a flip-through. Do not narrate them. |
| — | Architecture, module boundaries, CI, i18n internals | **Never.** He is buying an outcome, not a codebase. Mention modularity in one sentence, only if asked. |

---

## 4. Preparation — do this a week before

1. **Ask him for real material.** One short message:
   > "Para la demo quiero usar tus datos reales, no ejemplos. ¿Me puedes pasar 3 vehículos que
   > estés importando ahora, y los valores que manejas: flete por ruta, tarifas, agenciamiento
   > y tu margen? Así ves tu propia operación en pantalla, no un ejemplo genérico."

   This does three things at once: the demo becomes undeniable, you get the parameter values
   you need anyway, and he is already collaborating before he has hired you.

2. **If he does not send them**, seed with plausible Colombian figures and label them clearly in
   the UI as placeholders. Never present invented numbers as real ones — one wrong figure he
   recognizes and you lose the room.

3. **Deploy it.** A live URL beats a screen share. Create *his* admin account beforehand and
   have the credentials on a card.

4. **Demo in Spanish.** Switch to English exactly once, for five seconds, then switch back.

5. **Record a 3-minute version** as a leave-behind and as insurance against a bad connection.

---

## 5. The script — 8 minutes

**0:00 · Open cold on the simulator.** No homepage, no slides.
> "Este es un Tesla Model 3 desde Estados Unidos. Puesto en Bogotá, con placas: 185 millones."

**0:30 · The money moment.** Three changes, one at a time, pausing after each.
- Origin `EE.UU. → China` — the freight and the arancel line both move.
- Motorization `Gasolina → Eléctrico` — the tax lines change.
- Container share `1 vehículo → 3 vehículos` — freight per unit drops.
> "Cada número que ves tiene su origen. No es una estimación: es la cadena completa,
> línea por línea."

Then open the breakdown accordion and scroll it slowly. Say nothing. Let him read.

**2:30 · The trust moment.** Go to `/admin/parametros`.
> "Y esto lo controlas tú, no yo."

Change the arancel rate. Show "Simular impacto" — before and after, side by side. Publish.
Return to the simulator: the price has changed.
> "Cuando cambie un decreto o te suba el flete la naviera, lo cambias tú en diez segundos.
> No me llamas."

**4:00 · The PDF.** Click download. Open it. Scroll through the breakdown and the timeline.
> "Esto se lo mandas a tu cliente hoy."

**5:00 · The catalog, fast.** Apply three filters, toggle to table density, click into a car.
> "Ficha estilo Manheim. El precio ya está calculado con el motor que acabas de ver."

**6:00 · The traffic light.** Open a customer order.
> "Tu comprador entra aquí y ve dónde está su carro: papeles y ubicación física. Deja de
> llamarte a preguntar."

**7:00 · Flip through the rest.** Fifteen seconds total — home, mapa global, blog, social
studio, omnicanal. Do not stop to explain.
> "Todo esto está diseñado y especificado."

**7:30 · Close.**
> "Lo que acabas de ver funcionando es el motor, el simulador, el panel de parámetros y el PDF.
> El resto está diseñado pantalla por pantalla y documentado. Te propongo construirlo por fases,
> empezando por lo que ya viste."

Then stop talking.

---

## 6. The four questions he will ask

**"¿Estos impuestos están bien?"**
> "Son tus números, no los míos. Aquí es donde los cargas tú o tu SIA."
> Then show the parameter row.

This is the strongest answer in the entire demo. It converts the one thing you cannot guarantee
into the product's main feature.

**"¿Puede sacar los carros de Manheim automáticamente?"**
> "Manheim exige credenciales de dealer. El sistema está construido para conectarse a fuentes
> externas — hay una cola de revisión donde nada se publica sin que alguien lo apruebe.
> Conectamos la fuente que tú tengas acceso, y mientras tanto cargas por CSV."

Do not promise scraping a closed platform. Show `/admin/fuentes` as the answer instead.

**"¿Cuánto tiempo?"**
> Phases, with the first one concrete and short. Never a single number for everything.

**"¿Puedo agregar otro país de origen?"**
> Add a freight-rate row live, in front of him. Ten seconds. Best possible answer.

---

## 7. What to avoid

- **Do not demo the chatbot** unless it is genuinely working. One bad answer erases the
  credibility the calculator just earned.
- **Do not show empty admin tables** or lorem ipsum. Anything you open must have real content.
- **Do not explain the architecture.** He does not care, and it reads as filling time.
- **Do not apologize** for the static screens. "Diseñado y especificado" is a statement of
  progress, not a caveat.
- **Do not open more than one browser tab.** Everything from one deployed URL.

---

## 8. Leave-behind

1. The live URL plus his own admin credentials — so he can play with it after you leave. He will.
2. The 3-minute recording, for the partner who was not in the room.
3. A one-page PDF: the five modules, what is working now, what is next, phases.

Do not send the four planning documents in `docs/`. They are your working material, not client
material — sending them shifts the conversation from what he gets to how you work.
