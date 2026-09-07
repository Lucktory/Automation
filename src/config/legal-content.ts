/**
 * Textos legales del sitio, como registro.
 *
 * Son de demostración y el cliente los reemplazará por los suyos revisados por
 * su abogado, pero NO son relleno: dicen lo que la ley colombiana exige que
 * diga cada uno. La política de tratamiento de datos, en particular, tiene que
 * ser consultable en el momento en que se recogen los datos (Ley 1581 de 2012,
 * art. 12), que es exactamente donde el formulario de registro enlaza.
 */

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalDocument {
  slug: string;
  titleEs: string;
  titleEn: string;
  sectionsEs: readonly LegalSection[];
  sectionsEn: readonly LegalSection[];
}

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    slug: "habeas-data",
    titleEs: "Política de tratamiento de datos personales",
    titleEn: "Personal data processing policy",
    sectionsEs: [
      {
        heading: "Responsable del tratamiento",
        paragraphs: [
          "Automoción OS Colombia S.A.S., identificada con NIT 901.456.789-3 y domicilio en Bogotá D.C., es la responsable del tratamiento de los datos personales recogidos a través de este sitio.",
        ],
      },
      {
        heading: "Finalidad",
        paragraphs: [
          "Los datos que nos entregas se usan para elaborar y enviarte cotizaciones de importación, gestionar el proceso de compra, nacionalización y matrícula del vehículo, y mantenerte informado del estado de tu operación.",
          "No vendemos ni cedemos datos personales a terceros con fines comerciales. Sí los compartimos con los operadores necesarios para ejecutar la importación —agencia de aduanas, naviera, aseguradora y organismo de tránsito— y únicamente en lo que cada uno requiere.",
        ],
      },
      {
        heading: "Tus derechos",
        paragraphs: [
          "Conforme a la Ley 1581 de 2012 puedes conocer, actualizar y rectificar tus datos, solicitar prueba de la autorización otorgada, ser informado sobre el uso que les damos, presentar quejas ante la Superintendencia de Industria y Comercio, y revocar la autorización o solicitar la supresión cuando no exista un deber legal de conservarlos.",
          "Para ejercer cualquiera de estos derechos escríbenos a comercial@automocionos.co. Respondemos las consultas en un plazo máximo de diez días hábiles y los reclamos en quince, según los términos de la norma.",
        ],
      },
      {
        heading: "Conservación",
        paragraphs: [
          "Conservamos los datos mientras dure la relación comercial y, después, durante el plazo que exijan las obligaciones tributarias y aduaneras aplicables a una operación de importación.",
        ],
      },
    ],
    sectionsEn: [
      {
        heading: "Data controller",
        paragraphs: [
          "Automoción OS Colombia S.A.S., tax ID 901.456.789-3, domiciled in Bogotá D.C., is the controller of the personal data collected through this site.",
        ],
      },
      {
        heading: "Purpose",
        paragraphs: [
          "The data you provide is used to prepare and send import quotes, manage the purchase, customs clearance and registration of the vehicle, and keep you informed about your operation.",
          "We do not sell or transfer personal data to third parties for commercial purposes. We do share it with the operators required to carry out the import — customs broker, shipping line, insurer and transit authority — and only to the extent each one needs.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under Colombian Law 1581 of 2012 you may access, update and correct your data, request proof of the authorisation granted, be informed of how we use it, file complaints with the Superintendency of Industry and Commerce, and withdraw your authorisation or request deletion where no legal duty to retain applies.",
          "To exercise any of these rights write to comercial@automocionos.co. We answer enquiries within ten business days and claims within fifteen, as the regulation requires.",
        ],
      },
      {
        heading: "Retention",
        paragraphs: [
          "We retain data for the duration of the commercial relationship and thereafter for the period required by the tax and customs obligations applicable to an import operation.",
        ],
      },
    ],
  },
  {
    slug: "terminos",
    titleEs: "Términos y condiciones",
    titleEn: "Terms and conditions",
    sectionsEs: [
      {
        heading: "Objeto",
        paragraphs: [
          "Automoción OS presta un servicio de intermediación y gestión para la importación de vehículos a Colombia: identificación de la unidad en origen, compra, transporte internacional, nacionalización ante la DIAN, matrícula y entrega.",
        ],
      },
      {
        heading: "Cotizaciones",
        paragraphs: [
          "Cada cotización indica su fecha de vigencia, que se deriva de la frescura de la tarifa de flete con la que fue calculada. Dentro de ese plazo el precio se respeta.",
          "Las cifras de tributos son estimaciones liquidadas con los aranceles, el IVA y el impuesto al consumo vigentes a la fecha de emisión, y con la TRM aplicable. La liquidación definitiva la determina la autoridad aduanera al momento de la declaración de importación.",
        ],
      },
      {
        heading: "Elegibilidad del vehículo",
        paragraphs: [
          "La normativa colombiana restringe la importación de vehículos usados. Verificamos la elegibilidad de cada unidad antes de ofrecerla e informamos cuando una unidad está bloqueada o requiere revisión.",
        ],
      },
    ],
    sectionsEn: [
      {
        heading: "Purpose",
        paragraphs: [
          "Automoción OS provides brokerage and management services for importing vehicles into Colombia: sourcing the unit at origin, purchase, international transport, customs clearance with the DIAN, registration and delivery.",
        ],
      },
      {
        heading: "Quotes",
        paragraphs: [
          "Every quote states its validity date, derived from the freshness of the freight rate it was calculated with. Within that period the price holds.",
          "Tax figures are estimates assessed with the duty, VAT and excise rates in force on the issue date, and with the applicable exchange rate. The final assessment is determined by the customs authority when the import declaration is filed.",
        ],
      },
      {
        heading: "Vehicle eligibility",
        paragraphs: [
          "Colombian regulations restrict the import of used vehicles. We verify each unit's eligibility before offering it and disclose when a unit is blocked or needs review.",
        ],
      },
    ],
  },
  {
    slug: "privacidad",
    titleEs: "Política de privacidad",
    titleEn: "Privacy policy",
    sectionsEs: [
      {
        heading: "Qué recogemos",
        paragraphs: [
          "Recogemos los datos que introduces en los formularios de contacto, registro y cotización, y datos técnicos mínimos de navegación necesarios para que el sitio funcione.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Usamos cookies propias para mantener la sesión iniciada y recordar el idioma elegido. No usamos cookies de publicidad de terceros.",
        ],
      },
      {
        heading: "Seguridad",
        paragraphs: [
          "Las contraseñas se almacenan cifradas y nunca en texto plano. El acceso al back-office está restringido por rol y toda operación sobre una cotización emitida queda registrada.",
        ],
      },
    ],
    sectionsEn: [
      {
        heading: "What we collect",
        paragraphs: [
          "We collect the data you enter in the contact, registration and quote forms, plus the minimal technical browsing data required for the site to work.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "We use first-party cookies to keep you signed in and remember your chosen language. We do not use third-party advertising cookies.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Passwords are stored hashed, never in plain text. Back-office access is restricted by role, and every operation on an issued quote is recorded.",
        ],
      },
    ],
  },
];

export function legalBySlug(slug: string): LegalDocument | null {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug) ?? null;
}
