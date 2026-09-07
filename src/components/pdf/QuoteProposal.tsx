import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { Money } from "@/core/money";
import { COMPANY_PROFILE } from "@/config/company";
import { TIMELINE_PHASES } from "@/config/timeline-defaults";
import type { QuoteSnapshot } from "@/modules/quoting";

/**
 * Propuesta comercial en PDF.
 *
 * Se dibuja ÚNICAMENTE desde la instantánea de la cotización. No consulta la
 * base de datos, no vuelve a liquidar y no lee el catálogo de mensajes: todo
 * —cifras, etiquetas en los dos idiomas y bases legales— quedó congelado al
 * emitir. Ésa es la razón de que el documento se reproduzca idéntico dentro de
 * dos años, con las tarifas ya republicadas veinte veces.
 *
 * Va sobre FONDO BLANCO, no sobre el tema oscuro de la aplicación: es un
 * documento que se imprime y se reenvía por correo.
 */

// --- Tipografías -----------------------------------------------------------
// Se incrustan desde el repositorio, no desde Google: una propuesta comercial no
// puede depender de que un CDN responda. Además Helvetica —el tipo por defecto
// de PDF— no tiene "≈" en WinAnsi y lo dibuja como una "H" suelta; Inter sí.
const fontDir = path.join(process.cwd(), "src/assets/fonts");

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(fontDir, "Inter-400.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Inter-600.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "Inter-700.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: "Sora",
  fonts: [
    { src: path.join(fontDir, "Sora-600.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "Sora-700.ttf"), fontWeight: 700 },
  ],
});
// Sin esto react-pdf parte las palabras largas por la mitad.
Font.registerHyphenationCallback((word) => [word]);

const CLOSING_IMAGE = path.join(process.cwd(), "public/brand/port-roro.png");

// La paleta clara de tokens.css. Aquí se escriben los valores porque @react-pdf
// no entiende variables CSS ni clases de Tailwind.
const C = {
  bg: "#FFFFFF",
  surface: "#F7F8FA",
  border: "#E3E7EC",
  text: "#0B0D10",
  secondary: "#4A5561",
  muted: "#7A8695",
  primary: "#1B4FE0",
  primarySoft: "#EEF3FF",
  accent: "#00A99B",
  accentSoft: "#E6F7F5",
  warning: "#F79009",
  warningSoft: "#FFF7ED",
} as const;

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    color: C.text,
    fontFamily: "Inter",
    fontSize: 8.5,
    paddingTop: 26,
    paddingBottom: 38,
    paddingHorizontal: 34,
  },

  // --- Encabezado y pie ---------------------------------------------------
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { fontFamily: "Sora", fontWeight: 700, fontSize: 11, color: "#FFFFFF" },
  brandName: { fontFamily: "Sora", fontWeight: 700, fontSize: 11.5, letterSpacing: 0.2 },
  brandNameLight: { color: C.muted },
  brandTagline: { fontSize: 6, color: C.muted, marginTop: 1 },
  metaRight: { fontSize: 8, color: C.secondary, textAlign: "right" },
  metaStrong: { fontWeight: 700, color: C.text },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerRight: { fontSize: 7, color: C.muted, textAlign: "right" },

  // --- Portada ------------------------------------------------------------
  eyebrow: {
    fontSize: 7.5,
    letterSpacing: 1.1,
    color: C.muted,
    marginTop: 13,
  },
  h1: { fontFamily: "Sora", fontWeight: 700, fontSize: 26, lineHeight: 1.06, marginTop: 4 },
  lead: { fontSize: 8.5, color: C.secondary, lineHeight: 1.45, marginTop: 6, maxWidth: 330 },

  vehicleRow: { flexDirection: "row", gap: 16, marginTop: 13 },
  photo: { width: 198, height: 116, borderRadius: 7, objectFit: "cover" },
  photoFallback: {
    width: 198,
    height: 116,
    borderRadius: 7,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackText: { fontFamily: "Sora", fontWeight: 700, fontSize: 26, color: "#C6CDD6" },
  photoNote: { fontSize: 5.8, color: C.muted, marginTop: 3, width: 198 },

  brandBig: { fontFamily: "Sora", fontWeight: 700, fontSize: 18, lineHeight: 1.1 },
  trimLine: { fontSize: 9, color: C.text, marginTop: 4 },
  vehicleBlurb: { fontSize: 7.5, color: C.muted, lineHeight: 1.45, marginTop: 3, maxWidth: 175 },
  specRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4.5 },
  specIcon: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  specLabel: { fontSize: 6.5, color: C.muted },
  specValue: { fontSize: 8.5, color: C.text, marginTop: 0.5 },

  priceCard: {
    marginTop: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  priceLabel: { fontSize: 8.5, color: C.secondary },
  priceFigure: {
    fontFamily: "Sora",
    fontWeight: 700,
    fontSize: 24,
    color: C.accent,
    marginTop: 4,
  },
  priceNote: { fontSize: 7, color: C.muted, marginTop: 5 },

  sectionTitle: { fontFamily: "Sora", fontWeight: 600, fontSize: 10.5, marginTop: 13 },

  timeline: { flexDirection: "row", marginTop: 10 },
  phaseCol: { flex: 1, alignItems: "center" },
  phaseDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseDotInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFFFFF" },
  phaseName: { fontSize: 7.5, color: C.text, marginTop: 6, textAlign: "center" },
  phaseDays: { fontSize: 7, color: C.muted, marginTop: 1 },
  rail: { position: "absolute", top: 7, height: 1.2, backgroundColor: C.primary },

  timeTotal: {
    marginTop: 10,
    backgroundColor: C.primarySoft,
    borderRadius: 7,
    paddingVertical: 7.5,
    alignItems: "center",
  },
  timeTotalText: { fontSize: 9.5, color: C.secondary },
  timeTotalStrong: { fontFamily: "Sora", fontWeight: 700, fontSize: 11, color: C.primary },

  validity: {
    marginTop: 11,
    flexDirection: "row",
    gap: 9,
    backgroundColor: C.warningSoft,
    borderLeftWidth: 3,
    borderLeftColor: C.warning,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    padding: 10,
  },
  bang: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  bangText: { fontSize: 8, fontWeight: 700, color: "#FFFFFF" },
  validityStrong: { fontSize: 8.5, fontWeight: 700, color: C.text },
  validityNote: { fontSize: 7.5, color: C.secondary, marginTop: 2, lineHeight: 1.4 },

  trustRow: { flexDirection: "row", marginTop: 13, gap: 10 },
  trustItem: { flex: 1 },
  trustIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.2,
    borderColor: C.primary,
    marginBottom: 5,
  },
  trustText: { fontSize: 7.5, color: C.secondary, lineHeight: 1.4 },

  closingBand: { marginTop: 13, borderRadius: 9, overflow: "hidden", position: "relative" },
  closingImage: { width: "100%", height: 58, objectFit: "cover" },
  closingOverlay: { position: "absolute", top: 8, left: 14 },
  closingText: {
    fontFamily: "Sora",
    fontWeight: 700,
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 1.12,
  },
  closingRule: { width: 26, height: 2, backgroundColor: C.accent, marginTop: 4 },

  // --- Desglose -----------------------------------------------------------
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 3.5,
    marginTop: 8,
  },
  th: { fontSize: 7, color: C.muted },

  blockHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.surface,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 3.5,
    borderRadius: 4,
  },
  blockBadge: { width: 13, height: 13, borderRadius: 3.5, alignItems: "center", justifyContent: "center" },
  blockBadgeText: { fontSize: 7, fontWeight: 700, color: "#FFFFFF" },
  blockTitle: { fontFamily: "Sora", fontWeight: 600, fontSize: 9 },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 1.8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  subtotalRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: C.surface,
  },

  cConcept: { width: 124, paddingRight: 6 },
  cNote: { flex: 1, paddingRight: 6 },
  cUsd: { width: 68, textAlign: "right" },
  cCop: { width: 92, textAlign: "right" },

  tConcept: { fontSize: 7.5, color: C.text },
  tNote: { fontSize: 6, color: C.muted, lineHeight: 1.2 },
  tNum: { fontSize: 7.5, color: C.text },
  tNumMuted: { fontSize: 7.5, color: C.muted },
  tBold: { fontSize: 8, fontWeight: 700, color: C.text },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: C.accentSoft,
    borderRadius: 6,
  },
  totalLabel: { fontFamily: "Sora", fontWeight: 700, fontSize: 10 },
  totalUsd: { width: 68, textAlign: "right", fontSize: 9, fontWeight: 700 },
  totalCop: {
    width: 92,
    textAlign: "right",
    fontFamily: "Sora",
    fontWeight: 700,
    fontSize: 11,
    color: C.accent,
  },

  notesTitle: { fontFamily: "Sora", fontWeight: 600, fontSize: 9, marginTop: 9 },
  note: { flexDirection: "row", gap: 5, marginTop: 2.5 },
  noteIndex: { fontSize: 6.3, color: C.muted, width: 9 },
  noteText: { flex: 1, fontSize: 6.3, color: C.secondary, lineHeight: 1.28 },
});

