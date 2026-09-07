/**
 * Contenido editorial de demostración.
 *
 * Vive aquí, en un registro y no incrustado en una página, por dos razones: la
 * vitrina pública y el back-office muestran la MISMA lista —si cada una
 * inventara la suya, el cliente vería seis artículos en el blog y otros seis
 * distintos en el administrador—, y el día que exista el CMS basta con cambiar
 * quién provee estos datos, sin tocar ninguna pantalla.
 *
 * Los temas no son relleno: son las preguntas que de verdad hace quien va a
 * importar un vehículo a Colombia, y cada uno corresponde a una regla que el
 * motor ya implementa.
 */

export interface DemoPost {
  slug: string;
  titleEs: string;
  titleEn: string;
  excerptEs: string;
  excerptEn: string;
  bodyEs: readonly string[];
  bodyEn: readonly string[];
  author: string;
  publishedAt: string;
  readingMinutes: number;
  views: number;
  status: "PUBLISHED" | "DRAFT";
}

export const DEMO_POSTS: readonly DemoPost[] = [
  {
    slug: "arancel-iva-impoconsumo-tres-bases",
    titleEs: "Arancel, IVA e impoconsumo: las tres bases que casi nadie separa bien",
    titleEn: "Duty, VAT and excise: the three bases almost nobody separates correctly",
    excerptEs:
      "Los tres tributos de una importación se calculan sobre bases distintas. Confundirlas es el error más caro del sector.",
    excerptEn:
      "The three taxes on an import are assessed on different bases. Confusing them is the industry's most expensive mistake.",
    bodyEs: [
      "El arancel se liquida sobre el valor en aduana, que es el CIF: el precio de la mercancía más el flete y el seguro internacionales (Decreto 1165 de 2019, art. 16).",
      "El IVA usa otra base: el valor en aduana MÁS el arancel ya liquidado (Estatuto Tributario, art. 459). No es el CIF, y esa suma es justamente donde se cuela el error más común.",
      "El impoconsumo usa una tercera: el valor total del bien sin incluir el IVA (ET art. 512-3). Ni el IVA entra en la base del impoconsumo, ni el impoconsumo entra en la del IVA. Se calculan en paralelo desde el mismo punto.",
      "La consecuencia práctica: si alguien te cotiza aplicando los tres porcentajes sobre el mismo número, la cifra está mal, y casi siempre por debajo.",
    ],
    bodyEn: [
      "Duty is assessed on the customs value, which is the CIF value: the price of the goods plus international freight and insurance (Decree 1165 of 2019, art. 16).",
      "VAT uses a different base: the customs value PLUS the duty already assessed (Tax Code, art. 459). It is not the CIF value, and that addition is exactly where the most common error creeps in.",
      "Excise uses a third: the total value of the goods excluding VAT (art. 512-3). VAT does not enter the excise base, and excise does not enter the VAT base. They are computed in parallel from the same point.",
      "The practical consequence: if someone quotes you by applying all three percentages to the same number, the figure is wrong — and almost always too low.",
    ],
    author: "Equipo Automoción OS",
    publishedAt: "2026-08-28",
    readingMinutes: 6,
    views: 2140,
    status: "PUBLISHED",
  },
  {
    slug: "cuanto-cuesta-importar-electrico-2026",
    titleEs: "Cuánto cuesta importar un carro eléctrico a Colombia en 2026",
    titleEn: "What it costs to import an electric car into Colombia in 2026",
    excerptEs:
      "Arancel 0 %, IVA del 5 % y exclusión del impoconsumo. La diferencia frente a un gasolina equivalente supera los 70 millones.",
    excerptEn:
      "Zero duty, 5 % VAT and excise exclusion. The gap against an equivalent petrol car exceeds 70 million pesos.",
    bodyEs: [
      "Colombia grava los vehículos eléctricos con arancel 0 % e IVA del 5 %, y los excluye del impuesto al consumo. Sobre un vehículo de gasolina comparable, esos tres tributos superan con facilidad el 40 % del valor en aduana.",
      "En nuestro simulador, un BYD Song Plus eléctrico sale por unos 134 millones puestos en Colombia, mientras que un SUV de gasolina de valor FOB parecido supera los 250 millones. La diferencia no está en el precio de compra: está en la carga tributaria.",
      "El detalle que suele olvidarse es el certificado de origen. Sin él no aplica la preferencia arancelaria del tratado, y el vehículo pasa a la tarifa general.",
    ],
    bodyEn: [
      "Colombia applies 0 % duty and 5 % VAT to electric vehicles, and excludes them from excise tax. On a comparable petrol vehicle those three taxes comfortably exceed 40 % of the customs value.",
      "In our simulator an electric BYD Song Plus lands at around 134 million pesos, while a petrol SUV of similar FOB value passes 250 million. The difference is not the purchase price: it is the tax burden.",
      "The detail people forget is the certificate of origin. Without it the trade agreement's preferential rate does not apply and the vehicle falls back to the general tariff.",
    ],
    author: "Equipo Automoción OS",
    publishedAt: "2026-08-14",
    readingMinutes: 5,
    views: 3890,
    status: "PUBLISHED",
  },
  {
    slug: "buenaventura-o-cartagena",
    titleEs: "Buenaventura o Cartagena: cómo elegir el puerto de entrada",
    titleEn: "Buenaventura or Cartagena: choosing your port of entry",
    excerptEs:
      "El puerto correcto depende del origen, no de la ciudad de destino. Desde Asia casi siempre gana Buenaventura.",
    excerptEn:
      "The right port depends on the origin, not on the destination city. From Asia, Buenaventura almost always wins.",
    bodyEs: [
      "Buenaventura está en el Pacífico y Cartagena en el Caribe. Un contenedor que sale de Shanghái cruza el Pacífico directo; el mismo contenedor hacia Cartagena tendría que atravesar el Canal de Panamá, con más días y más costo.",
      "Desde Europa y la costa este de Estados Unidos ocurre lo contrario: Cartagena es la entrada natural.",
      "El simulador prueba los dos puertos para cada vehículo y muestra el más barato puesto en destino, que no siempre es el más cercano a la ciudad de entrega.",
    ],
    bodyEn: [
      "Buenaventura sits on the Pacific and Cartagena on the Caribbean. A container leaving Shanghai crosses the Pacific directly; the same container routed to Cartagena would have to transit the Panama Canal, adding days and cost.",
      "From Europe and the US east coast the opposite holds: Cartagena is the natural entry point.",
      "The simulator tries both ports for each vehicle and shows the cheapest landed option, which is not always the one closest to the delivery city.",
    ],
    author: "Equipo Automoción OS",
    publishedAt: "2026-07-30",
    readingMinutes: 4,
    views: 1520,
    status: "PUBLISHED",
  },
  {
    slug: "consolidar-contenedor-tres-vehiculos",
    titleEs: "Por qué consolidar tres vehículos en un contenedor baja el precio",
    titleEn: "Why consolidating three vehicles in one container lowers the price",
    excerptEs:
      "El flete de un 40' HC es el mismo lleve uno o tres carros. Repartirlo es la palanca más grande del costo.",
    excerptEn:
      "A 40' HC costs the same whether it carries one car or three. Splitting it is the biggest lever on cost.",
    bodyEs: [
      "Un contenedor de 40 pies high cube desde Shanghái a Buenaventura cuesta lo mismo con un vehículo dentro que con tres. Si va solo, ese flete completo entra en el CIF de una única unidad y arrastra hacia arriba todos los tributos que se calculan sobre él.",
      "Al repartirlo entre tres unidades, cada una asume un tercio, y como el CIF baja, también bajan el arancel y el IVA que se liquidan sobre esa base.",
      "El reparto no es siempre a partes iguales: la Resolución 1684 de 2014 de la CAN admite repartir la base gravable por valor FOB o por peso, y esa elección cambia la cifra.",
    ],
    bodyEn: [
      "A 40-foot high cube from Shanghai to Buenaventura costs the same with one vehicle inside as with three. Shipped alone, that entire freight cost enters a single unit's CIF value and drags up every tax computed on it.",
      "Split across three units each absorbs a third, and because the CIF falls, so do the duty and VAT assessed on that base.",
      "The split is not always equal: CAN Resolution 1684 of 2014 allows the taxable base to be apportioned by FOB value or by weight, and that choice changes the figure.",
    ],
    author: "Equipo Automoción OS",
    publishedAt: "2026-07-11",
    readingMinutes: 5,
    views: 1180,
    status: "PUBLISHED",
  },
  {
    slug: "trm-comercial-y-trm-fiscal",
    titleEs: "La TRM que ves no es la TRM que liquida tus impuestos",
    titleEn: "The exchange rate you see is not the one that assesses your taxes",
    excerptEs:
      "Los tributos se liquidan con la TRM del último día hábil de la semana anterior. La diferencia se paga en pesos.",
    excerptEn:
      "Taxes are assessed using the rate of the last business day of the previous week. The gap is paid in pesos.",
    bodyEs: [
      "Para mostrar precios usamos la TRM del día. Para liquidar los tributos, la norma exige la TRM del último día hábil de la semana anterior a la presentación de la declaración (Decreto 1165 de 2019, art. 15).",
      "Son dos cifras distintas y conviven en la misma cotización. Por eso guardamos las dos en cada propuesta: la que viste y la que liquidó.",
    ],
    bodyEn: [
      "To display prices we use the day's rate. To assess taxes, the regulation requires the rate of the last business day of the week before the declaration is filed (Decree 1165 of 2019, art. 15).",
      "They are two different figures and they coexist in the same quote. That is why we store both on every proposal: the one you saw and the one that assessed.",
    ],
    author: "Equipo Automoción OS",
    publishedAt: "2026-06-25",
    readingMinutes: 4,
    views: 970,
    status: "PUBLISHED",
  },
  {
    slug: "importar-usado-colombia",
    titleEs: "Importar un vehículo usado a Colombia: qué se puede y qué no",
    titleEn: "Importing a used vehicle into Colombia: what is and is not allowed",
    excerptEs:
      "La regla general prohíbe la importación de usados, con excepciones muy acotadas. Revisamos elegibilidad antes de ofrecer.",
    excerptEn:
      "The general rule bans used-vehicle imports, with narrow exceptions. We check eligibility before we offer.",
    bodyEs: [
      "Colombia restringe fuertemente la importación de vehículos usados. Existen excepciones —vehículos de colección, traslados de menaje, régimen diplomático, zonas francas— pero son estrechas y exigen documentación específica.",
      "Cada unidad de nuestro catálogo lleva un estado de elegibilidad. Si queda en «por revisar» o «bloqueado», lo decimos antes de cotizar, no después de cobrar.",
    ],
    bodyEn: [
      "Colombia heavily restricts used-vehicle imports. Exceptions exist — collector vehicles, household relocations, diplomatic regime, free trade zones — but they are narrow and demand specific documentation.",
      "Every unit in our catalogue carries an eligibility status. If it lands on “needs review” or “blocked”, we say so before quoting, not after taking payment.",
    ],
    author: "Equipo Automoción OS",
    publishedAt: "2026-06-02",
    readingMinutes: 6,
    views: 2610,
    status: "DRAFT",
  },
];

export function postBySlug(slug: string): DemoPost | null {
  return DEMO_POSTS.find((post) => post.slug === slug) ?? null;
}
