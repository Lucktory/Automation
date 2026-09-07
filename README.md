# Automoción OS

Plataforma transaccional D2C para importar vehículos a Colombia. El comprador
simula el costo puesto en Colombia con las reglas aduaneras reales, elige del
catálogo, recibe una cotización en firme y sigue su pedido hasta la matrícula.

---

## Qué hace

**Motor de liquidación paramétrico.** Calcula arancel, IVA e impoconsumo sobre
sus **tres bases legales distintas** —Dto 1165 de 2019 art. 16 para el arancel,
ET art. 459 para el IVA, ET art. 512-3 para el impoconsumo— porque en Colombia
no se aplican sobre el mismo valor y tratarlas igual produce una cifra
equivocada. Un eléctrico paga 0 % de arancel, 5 % de IVA y queda fuera del
impoconsumo; un combustión equivalente paga 35 %, 19 % y 8 %. Esa diferencia es
el argumento comercial del producto, y sale del motor, no de una tabla escrita a
mano.

**Catálogo.** Los precios de la vitrina los calcula el mismo motor que cotiza,
así que lo que ve el comprador antes de registrarse es lo que le va a costar.

**Cotizaciones inmutables.** Cada cotización guarda una instantánea completa de
su cálculo —entradas, salidas, etiquetas en los dos idiomas y la TRM aplicada—,
recibe un consecutivo atómico por año y queda protegida por disparadores de
Postgres que impiden editarla o borrarla. Un precio ofrecido se puede reproducir
años después aunque los parámetros hayan cambiado diez veces.

**Back-office de trece secciones.** Parámetros del motor, inventario,
consolidación, cotizaciones, pedidos con torre de control, clientes, piezas
sociales y usuarios.

**Bilingüe de verdad.** Español e inglés son ambos de primera clase, con rutas
traducidas (`/es/catalogo` ↔ `/en/catalog`) y una comprobación en CI que rompe
el build si una clave existe en un idioma y no en el otro.

---

## Stack

Next.js 15 (App Router) · TypeScript estricto · Tailwind v4 · Prisma sobre Neon ·
next-intl · Auth.js · `@react-pdf/renderer`

La arquitectura es hexagonal y la regla de dependencia está **impuesta**, no
sugerida: ESLint prohíbe los imports profundos entre módulos y
`tests/architecture/domain-purity.test.ts` falla si el dominio llega a importar
Prisma, React o Next.

---

## Arrancar en local

```bash
npm install
cp .env.example .env.local     # rellena DATABASE_URL y AUTH_SECRET
npx prisma migrate deploy
npm run seed:demo
npm run dev
```

Entra en <http://localhost:3000/es> con `admin@automocion.os` y la contraseña que
imprime la siembra.

---

## Verificar

```bash
npm run verify        # tipos, lint, paridad de idiomas y 132 pruebas
npm run smoke:pages   # renderiza las 46 rutas en los dos idiomas
```

`verify` es lo que tiene que pasar antes de cada commit. `smoke:pages` necesita
el servidor de desarrollo levantado y falla si alguna página devuelve 500 o
imprime una traducción sin resolver.

---

## Documentación

| Documento | Qué responde |
|---|---|
| [docs/DEPLOY.md](docs/DEPLOY.md) | Cómo ponerlo en línea, variables de entorno y qué comprobar después |
| [docs/PROJECT-PLAN.md](docs/PROJECT-PLAN.md) | Qué pidió el cliente, los módulos y los hitos |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Cómo se organiza el código y cómo se impone la regla de dependencia |
| [docs/PAGES-SPEC.md](docs/PAGES-SPEC.md) | Cada pantalla: propósito, estructura y estados |
| [docs/SEED-DATA.md](docs/SEED-DATA.md) | De dónde sale cada valor sembrado y cuáles están sin verificar |
| [docs/I18N.md](docs/I18N.md) | Cómo funcionan los dos idiomas |
| [docs/PROMPTS-CHATGPT.md](docs/PROMPTS-CHATGPT.md) | Los prompts de diseño de cada pantalla |

---

## Estado

Demostración funcional. El motor de cálculo, el catálogo, las cotizaciones, el
PDF y todas las pantallas de lectura funcionan contra datos reales. Quedan
deliberadamente inertes el cobro del checkout —no hay pasarela conectada— y los
diálogos de alta del back-office, que se abren y confirman pero todavía no
escriben. La lista completa está al final de [docs/DEPLOY.md](docs/DEPLOY.md).

Dos reglas del motor siguen **sin verificar** y así lo declara el sistema en
pantalla: el tratamiento de los híbridos y la tarifa real de agenciamiento
aduanero, ambas a la espera de respuesta de la SIA.
