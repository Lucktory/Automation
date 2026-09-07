import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CalcMethod,
  DataConfidence,
  DestinationCostInput,
  Powertrain,
} from "@/modules/pricing";
import type { QuotingRepositories } from "../domain/ports";

/**
 * Adaptadores Prisma del módulo de cotización.
 * Único sitio donde el esquema se traduce a la entrada del motor.
 */

const num = (value: Prisma.Decimal | null): number => (value === null ? 0 : Number(value));
const nullableNum = (value: Prisma.Decimal | null): number | undefined =>
  value === null ? undefined : Number(value);

/**
 * Métodos de cálculo que el motor sabe evaluar.
 *
 * El esquema admite más (TIERED_BY_VALUE, FORMULA, PER_CBM) porque el admin
 * puede llegar a necesitarlos. Una regla con un método que el motor no entiende
 * se DESCARTA con aviso, nunca se aproxima al más parecido: aproximar un método
 * de cálculo es inventar dinero.
 */
const SUPPORTED_METHODS = new Set<CalcMethod>([
  "FIXED",
  "PER_VEHICLE",
  "PER_CONTAINER",
  "PER_DAY",
  "PERCENT_OF_FOB",
  "PERCENT_OF_CIF",
  "PERCENT_OF_LANDED",
  "PERCENT_OF_SUBTOTAL",
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const FRIDAY = 5;

/**
 * Último día hábil de la semana anterior a `on`.
 *
 * Es la fecha cuya TRM liquida los tributos (Dto 1165/2019 art. 15), no la de
 * hoy. Se aproxima al viernes anterior; los festivos colombianos que caen en
 * viernes desplazarían el día real, así que la SIA confirma la fecha exacta
 * antes de una declaración en firme (SEED-DATA §9 Q3).
 */
export function lastBusinessDayOfPreviousWeek(on: Date): Date {
  const date = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate()));
  // Retroceder hasta el viernes estrictamente anterior a la semana en curso.
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const mondayThisWeek = new Date(date.getTime() - daysSinceMonday * DAY_MS);
  const friday = new Date(mondayThisWeek.getTime() - (7 - FRIDAY + 2) * DAY_MS);
  return friday;
}

