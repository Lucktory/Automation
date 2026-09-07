import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";
import { QuoteProposal, type ProposalCopy } from "@/components/pdf/QuoteProposal";
import { prisma } from "@/infra/db/prisma";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/routing";
import type { QuoteSnapshot } from "@/modules/quoting";

/**
 * Descarga de la propuesta en PDF.
 *
 * Todo lo que imprime sale de `Quote.snapshot`. No se vuelve a liquidar, no se
 * consultan las tarifas y no se mira el catálogo del vehículo: si alguna de esas
 * cosas cambió desde que se emitió, el documento tiene que seguir siendo el que
 * el cliente recibió. Esa es la razón de existir de la instantánea.
 *
 * El idioma es el de EMISIÓN por defecto —una propuesta enviada en español se
 * reimprime en español— pero admite `?locale=en` para reenviarla traducida, que
 * es un caso real en un negocio de importación.
 */

export const runtime = "nodejs";

function localeOf(value: string | null, fallback: string): Locale {
  if (value && (LOCALES as readonly string[]).includes(value)) return value as Locale;
  if ((LOCALES as readonly string[]).includes(fallback)) return fallback as Locale;
  return DEFAULT_LOCALE;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const quote = await prisma.quote
    .findUnique({
      where: { id },
      select: { reference: true, snapshot: true, validUntil: true, locale: true },
    })
    .catch(() => null);

  if (!quote || quote.snapshot === null) {
    return new Response("Cotización no encontrada.", { status: 404 });
  }

  const url = new URL(request.url);
  const locale = localeOf(url.searchParams.get("locale"), quote.locale);
  const t = await getTranslations({ locale, namespace: "pricing" });

  const copy: ProposalCopy = {
    title: t("pdf.title"),
    eyebrow: t("pdf.eyebrow"),
    subtitle: t("pdf.subtitle"),
    proposalNumber: t("pdf.proposalNumber"),
    imageNote: t("pdf.imageNote"),
    landedLabel: t("landedCost.label"),
    trmNote: t.raw("pdf.trmNote") as string,
    timelineHeading: t("pdf.timelineHeading"),
    timelineTotal: t.raw("pdf.timelineTotal") as string,
    days: t.raw("pdf.days") as string,
    validity: t.raw("pdf.validity") as string,
    validityNote: t("pdf.validityNote"),
    closing: t("pdf.closing"),
    website: t("pdf.website"),
    city: t("pdf.city"),
    brandTagline: t("pdf.brandTagline"),
    pageOf: t.raw("pdf.pageOf") as string,
    breakdownTitle: t("breakdown.title"),
    breakdownSubtitle: t("pdf.breakdownSubtitle"),
    columns: {
      concept: t("pdf.columns.concept"),
      note: t("pdf.columns.note"),
      usd: t("pdf.columns.usd"),
      cop: t("pdf.columns.cop"),
    },
    subtotal: t.raw("pdf.subtotal") as string,
    total: t("pdf.total"),
    notesTitle: t("pdf.notesTitle"),
    notes: [t("pdf.notes.one"), t("pdf.notes.two"), t("pdf.notes.three")],
    trust: [
      t("pdf.trust.secure"),
      t("pdf.trust.advice"),
      t("pdf.trust.transparency"),
      t("pdf.trust.support"),
    ],
    blocks: {
      ORIGIN: t("blocks.ORIGIN"),
      FREIGHT: t("blocks.FREIGHT"),
      TAX: t("blocks.TAX"),
      DESTINATION: t("blocks.DESTINATION"),
      ADDON: t("blocks.ADDON"),
      COMMERCIAL: t("blocks.COMMERCIAL"),
    },
    phases: {
      PURCHASE: t("timeline.phases.PURCHASE"),
      ORIGIN: t("timeline.phases.ORIGIN"),
      OCEAN: t("timeline.phases.OCEAN"),
      PORT: t("timeline.phases.PORT"),
      NATIONALIZATION: t("timeline.phases.NATIONALIZATION"),
      REGISTRATION: t("timeline.phases.REGISTRATION"),
    },
    specs: {
      year: t("pdf.specs.year"),
      powertrain: t("pdf.specs.powertrain"),
      origin: t("pdf.specs.origin"),
      units: t("pdf.specs.units"),
      hs: t("pdf.specs.hs"),
      range: t.raw("pdf.specs.range") as string,
      power: t("pdf.specs.power"),
      seats: t("pdf.specs.seats"),
    },
  };

  const buffer = await renderToBuffer(
    QuoteProposal({
      snapshot: quote.snapshot as unknown as QuoteSnapshot,
      reference: quote.reference,
      validUntil: quote.validUntil,
      locale,
      copy,
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      // `inline` y no `attachment`: en la demostración el PDF se abre en una
      // pestaña, que es más convincente que un archivo en la carpeta de
      // descargas. El nombre sigue siendo el correcto si se guarda.
      "content-disposition": `inline; filename="${quote.reference}.pdf"`,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}