export interface ProposalCopy {
  title: string;
  eyebrow: string;
  subtitle: string;
  proposalNumber: string;
  imageNote: string;
  landedLabel: string;
  trmNote: string;
  timelineHeading: string;
  timelineTotal: string;
  days: string;
  validity: string;
  validityNote: string;
  closing: string;
  website: string;
  city: string;
  brandTagline: string;
  pageOf: string;
  breakdownTitle: string;
  breakdownSubtitle: string;
  columns: { concept: string; note: string; usd: string; cop: string };
  subtotal: string;
  total: string;
  notesTitle: string;
  notes: readonly string[];
  trust: readonly string[];
  blocks: Record<string, string>;
  phases: Record<string, string>;
  specs: Record<string, string>;
}

/** El color del distintivo de cada bloque. Los tributos van en ámbar: es la
 *  cifra a la que más reacciona quien lee la propuesta. */
const BLOCK_TONE: Record<string, string> = {
  ORIGIN: C.primary,
  FREIGHT: C.primary,
  TAX: C.warning,
  DESTINATION: C.primary,
  ADDON: C.muted,
  COMMERCIAL: C.accent,
};

type MoneyJson = { minor: string; currency: string };

function amount(value: MoneyJson, locale: string): string {
  const parsed = Money.fromJSON(value as Parameters<typeof Money.fromJSON>[0]);
  const isCop = parsed.currency === "COP";
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    maximumFractionDigits: isCop ? 0 : 0,
  }).format(parsed.toNumber());
  return isCop ? `$ ${formatted}` : `$ ${formatted}`;
}