export function createQuotingRepositories(db: PrismaClient): QuotingRepositories {
  const vehicleSelect = {
    id: true,
    slug: true,
    modelYear: true,
    powertrain: true,
    originCountryCode: true,
    shipFromCountryCode: true,
    originPortId: true,
    hsCodeId: true,
    fobUsd: true,
    purchasePrice: true,
    trim: {
      select: {
        name: true,
        spec: {
          select: {
            curbWeightKg: true,
            cbm: true,
            bodyType: true,
            rangeKm: true,
            rangeStandard: true,
            horsepowerHp: true,
            seats: true,
          },
        },
        model: { select: { name: true, brand: { select: { name: true } } } },
      },
    },
    images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  } as const;

  type VehicleRow = Prisma.VehicleGetPayload<{ select: typeof vehicleSelect }>;

  const toVehicle = (row: VehicleRow) => ({
    id: row.id,
    slug: row.slug,
    label: `${row.trim.model.brand.name} ${row.trim.model.name} ${row.trim.name}`,
    hsCode: row.hsCodeId ?? "",
    powertrain: row.powertrain as Powertrain,
    originCountry: row.originCountryCode,
    shipFromCountry: row.shipFromCountryCode ?? row.originCountryCode,
    originPortId: row.originPortId,
    modelYear: row.modelYear,
    weightKg: row.trim.spec?.curbWeightKg ?? 0,
    cbm: Number(row.trim.spec?.cbm ?? 0),
    fobUsd: num(row.fobUsd),
    purchasePriceUsd: num(row.purchasePrice),
    imageUrl: row.images[0]?.url ?? null,
    bodyType: row.trim.spec?.bodyType ?? "",
    rangeKm: row.trim.spec?.rangeKm ?? null,
    rangeStandard: row.trim.spec?.rangeStandard ?? null,
    horsepowerHp: row.trim.spec?.horsepowerHp ?? null,
    seats: row.trim.spec?.seats ?? null,
  });

  return {
    vehicles: {
      publishedForQuote: async (limit) => {
        const rows = await db.vehicle.findMany({
          where: { isPublished: true, eligibilityStatus: "ELIGIBLE" },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
          take: limit,
          select: vehicleSelect,
        });
        return rows.map(toVehicle);
      },
      byId: async (id) => {
        const row = await db.vehicle.findUnique({ where: { id }, select: vehicleSelect });
        return row ? toVehicle(row) : null;
      },
    },

    ports: {
      all: async () =>
        db.port.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            unlocode: true,
            name: true,
            countryCode: true,
            isOrigin: true,
            isDestination: true,
            freeDaysDefault: true,
          },
        }),
    },

    freight: {
      modesForRoute: async (parameterSetId, originPortId, destinationPortId, on) => {
        const rows = await db.freightRate.findMany({
          where: {
            parameterSetId,
            originPortId,
            destinationPortId,
            validFrom: { lte: on },
            OR: [{ validTo: null }, { validTo: { gte: on } }],
          },
          distinct: ["mode"],
          select: { mode: true },
        });
        return rows.map((row) => row.mode);
      },

      forRoute: async (parameterSetId, originPortId, destinationPortId, on, mode) => {
        const where: Prisma.FreightRateWhereInput = {
          parameterSetId,
          originPortId,
          destinationPortId,
          validFrom: { lte: on },
          OR: [{ validTo: null }, { validTo: { gte: on } }],
        };
        // Se asigna aparte y no con un spread condicional: con
        // `exactOptionalPropertyTypes` un spread deja la propiedad como
        // `mode?: … | undefined`, que el filtro de Prisma no admite.
        if (mode) where.mode = mode as NonNullable<Prisma.FreightRateWhereInput["mode"]>;

        const row = await db.freightRate.findFirst({
          where,
          orderBy: { validFrom: "desc" },
        });
        if (!row) return null;

        return {
          id: row.id,
          originPortId: row.originPortId,
          destinationPortId: row.destinationPortId,
          mode: row.mode,
          amountUsd: num(row.amountUsd),
          surchargesUsd: num(row.surcharges),
          transitDaysMin: row.transitDaysMin,
          transitDaysMax: row.transitDaysMax,
          vehiclesPerUnit: row.vehiclesPerUnit ?? 1,
          confidence: row.confidence as "VERIFIED" | "ESTIMATED" | "UNVERIFIED",
          verifiedAt: row.verifiedAt,
          staleAfterDays: row.staleAfterDays,
        };
      },
    },

    destination: {
      forSet: async (parameterSetId, portId, on) => {
        const rows = await db.destinationCostRule.findMany({
          where: {
            parameterSetId,
            validFrom: { lte: on },
            OR: [{ validTo: null }, { validTo: { gte: on } }],
            // Reglas del puerto elegido, más las que no dependen de puerto.
            AND: [{ OR: [{ portId: null }, ...(portId ? [{ portId }] : [])] }],
          },
          orderBy: { sortOrder: "asc" },
        });

        const supported = rows.filter((row) =>
          SUPPORTED_METHODS.has(row.method as CalcMethod),
        );

        if (supported.length !== rows.length) {
          console.warn(
            `[quoting] ${rows.length - supported.length} regla(s) de destino usan un método que el motor no evalúa y se descartaron.`,
          );
        }

        return supported.map<DestinationCostInput>((row) => ({
          code: row.code,
          labelKey: `DESTINATION.${row.code}`,
          method: row.method as CalcMethod,
          currency: row.currency === "USD" ? "USD" : "COP",
          amount: num(row.amount),
          ...(row.rate !== null ? { rate: Number(row.rate) } : {}),
          ...(row.minimum !== null ? { minimum: Number(row.minimum) } : {}),
          inExciseBase: row.inExciseBase,
          confidence: row.confidence as DataConfidence,
          ...(row.legalBasis !== null ? { legalBasis: row.legalBasis } : {}),
        }));
      },
    },

    margins: {
      forSet: async (parameterSetId) => {
        const rows = await db.marginRule.findMany({
          where: { parameterSetId },
          orderBy: { sortOrder: "asc" },
        });
        return rows.map((row) => ({
          code: row.code,
          method: row.method,
          rate: row.rate === null ? null : Number(row.rate),
          amount: row.amount === null ? null : Number(row.amount),
          appliesToDepositOnly: row.appliesToDepositOnly,
        }));
      },
    },

    addOns: {
      forSet: async (parameterSetId) => {
        const rows = await db.addOnProduct.findMany({
          where: { parameterSetId, active: true },
          orderBy: { sortOrder: "asc" },
        });
        return rows.map((row) => ({
          code: row.code,
          labelKey: `ADDON.${row.code}`,
          stage: row.stage === "ORIGIN" ? ("ORIGIN" as const) : ("DESTINATION" as const),
          currency: row.currency === "USD" ? ("USD" as const) : ("COP" as const),
          price: num(row.price),
          requiresPowertrain: row.requiresPowertrain as Powertrain[],
        }));
      },
    },

    tariffs: {
      candidatesFor: async (parameterSetId, hsCode) => {
        const rows = await db.tariffRule.findMany({
          where: { parameterSetId, hsCodeValue: hsCode },
        });
        return rows.map((row) => ({
          id: row.id,
          hsCode: row.hsCodeValue,
          originCountry: row.originCountryCode,
          powertrain: row.powertrain as Powertrain | null,
          dutyRate: num(row.dutyRate),
          vatRate: num(row.vatRate),
          exciseRate: num(row.exciseRate),
          dutyBase: row.dutyBase as never,
          vatBase: row.vatBase as never,
          exciseBase: row.exciseBase as never,
          exciseThresholdFobUsd: nullableNum(row.exciseThresholdFobUsd) ?? null,
          exciseRateAboveThreshold: nullableNum(row.exciseRateAboveThreshold) ?? null,
          exciseAppliesOnImport: row.exciseAppliesOnImport,
          requiresOriginCertificate: row.requiresOriginCertificate,
          legalBasis: row.legalBasis,
          confidence: row.confidence as DataConfidence,
          verifiedAt: row.verifiedAt,
          staleAfterDays: row.staleAfterDays,
          validFrom: row.validFrom,
          validTo: row.validTo,
        }));
      },
    },

    fx: {
      snapshot: async (on) => {
        const rateOn = async (date: Date) =>
          db.fxRate.findFirst({
            where: {
              kind: "TRM_DAILY",
              validFrom: { lte: date },
              validTo: { gte: date },
            },
            orderBy: { validFrom: "desc" },
          });

        const commercial = (await rateOn(on)) ?? (await rateOn(new Date()));
        const fiscal = await rateOn(lastBusinessDayOfPreviousWeek(on));

        if (!commercial) {
          // Sin TRM no se cotiza. Un cero aquí produciría una cotización de casi
          // cero con cara de firme.
          throw new Error(
            "No hay TRM disponible para la fecha solicitada. Sincroniza divisas antes de cotizar.",
          );
        }

        const ageDays = Math.max(
          0,
          Math.floor((on.getTime() - commercial.validFrom.getTime()) / DAY_MS),
        );

        return {
          commercial: Number(commercial.rate),
          // Si aún no hay TRM de la semana anterior se usa la comercial y el
          // motor lo marcará; nunca se inventa una tasa.
          fiscal: Number((fiscal ?? commercial).rate),
          date: commercial.validFrom,
          source: commercial.source === "MANUAL" ? "MANUAL" : "AUTO",
          ageDays,
        };
      },
    },
  };
}
