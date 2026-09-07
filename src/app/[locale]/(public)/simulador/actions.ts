"use server";

import { getTranslations } from "next-intl/server";
import { parametersDeps, quoteRepository, quotingRepositories } from "@/composition/container";
import { createMailer, currentUser } from "@/modules/identity/server";
import { prisma } from "@/infra/db/prisma";
import { env } from "@/config/env";

import {
  assembleInput,
  FreightRateNotFoundError,
  TariffRuleNotFoundError,
  quoteProposalMail,
  saveQuote,
  VehicleNotFoundError,
  type LineLabeller,
  type SaveQuoteResult,
  type QuoteSnapshot,
  type SimulationRequest,
} from "@/modules/quoting";
import type { LiquidationInput } from "@/modules/pricing";

/**
 * Re-ensambla la entrada cuando cambia algo que vive en la base de datos.
 *
 * El simulador recalcula solo en el navegador mientras el usuario mueve
 * números, porque el motor es puro. Pero elegir OTRO vehículo, otro puerto u
 * otra modalidad cambia la regla arancelaria, la tarifa de flete y los costos
 * de destino: eso hay que ir a buscarlo. De ahí esta acción, y solo para eso.
 *
 * Devuelve un resultado etiquetado en vez de lanzar: una ruta sin tarifa es un
 * estado normal de la pantalla —hay que decírselo al usuario—, no un fallo del
 * servidor.
 */

export type ResimulateResult =
  | { ok: true; input: LiquidationInput; modes: string[] }
  | { ok: false; reason: "NO_FREIGHT" | "NO_TARIFF" | "NO_VEHICLE" | "NO_SET"; message: string };

export async function resimulate(
  request: SimulationRequest,
): Promise<ResimulateResult> {
  const now = new Date();
  const activeSet = await parametersDeps.sets.active(now);

  if (!activeSet) {
    return {
      ok: false,
      reason: "NO_SET",
      message: "No hay un conjunto de parámetros activo.",
    };
  }

  try {
    const input = await assembleInput(quotingRepositories, activeSet, request);

    const vehicle = await quotingRepositories.vehicles.byId(request.vehicleId);
    const modes = vehicle?.originPortId
      ? await quotingRepositories.freight.modesForRoute(
          activeSet.id,
          vehicle.originPortId,
          request.destinationPortId,
          now,
        )
      : [];

    return { ok: true, input, modes };
  } catch (error) {
    if (error instanceof FreightRateNotFoundError) {
      return { ok: false, reason: "NO_FREIGHT", message: error.message };
    }
    if (error instanceof TariffRuleNotFoundError) {
      return { ok: false, reason: "NO_TARIFF", message: error.message };
    }
    if (error instanceof VehicleNotFoundError) {
      return { ok: false, reason: "NO_VEHICLE", message: error.message };
    }
    throw error;
  }
}

/**
 * Guarda la cotización que el usuario tiene en pantalla.
 *
 * El navegador manda la identidad del conjunto de parámetros con el que calculó
 * y el total que está viendo. El caso de uso rearma con ESE conjunto, recalcula
 * en el servidor y compara: si no coincide, no guarda nada y devuelve las dos
 * cifras. Un precio que el cliente no vio nunca se convierte en oferta.
 */
export async function saveQuoteAction(request: {
  simulation: SimulationRequest;
  parameterSetId: string;
  parameterSetVersion: number;
  expectedTotalCopMinor: string;
  locale: string;
}): Promise<SaveQuoteResult> {
  const user = await currentUser();

  // Las etiquetas se congelan EN LOS DOS IDIOMAS al emitir. El catálogo de
  // mensajes cambia con el tiempo; el documento que el cliente aceptó, no.
  const [es, en] = await Promise.all([
    getTranslations({ locale: "es", namespace: "pricing" }),
    getTranslations({ locale: "en", namespace: "pricing" }),
  ]);

  const textOf = (t: Awaited<ReturnType<typeof getTranslations>>, key: string) => {
    try {
      return t(key);
    } catch {
      return null;
    }
  };

  const label: LineLabeller = (item) => {
    const note = {
      es: textOf(es, `notes.${item.code}`) ?? item.legalBasis ?? null,
      en: textOf(en, `notes.${item.code}`) ?? item.legalBasis ?? null,
    };
    return {
      label: {
        es: textOf(es, `stages.${item.code}`) ?? item.code,
        en: textOf(en, `stages.${item.code}`) ?? item.code,
      },
      note: note.es === null && note.en === null ? null : { es: note.es ?? "", en: note.en ?? "" },
    };
  };

  return saveQuote(
    {
      repos: quotingRepositories,
      quotes: quoteRepository,
      parameterSetById: (id) => parametersDeps.sets.byId(id),
      activeParameterSet: (on) => parametersDeps.sets.active(on),
      label,
      now: () => new Date(),
    },
    {
      simulation: request.simulation,
      parameterSetId: request.parameterSetId,
      parameterSetVersion: request.parameterSetVersion,
      expectedTotalCopMinor: request.expectedTotalCopMinor,
      locale: request.locale,
      customerId: user?.id ?? null,
      createdById: user?.id ?? null,
    },
  );
}

/**
 * Envía la propuesta por correo.
 *
 * Emite la cotización si aún no existe —no se manda un precio que no quedó
 * registrado— y despacha el correo por el puerto `Mailer`. En desarrollo el
 * adaptador es `ConsoleMailer`, así que el envío se ve en la terminal sin
 * necesidad de credenciales: el flujo está COMPLETO aunque el proveedor no esté
 * conectado, que es exactamente para lo que existe el puerto.
 */
export async function emailQuoteAction(request: {
  simulation: SimulationRequest;
  parameterSetId: string;
  parameterSetVersion: number;
  expectedTotalCopMinor: string;
  locale: string;
  /** Destinatario. Si no se da, se usa el correo de la sesión. */
  to?: string;
}): Promise<
  | { ok: true; reference: string; to: string }
  | { ok: false; message: string }
> {
  const user = await currentUser();
  const to = request.to ?? user?.email ?? null;

  if (!to) {
    return { ok: false, message: "No hay destinatario: inicia sesión o indica un correo." };
  }

  const saved = await saveQuoteAction(request);
  if (!saved.ok) {
    return {
      ok: false,
      message:
        saved.reason === "PARAMETERS_CHANGED"
          ? "Los parámetros cambiaron; vuelve a calcular."
          : saved.message,
    };
  }

  const quote = await prisma.quote.findUnique({
    where: { id: saved.quote.id },
    select: { snapshot: true, reference: true },
  });

  if (!quote?.snapshot) {
    return { ok: false, message: "La cotización se guardó sin instantánea." };
  }

  const base = env.AUTH_URL ?? "http://localhost:3000";
  const formatter = new Intl.NumberFormat(request.locale === "es" ? "es-CO" : "en-US", {
    maximumFractionDigits: 0,
  });

  await createMailer().send(
    quoteProposalMail({
      to,
      reference: quote.reference,
      snapshot: quote.snapshot as unknown as QuoteSnapshot,
      pdfUrl: `${base}/api/cotizaciones/${saved.quote.id}/pdf?locale=${request.locale}`,
      locale: request.locale,
      formatTotal: (minor) => `COP ${formatter.format(Number(minor))}`,
    }),
  );

  return { ok: true, reference: quote.reference, to };
}
