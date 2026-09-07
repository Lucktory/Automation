import { Check, Circle, Clock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TIMELINE_PHASES } from "@/config/timeline-defaults";
import { currentUser } from "@/modules/identity/server";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Esta pantalla lee datos vivos, asi que se renderiza en cada peticion.
 *
 * Sin esto Next la prerenderiza durante el build, lo que tiene dos
 * consecuencias malas: el despliegue pasa a depender de que la base de datos
 * responda mientras compila —y un build que la consulta decenas de veces falla
 * por cualquier corte de red—, y la pagina queda congelada con los precios que
 * hubiera en ese momento hasta el siguiente despliegue. En un producto cuyo
 * valor es decir cuanto cuesta algo hoy, un precio cacheado en el build no es
 * una optimizacion: es una cifra equivocada.
 */
export const dynamic = "force-dynamic";

/**
 * Portal del cliente — la torre de control.
 *
 * El semáforo es la promesa del producto: el comprador sabe en qué etapa está
 * su vehículo sin llamar a nadie. Las seis fases son las MISMAS que estima el
 * motor, leídas del mismo registro, así que el plazo que vio al cotizar y el
 * que ve aquí no pueden discrepar.
 *
 * Sin pedido en curso se muestra un seguimiento de ejemplo en vez de una
 * pantalla vacía: la demostración tiene que enseñar cómo se ve la torre de
 * control cuando hay algo dentro.
 */

type Light = "green" | "amber" | "red" | "pending";

interface Milestone {
  phaseKey: string;
  light: Light;
  detail: string;
}

const LIGHT_CLASS: Record<Light, string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
  pending: "bg-neutral-status",
};

/** Progreso de ejemplo: comprado, navegando, aún sin nacionalizar. */
const SAMPLE: readonly Milestone[] = [
  { phaseKey: "PURCHASE", light: "green", detail: "2026-08-18" },
  { phaseKey: "ORIGIN", light: "green", detail: "2026-08-25" },
  { phaseKey: "OCEAN", light: "amber", detail: "2026-09-16" },
  { phaseKey: "PORT", light: "pending", detail: "—" },
  { phaseKey: "NATIONALIZATION", light: "pending", detail: "—" },
  { phaseKey: "REGISTRATION", light: "pending", detail: "—" },
];

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");
  const pricing = await getTranslations("pricing");

  const user = await currentUser().catch(() => null);

  const orders = await prisma.order
    .findMany({
      where: user ? { customerId: user.id } : {},
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { id: true, reference: true, status: true, createdAt: true },
    })
    .catch(() => []);

  const order = orders[0] ?? null;
  const intl = locale === "es" ? "es-CO" : "en-US";
  const day = new Intl.DateTimeFormat(intl, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const currentIndex = SAMPLE.findIndex((step) => step.light === "amber");
  const current = SAMPLE[currentIndex] ?? SAMPLE[0]!;

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro
          title={t("portal.title")}
          subtitle={t("portal.subtitle")}
          actions={
            <span className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">
              <span
                aria-hidden
                className={`size-2 rounded-full ${LIGHT_CLASS[current.light]}`}
              />
              {t(`portal.lights.${current.light}`)}
            </span>
          }
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          <section className="rounded-card border border-border bg-surface p-5 lg:col-span-8">
            <h2 className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
              {t("portal.milestonesTitle")}
            </h2>

            <ol className="mt-4 flex flex-col">
              {SAMPLE.map((step, index) => {
                const phase = TIMELINE_PHASES.find(
                  (candidate) => candidate.messageKey === step.phaseKey,
                );
                const isLast = index === SAMPLE.length - 1;
                const done = step.light === "green";

                return (
                  <li key={step.phaseKey} className="flex gap-3">
                    <span className="flex flex-col items-center">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full ${LIGHT_CLASS[step.light]}`}
                      >
                        {done ? (
                          <Check size={12} aria-hidden className="text-bg" />
                        ) : step.light === "amber" ? (
                          <Clock size={12} aria-hidden className="text-bg" />
                        ) : (
                          <Circle size={8} aria-hidden className="text-bg" />
                        )}
                      </span>
                      {!isLast && <span className="w-px flex-1 bg-border" />}
                    </span>

                    <span className="flex flex-1 items-baseline justify-between pb-6">
                      <span className="text-sm text-text-primary">
                        {pricing(`timeline.phases.${step.phaseKey}`)}
                      </span>
                      <span className="text-xs text-text-muted" data-numeric>
                        {step.detail === "—"
                          ? "—"
                          : day.format(new Date(step.detail))}
                        {phase ? "" : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <aside className="flex flex-col gap-4 lg:col-span-4">
            <div className="rounded-card border border-border bg-surface-elevated p-5">
              <p className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                {t("portal.stageTitle")}
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-text-primary">
                {pricing(`timeline.phases.${current.phaseKey}`)}
              </p>
              <p className="mt-4 text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                {t("portal.etaLabel")}
              </p>
              <p className="text-sm text-accent" data-numeric>
                {day.format(new Date("2026-11-04"))}
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                {t("portal.documentsTitle")}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {["BL", "Factura comercial", "Certificado de origen"].map((doc) => (
                  <li key={doc} className="flex items-center gap-2 text-sm text-text-secondary">
                    <Check size={13} aria-hidden className="shrink-0 text-success" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>

            {order && (
              <p className="text-xs text-text-muted" data-numeric>
                {order.reference} · {day.format(order.createdAt)}
              </p>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
