import type { LiquidationInput } from "@/modules/pricing";
import { TIMELINE_DEFAULT_DAYS } from "./timeline-defaults";

/**
 * Vehículo de ejemplo del panel "Simular impacto".
 *
 * NO es dato de negocio: es el escenario neutro contra el que se compara un
 * conjunto de parámetros con otro. Lo que importa del panel es la DIFERENCIA
 * entre dos corridas, y para eso el escenario solo tiene que ser estable e
 * idéntico en ambas.
 *
 * Las tarifas no viven aquí: `tariff` se sustituye en cada corrida por la regla
 * que resuelve el conjunto correspondiente.
 */
export const IMPACT_SAMPLE: Omit<LiquidationInput, "tariff"> = {
  vehicle: {
    hsCode: "8703231090",
    powertrain: "GASOLINE",
    originCountry: "CN",
    shipFromCountry: "CN",
    modelYear: 2026,
    hasOriginCertificate: false,
    weightKg: 1520,
    cbm: 15.2,
  },
  origin: {
    purchasePriceUsd: 22_800,
    auctionFeeUsd: 0,
    buyerFeeUsd: 600,
    inlandFreightUsd: 400,
    exportDocsUsd: 300,
    otherUsd: 0,
  },
  freight: {
    containerCostUsd: 8_190,
    surchargesUsd: 980,
    insuranceRate: 0.012,
    insuranceMinimumUsd: 150,
    insuredValueUplift: 0.1,
    transitDays: 36,
    quotedDaysAgo: 0,
    staleAfterDays: 21,
  },
  consolidation: {
    units: [
      { reference: "sample-1", fobUsd: 24_100, weightKg: 1520, cbm: 15.2 },
      { reference: "sample-2", fobUsd: 27_500, weightKg: 1950, cbm: 15.8 },
      { reference: "sample-3", fobUsd: 29_000, weightKg: 1965, cbm: 13.4 },
    ],
    commercialMethod: "BY_CIF_VALUE",
    taxableBaseMethod: "BY_FOB_VALUE",
  },
  destination: [],
  addOns: [],
  commercial: {
    marginRate: 0.12,
    serviceFeeCop: 2_500_000,
    paymentProcessingRate: 0.0265,
    depositCop: 20_000_000,
    gmfRate: 0.004,
  },
  fx: {
    trmCommercial: 3_126.08,
    trmFiscal: 3_126.08,
    trmDate: "2026-09-05",
    trmSource: "AUTO",
    trmAgeDays: 0,
  },
  switches: {
    importerIsEndConsumer: true,
    portDays: 6,
  },
  timeline: {
    ...TIMELINE_DEFAULT_DAYS,
    oceanDays: 36,
  },
};