export function QuoteProposal({
  snapshot,
  reference,
  validUntil,
  locale,
  copy,
}: {
  snapshot: QuoteSnapshot;
  reference: string;
  validUntil: Date | null;
  locale: string;
  copy: ProposalCopy;
}) {
  const intl = locale === "es" ? "es-CO" : "en-US";
  const isEs = locale === "es";
  const longDate = (value: Date) =>
    new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric" }).format(
      value,
    );

  const issued = new Date(snapshot.issuedAt);
  const result = snapshot.result;
  const text = (value: { es: string; en: string } | null) =>
    value === null ? null : isEs ? value.es : value.en;

  /**
   * Los bloques se numeran sobre los que EXISTEN, no sobre el catálogo entero:
   * si una cotización no lleva servicios adicionales, la lista debe ir 1..5 sin
   * un hueco en el 5 que haga dudar de si falta una página.
   */
  const blocks = [...new Set(result.lineItems.map((line) => line.block))]
    .map((block) => {
      const items = result.lineItems
        .filter((line) => line.block === block && !line.isSubtotal)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      const subtotalCop = items.reduce(
        (acc, item) => acc.plus(Money.fromJSON(item.amountCop as never)),
        Money.zero("COP"),
      );
      const subtotalUsd = items.reduce(
        (acc, item) =>
          item.amountUsd ? acc.plus(Money.fromJSON(item.amountUsd as never)) : acc,
        Money.zero("USD"),
      );
      return { block, items, subtotalCop, subtotalUsd };
    })
    .filter((group) => group.items.length > 0);

  const grandUsd = blocks.reduce(
    (acc, group) => acc.plus(group.subtotalUsd),
    Money.zero("USD"),
  );

  const Brand = ({ small = false }: { small?: boolean }) => (
    <View style={s.brandRow}>
      <View style={s.mark}>
        <Text style={s.markText}>A</Text>
      </View>
      <View>
        <Text style={s.brandName}>
          AUTOMOCIÓN <Text style={s.brandNameLight}>OS</Text>
        </Text>
        {!small && <Text style={s.brandTagline}>{copy.brandTagline}</Text>}
      </View>
    </View>
  );

  const Header = ({ withDate = true }: { withDate?: boolean }) => (
    <View style={s.header}>
      <Brand />
      <View>
        <Text style={s.metaRight}>
          {copy.proposalNumber} <Text style={s.metaStrong}>{reference}</Text>
        </Text>
        {withDate && <Text style={s.metaRight}>{longDate(issued)}</Text>}
      </View>
    </View>
  );

  const Footer = () => (
    <View style={s.footer} fixed>
      <Brand small />
      {/* Los datos de la empresa salen del registro compartido, no del catálogo
          de mensajes: el NIT y el dominio no son texto traducible y no pueden
          vivir duplicados entre /admin/ajustes y el documento que se envía. */}
      <Text
        style={s.footerRight}
        render={({ pageNumber, totalPages }) =>
          `${COMPANY_PROFILE.website.replace(/^https?:\/\//, "")}\n` +
          `${COMPANY_PROFILE.city} · NIT ${COMPANY_PROFILE.nit}   ` +
          copy.pageOf
            .replace("{page}", String(pageNumber))
            .replace("{total}", String(totalPages))
        }
      />
    </View>
  );

  const spec = (label: string, value: string) => (
    <View style={s.specRow} key={label}>
      <View style={s.specIcon} />
      <View>
        <Text style={s.specLabel}>{label}</Text>
        <Text style={s.specValue}>{value}</Text>
      </View>
    </View>
  );

  const [brandWord, ...restOfName] = snapshot.vehicle.description.split(" ");

  return (
    <Document title={`${copy.proposalNumber} ${reference}`}>
      {/* ── Página 1 · Portada ──────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <Header />

        <Text style={s.eyebrow}>{copy.eyebrow}</Text>
        <Text style={s.h1}>{copy.title}</Text>
        <Text style={s.lead}>{copy.subtitle}</Text>

        <View style={s.vehicleRow}>
          <View>
            <View style={s.photoFallback}>
              <Text style={s.photoFallbackText}>
                {(brandWord ?? "").slice(0, 3).toUpperCase()}
              </Text>
            </View>
            <Text style={s.photoNote}>{copy.imageNote}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.brandBig}>{brandWord}</Text>
            <Text style={s.brandBig}>{restOfName[0] ?? ""}</Text>
            <Text style={s.trimLine}>
              {restOfName.slice(1).join(" ")} {snapshot.vehicle.modelYear}
            </Text>

            {/* La ficha del diseño: año, motorización, autonomía, potencia y
                capacidad. Cada fila aparece solo si la unidad tiene ese dato —
                un "Potencia: —" en una propuesta comercial resta más que la
                fila ausente. Las que faltan se completan con origen y
                subpartida, que existen siempre. */}
            {spec(copy.specs.year ?? "", String(snapshot.vehicle.modelYear))}
            {spec(copy.specs.powertrain ?? "", snapshot.vehicle.powertrain)}
            {snapshot.vehicle.rangeKm
              ? spec(
                  (copy.specs.range ?? "").replace(
                    "{std}",
                    snapshot.vehicle.rangeStandard ?? "WLTP",
                  ),
                  `${snapshot.vehicle.rangeKm} km`,
                )
              : spec(copy.specs.origin ?? "", snapshot.vehicle.originCountry)}
            {snapshot.vehicle.horsepowerHp
              ? spec(copy.specs.power ?? "", `${snapshot.vehicle.horsepowerHp} hp`)
              : spec(copy.specs.hs ?? "", snapshot.vehicle.hsCode)}
            {snapshot.vehicle.seats
              ? spec(copy.specs.seats ?? "", String(snapshot.vehicle.seats))
              : spec(copy.specs.units ?? "", String(snapshot.vehicle.containerShare))}
          </View>
        </View>

        <View style={s.priceCard}>
          <Text style={s.priceLabel}>{copy.landedLabel}</Text>
          <Text style={s.priceFigure}>COP {amount(result.totalCop, locale)}</Text>
          <Text style={s.priceNote}>
            {copy.trmNote
              .replace(
                "{trm}",
                new Intl.NumberFormat(intl, { minimumFractionDigits: 2 }).format(
                  snapshot.input.fx.trmCommercial,
                ),
              )
              .replace("{date}", longDate(new Date(`${snapshot.input.fx.trmDate}T00:00:00Z`)))
              .replace("{origin}", snapshot.vehicle.originCountry)
              .replace("{units}", String(snapshot.vehicle.containerShare))}
          </Text>
        </View>

        <Text style={s.sectionTitle}>{copy.timelineHeading}</Text>
        <View style={s.timeline}>
          {/* El riel va de centro a centro, no de borde a borde. */}
          <View style={[s.rail, { left: "8.33%", right: "8.33%" }]} />
          {TIMELINE_PHASES.map((phase) => (
            <View key={phase.field} style={s.phaseCol}>
              <View style={s.phaseDot}>
                <View style={s.phaseDotInner} />
              </View>
              <Text style={s.phaseName}>
                {copy.phases[phase.messageKey] ?? phase.messageKey}
              </Text>
              <Text style={s.phaseDays}>
                {copy.days.replace("{days}", String(result.timeline[phase.field] ?? 0))}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.timeTotal}>
          <Text style={s.timeTotalText}>
            {copy.timelineTotal.split("{days}")[0]}
            <Text style={s.timeTotalStrong}>
              {String(result.timeline.totalDays ?? 0)}
              {copy.timelineTotal.split("{days}")[1]}
            </Text>
          </Text>
        </View>

        <View style={s.validity}>
          <View style={s.bang}>
            <Text style={s.bangText}>!</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.validityStrong}>
              {copy.validity.replace("{date}", validUntil ? longDate(validUntil) : "—")}
            </Text>
            <Text style={s.validityNote}>{copy.validityNote}</Text>
          </View>
        </View>

        <View style={s.trustRow}>
          {copy.trust.map((item) => (
            <View key={item} style={s.trustItem}>
              <View style={s.trustIcon} />
              <Text style={s.trustText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={s.closingBand}>
          <Image src={CLOSING_IMAGE} style={s.closingImage} />
          <View style={s.closingOverlay}>
            <Text style={s.closingText}>{copy.closing.split(" ").slice(0, 2).join(" ")}</Text>
            <Text style={s.closingText}>{copy.closing.split(" ").slice(2).join(" ")}</Text>
            <View style={s.closingRule} />
          </View>
        </View>

        <Footer />
      </Page>

      {/* ── Página 2 · Desglose ─────────────────────────────────────── */}
      <Page size="LETTER" style={s.page}>
        <Header withDate={false} />

        <Text style={[s.h1, { fontSize: 17, marginTop: 7 }]}>{copy.breakdownTitle}</Text>
        <Text style={[s.lead, { maxWidth: 420 }]}>{copy.breakdownSubtitle}</Text>

        <View style={s.tableHead}>
          <Text style={[s.th, s.cConcept]}>{copy.columns.concept}</Text>
          <Text style={[s.th, s.cNote]}>{copy.columns.note}</Text>
          <Text style={[s.th, s.cUsd]}>{copy.columns.usd}</Text>
          <Text style={[s.th, s.cCop]}>{copy.columns.cop}</Text>
        </View>

        {blocks.map((group, index) => {
          const label = copy.blocks[group.block] ?? group.block;
          return (
            <View key={group.block} wrap={false}>
              <View style={s.blockHead}>
                <View
                  style={[s.blockBadge, { backgroundColor: BLOCK_TONE[group.block] ?? C.primary }]}
                >
                  <Text style={s.blockBadgeText}>{index + 1}</Text>
                </View>
                <Text style={s.blockTitle}>
                  {index + 1}. {label}
                </Text>
              </View>

              {group.items.map((item) => (
                <View key={item.code} style={s.row}>
                  <Text style={[s.tConcept, s.cConcept]}>
                    {text(item.label) ?? item.code}
                  </Text>
                  <Text style={[s.tNote, s.cNote]}>
                    {text(item.note) ?? item.legalBasis ?? ""}
                  </Text>
                  <Text style={[s.tNumMuted, s.cUsd]}>
                    {item.amountUsd ? amount(item.amountUsd, locale) : ""}
                  </Text>
                  <Text style={[s.tNum, s.cCop]}>{amount(item.amountCop, locale)}</Text>
                </View>
              ))}

              <View style={s.subtotalRow}>
                <Text style={[s.tBold, { flex: 1 }]}>
                  {copy.subtotal.replace("{block}", label.toLowerCase())}
                </Text>
                <Text style={[s.tBold, s.cUsd]}>
                  {group.subtotalUsd.toNumber() > 0
                    ? amount(group.subtotalUsd.toJSON(), locale)
                    : ""}
                </Text>
                <Text style={[s.tBold, s.cCop]}>
                  {amount(group.subtotalCop.toJSON(), locale)}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={s.totalRow}>
          <Text style={[s.totalLabel, { flex: 1 }]}>{copy.total}</Text>
          <Text style={s.totalUsd}>{amount(grandUsd.toJSON(), locale)}</Text>
          <Text style={s.totalCop}>COP {amount(result.totalCop, locale)}</Text>
        </View>

        <Text style={s.notesTitle}>{copy.notesTitle}</Text>
        {copy.notes.map((note, index) => (
          <View key={note} style={s.note}>
            <Text style={s.noteIndex}>{index + 1}.</Text>
            <Text style={s.noteText}>{note}</Text>
          </View>
        ))}

        <Footer />
      </Page>
    </Document>
  );
}
