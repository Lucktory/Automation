/**
 * Seed — datos verificados para el motor de liquidación.
 *
 * REGLA: solo se siembra lo que está en docs/SEED-DATA.md con confianza alta.
 * Lo que no está verificado se siembra con `confidence: UNVERIFIED`, de modo que
 * el motor lo marque y NO cotice en firme. Nunca se inventa una cifra para
 * rellenar un hueco: un número que el importador reconoce como falso cuesta más
 * que un hueco declarado.
 *
 * Fecha de corte de los datos: 2026-09-05.
 */

import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config as loadEnv } from "dotenv";
import ws from "ws";
import {
  PrismaClient,
  BodyType,
  CalcMethod,
  CostCategory,
  Currency,
  DataConfidence,
  DriveType,
  EligibilityStatus,
  EmissionStandard,
  FreightBasis,
  FreightMode,
  FxRateKind,
  FxSource,
  ImportRegime,
  ParameterSetStatus,
  Powertrain,
  RangeStandard,
  Role,
  TaxBaseKind,
  Transmission,
  UpdateMode,
  UserStatus,
  VehicleCondition,
  VehicleStatus,
} from "@prisma/client";

/**
 * El seed usa el MISMO adaptador que la aplicación —el driver serverless de
 * Neon— porque el motor nativo de Prisma aborta en esta máquina. Ver el
 * comentario de `src/infra/db/prisma.ts`.
 */
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida. Cópiala en .env.local.");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

// ---------------------------------------------------------------------------
// 1. Geografía
// ---------------------------------------------------------------------------

const COUNTRIES = [
  { code: "CO", code3: "COL", nameEs: "Colombia", nameEn: "Colombia", region: "SOUTH_AMERICA", isOriginHub: false, flagEmoji: "🇨🇴", mapLat: 4.711, mapLng: -74.0721 },
  { code: "US", code3: "USA", nameEs: "Estados Unidos", nameEn: "United States", region: "NORTH_AMERICA", isOriginHub: true, flagEmoji: "🇺🇸", mapLat: 38.9072, mapLng: -77.0369 },
  { code: "CN", code3: "CHN", nameEs: "China", nameEn: "China", region: "ASIA", isOriginHub: true, flagEmoji: "🇨🇳", mapLat: 31.2304, mapLng: 121.4737 },
  { code: "AE", code3: "ARE", nameEs: "Emiratos Árabes Unidos", nameEn: "United Arab Emirates", region: "MIDDLE_EAST", isOriginHub: true, flagEmoji: "🇦🇪", mapLat: 25.2048, mapLng: 55.2708 },
  { code: "DE", code3: "DEU", nameEs: "Alemania", nameEn: "Germany", region: "EUROPE", isOriginHub: true, flagEmoji: "🇩🇪", mapLat: 53.0793, mapLng: 8.8017 },
  { code: "BE", code3: "BEL", nameEs: "Bélgica", nameEn: "Belgium", region: "EUROPE", isOriginHub: true, flagEmoji: "🇧🇪", mapLat: 51.2194, mapLng: 4.4025 },
  { code: "CA", code3: "CAN", nameEs: "Canadá", nameEn: "Canada", region: "NORTH_AMERICA", isOriginHub: true, flagEmoji: "🇨🇦", mapLat: 44.6488, mapLng: -63.5752 },
  { code: "MX", code3: "MEX", nameEs: "México", nameEn: "Mexico", region: "NORTH_AMERICA", isOriginHub: true, flagEmoji: "🇲🇽", mapLat: 19.4326, mapLng: -99.1332 },
  { code: "KR", code3: "KOR", nameEs: "Corea del Sur", nameEn: "South Korea", region: "ASIA", isOriginHub: true, flagEmoji: "🇰🇷", mapLat: 35.1796, mapLng: 129.0756 },
  { code: "JP", code3: "JPN", nameEs: "Japón", nameEn: "Japan", region: "ASIA", isOriginHub: true, flagEmoji: "🇯🇵", mapLat: 35.6762, mapLng: 139.6503 },
  // País de la MARCA, no de fabricación: el Volvo EX30 es sueco de marca y se
  // fabrica en Bélgica. Es exactamente la distinción que decide el TLC.
  { code: "SE", code3: "SWE", nameEs: "Suecia", nameEn: "Sweden", region: "EUROPE", isOriginHub: false, flagEmoji: "🇸🇪", mapLat: 57.7089, mapLng: 11.9746 },
];

const PORTS = [
  { unlocode: "COBUN", name: "Buenaventura", countryCode: "CO", isOrigin: false, isDestination: true, lat: 3.8801, lng: -77.0313, freeDaysDefault: 3, notes: "Operando degradado desde el sismo M7,4 del 10-ago-2026 (~5 días de retraso)." },
  { unlocode: "COCTG", name: "Cartagena", countryCode: "CO", isOrigin: false, isDestination: true, lat: 10.3997, lng: -75.5144, freeDaysDefault: 3, notes: "Terminal CONTECAR. Sin retrasos reportados." },
  { unlocode: "CNSHA", name: "Shanghái", countryCode: "CN", isOrigin: true, isDestination: false, lat: 31.2304, lng: 121.4737 },
  { unlocode: "USLAX", name: "Los Ángeles", countryCode: "US", isOrigin: true, isDestination: false, lat: 33.7406, lng: -118.2716 },
  { unlocode: "USNYC", name: "Nueva York / Newark", countryCode: "US", isOrigin: true, isDestination: false, lat: 40.6895, lng: -74.1745 },
  { unlocode: "AEJEA", name: "Jebel Ali (Dubái)", countryCode: "AE", isOrigin: true, isDestination: false, lat: 25.0111, lng: 55.0614 },
  { unlocode: "DEBRV", name: "Bremerhaven", countryCode: "DE", isOrigin: true, isDestination: false, lat: 53.5396, lng: 8.5809 },
  { unlocode: "CAHAL", name: "Halifax", countryCode: "CA", isOrigin: true, isDestination: false, lat: 44.6488, lng: -63.5752 },
];

const AGREEMENTS = [
  { code: "TLC_USA", name: "TLC Colombia – Estados Unidos", legalBasis: "Ley 1143 de 2007", inForceFrom: d("2012-05-15"), originProofType: "AUTOCERTIFICACION", countries: ["US"] },
  { code: "TLC_CANADA", name: "TLC Colombia – Canadá", legalBasis: "Ley 1363 de 2009", inForceFrom: d("2011-08-15"), originProofType: "CERTIFICADO_DE_ORIGEN", countries: ["CA"] },
  { code: "TLC_UE", name: "Acuerdo Comercial Colombia – Unión Europea", legalBasis: "Decreto 1513 de 2013", inForceFrom: d("2013-08-01"), originProofType: "DECLARACION_DE_ORIGEN", countries: ["DE", "BE"] },
  { code: "ACE_33_MEX", name: "ACE 33 Colombia – México", legalBasis: "ACE 33 (antiguo G-3)", inForceFrom: d("1995-01-01"), originProofType: "CERTIFICADO_DE_ORIGEN", countries: ["MX"] },
  { code: "TLC_COREA", name: "TLC Colombia – Corea del Sur", legalBasis: "Ley 1747 de 2014", inForceFrom: d("2016-07-15"), originProofType: "CERTIFICADO_DE_ORIGEN", countries: ["KR"] },
];

/** Las 13 subpartidas de combustión que el Dto 1432 de 2025 llevó de 35% a 40%. */
const HS_COMBUSTION_40 = [
  "8703210090", "8703221090", "8703229090", "8703231090", "8703239090",
  "8703241090", "8703249090", "8703311000", "8703319000", "8703321000",
  "8703329000", "8703331000", "8703339000",
];

const HS_CODES = [
  ...HS_COMBUSTION_40.map((code) => ({
    code,
    formatted: `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6, 8)}.${code.slice(8, 10)}`,
    description: "Automóviles de turismo con motor de combustión interna",
    chapter: "87",
    heading: code.slice(0, 4),
    unitOfMeasure: "U",
    notes: "Arancel 40% NMF desde 2026-01-10 (Dto 1432 de 2025 art. 1).",
  })),
  { code: "8703801000", formatted: "8703.80.10.00", description: "Automóviles de turismo únicamente con motor eléctrico", chapter: "87", heading: "8703", unitOfMeasure: "U", notes: "BEV. Arancel 0%, IVA 5% (ET 468-1), impoconsumo NO causado (ET 512-5 num. 8)." },
  { code: "8703400090", formatted: "8703.40.00.90", description: "Vehículos híbridos no enchufables (HEV)", chapter: "87", heading: "8703", unitOfMeasure: "U", notes: "PENDIENTE: tarifa arancelaria en consulta con la SIA (Q1 de SEED-DATA §9)." },
  { code: "8703600090", formatted: "8703.60.00.90", description: "Vehículos híbridos enchufables (PHEV)", chapter: "87", heading: "8703", unitOfMeasure: "U", notes: "PENDIENTE: tarifa arancelaria en consulta con la SIA (Q1 de SEED-DATA §9)." },
];

// ---------------------------------------------------------------------------
// 2. Catálogo de demostración
// ---------------------------------------------------------------------------

interface SeedVehicle {
  brand: string;
  brandCountry: string;
  model: string;
  bodyType: BodyType;
  trim: string;
  modelYear: number;
  factoryCountry: string;
  shipFrom: string;
  originPort: string;
  hsCode: string;
  msrpUsd: number;
  fobUsd: number;
  color: string;
  featured?: boolean;
  spec: {
    powertrain: Powertrain;
    transmission: Transmission;
    driveType: DriveType;
    engineDisplacementCc?: number;
    horsepowerHp: number;
    torqueNm: number;
    batteryKwh?: number;
    rangeKm?: number;
    rangeStandard?: RangeStandard;
    chargeDcKw?: number;
    seats: number;
    doors: number;
    curbWeightKg: number;
    cbm: number;
    emissionStandard: EmissionStandard;
    topSpeedKph: number;
    zeroToHundredS: number;
  };
}

const VEHICLES: SeedVehicle[] = [
  {
    brand: "BYD", brandCountry: "CN", model: "Seal", bodyType: BodyType.SEDAN,
    trim: "Excellence AWD", modelYear: 2026, factoryCountry: "CN", shipFrom: "CN",
    originPort: "CNSHA", hsCode: "8703801000", msrpUsd: 34500, fobUsd: 32000,
    color: "Atlantis Grey", featured: true,
    spec: { powertrain: Powertrain.BEV, transmission: Transmission.SINGLE_SPEED, driveType: DriveType.AWD, horsepowerHp: 530, torqueNm: 670, batteryKwh: 82.5, rangeKm: 520, rangeStandard: RangeStandard.CLTC, chargeDcKw: 150, seats: 5, doors: 4, curbWeightKg: 2185, cbm: 14.2, emissionStandard: EmissionStandard.NOT_APPLICABLE, topSpeedKph: 180, zeroToHundredS: 3.8 },
  },
  {
    brand: "BYD", brandCountry: "CN", model: "Song Plus", bodyType: BodyType.SUV,
    trim: "EV Flagship", modelYear: 2026, factoryCountry: "CN", shipFrom: "CN",
    originPort: "CNSHA", hsCode: "8703801000", msrpUsd: 29800, fobUsd: 27500,
    color: "Harbour Grey",
    spec: { powertrain: Powertrain.BEV, transmission: Transmission.SINGLE_SPEED, driveType: DriveType.FWD, horsepowerHp: 201, torqueNm: 310, batteryKwh: 71.8, rangeKm: 520, rangeStandard: RangeStandard.CLTC, chargeDcKw: 115, seats: 5, doors: 5, curbWeightKg: 1950, cbm: 15.8, emissionStandard: EmissionStandard.NOT_APPLICABLE, topSpeedKph: 175, zeroToHundredS: 8.5 },
  },
  {
    brand: "Zeekr", brandCountry: "CN", model: "X", bodyType: BodyType.CROSSOVER,
    trim: "Privilege AWD", modelYear: 2026, factoryCountry: "CN", shipFrom: "CN",
    originPort: "CNSHA", hsCode: "8703801000", msrpUsd: 31200, fobUsd: 29000,
    color: "Nordic Blue", featured: true,
    spec: { powertrain: Powertrain.BEV, transmission: Transmission.SINGLE_SPEED, driveType: DriveType.AWD, horsepowerHp: 428, torqueNm: 543, batteryKwh: 66, rangeKm: 470, rangeStandard: RangeStandard.CLTC, chargeDcKw: 150, seats: 5, doors: 5, curbWeightKg: 1965, cbm: 13.4, emissionStandard: EmissionStandard.NOT_APPLICABLE, topSpeedKph: 190, zeroToHundredS: 3.7 },
  },
  {
    brand: "Tesla", brandCountry: "US", model: "Model 3", bodyType: BodyType.SEDAN,
    trim: "Long Range AWD", modelYear: 2026, factoryCountry: "US", shipFrom: "US",
    originPort: "USLAX", hsCode: "8703801000", msrpUsd: 42500, fobUsd: 41000,
    color: "Stealth Grey", featured: true,
    spec: { powertrain: Powertrain.BEV, transmission: Transmission.SINGLE_SPEED, driveType: DriveType.AWD, horsepowerHp: 394, torqueNm: 493, batteryKwh: 79, rangeKm: 629, rangeStandard: RangeStandard.EPA, chargeDcKw: 250, seats: 5, doors: 4, curbWeightKg: 1830, cbm: 13.9, emissionStandard: EmissionStandard.NOT_APPLICABLE, topSpeedKph: 201, zeroToHundredS: 4.4 },
  },
  {
    brand: "Kia", brandCountry: "KR", model: "EV6", bodyType: BodyType.CROSSOVER,
    trim: "GT-Line AWD 77.4 kWh", modelYear: 2026, factoryCountry: "KR", shipFrom: "KR",
    originPort: "CNSHA", hsCode: "8703801000", msrpUsd: 48900, fobUsd: 46500,
    color: "Runway Red",
    spec: { powertrain: Powertrain.BEV, transmission: Transmission.SINGLE_SPEED, driveType: DriveType.AWD, horsepowerHp: 320, torqueNm: 605, batteryKwh: 77.4, rangeKm: 490, rangeStandard: RangeStandard.WLTP, chargeDcKw: 240, seats: 5, doors: 5, curbWeightKg: 2095, cbm: 14.6, emissionStandard: EmissionStandard.NOT_APPLICABLE, topSpeedKph: 188, zeroToHundredS: 5.2 },
  },
  {
    brand: "Volvo", brandCountry: "SE", model: "EX30", bodyType: BodyType.SUV,
    trim: "Ultra Twin Motor", modelYear: 2026, factoryCountry: "BE", shipFrom: "BE",
    originPort: "DEBRV", hsCode: "8703801000", msrpUsd: 45200, fobUsd: 43000,
    color: "Cloud Blue",
    spec: { powertrain: Powertrain.BEV, transmission: Transmission.SINGLE_SPEED, driveType: DriveType.AWD, horsepowerHp: 428, torqueNm: 543, batteryKwh: 69, rangeKm: 450, rangeStandard: RangeStandard.WLTP, chargeDcKw: 153, seats: 5, doors: 5, curbWeightKg: 1850, cbm: 13.1, emissionStandard: EmissionStandard.NOT_APPLICABLE, topSpeedKph: 180, zeroToHundredS: 3.6 },
  },
  {
    brand: "Chevrolet", brandCountry: "US", model: "Captiva", bodyType: BodyType.SUV,
    trim: "Premier 1.5T", modelYear: 2026, factoryCountry: "CN", shipFrom: "CN",
    originPort: "CNSHA", hsCode: "8703231090", msrpUsd: 24500, fobUsd: 22800,
    color: "Summit White",
    spec: { powertrain: Powertrain.GASOLINE, transmission: Transmission.CVT, driveType: DriveType.FWD, engineDisplacementCc: 1499, horsepowerHp: 145, torqueNm: 230, seats: 7, doors: 5, curbWeightKg: 1520, cbm: 15.2, emissionStandard: EmissionStandard.CHINA_6, topSpeedKph: 180, zeroToHundredS: 11.2 },
  },
  {
    brand: "Jetour", brandCountry: "CN", model: "Dashing", bodyType: BodyType.SUV,
    trim: "Flagship 1.6T", modelYear: 2026, factoryCountry: "CN", shipFrom: "CN",
    originPort: "CNSHA", hsCode: "8703239090", msrpUsd: 21900, fobUsd: 20400,
    color: "Phantom Black",
    spec: { powertrain: Powertrain.GASOLINE, transmission: Transmission.DCT, driveType: DriveType.FWD, engineDisplacementCc: 1598, horsepowerHp: 197, torqueNm: 290, seats: 5, doors: 5, curbWeightKg: 1560, cbm: 14.8, emissionStandard: EmissionStandard.CHINA_6, topSpeedKph: 195, zeroToHundredS: 8.1 },
  },
  {
    brand: "Mazda", brandCountry: "JP", model: "CX-5", bodyType: BodyType.SUV,
    trim: "Signature AWD 2.5", modelYear: 2026, factoryCountry: "JP", shipFrom: "JP",
    originPort: "CNSHA", hsCode: "8703239090", msrpUsd: 33800, fobUsd: 31500,
    color: "Soul Red Crystal",
    spec: { powertrain: Powertrain.GASOLINE, transmission: Transmission.AUTOMATIC, driveType: DriveType.AWD, engineDisplacementCc: 2488, horsepowerHp: 187, torqueNm: 252, seats: 5, doors: 5, curbWeightKg: 1690, cbm: 15.4, emissionStandard: EmissionStandard.EURO_6D, topSpeedKph: 195, zeroToHundredS: 9.1 },
  },
  {
    brand: "Toyota", brandCountry: "JP", model: "Corolla Cross", bodyType: BodyType.CROSSOVER,
    trim: "Hybrid XSE AWD", modelYear: 2026, factoryCountry: "JP", shipFrom: "JP",
    originPort: "CNSHA", hsCode: "8703400090", msrpUsd: 31500, fobUsd: 29200,
    color: "Wind Chill Pearl",
    spec: { powertrain: Powertrain.HEV, transmission: Transmission.CVT, driveType: DriveType.AWD, engineDisplacementCc: 1987, horsepowerHp: 196, torqueNm: 206, seats: 5, doors: 5, curbWeightKg: 1610, cbm: 14.9, emissionStandard: EmissionStandard.EURO_6D, topSpeedKph: 180, zeroToHundredS: 8.0 },
  },
];

// ---------------------------------------------------------------------------
// 3. Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("Sembrando Automoción OS…\n");

  // --- Geografía -----------------------------------------------------------
  for (const c of COUNTRIES) {
    await prisma.country.upsert({ where: { code: c.code }, update: c, create: c });
  }
  console.log(`  países ................ ${COUNTRIES.length}`);

  for (const p of PORTS) {
    await prisma.port.upsert({ where: { unlocode: p.unlocode }, update: p, create: p });
  }
  console.log(`  puertos ............... ${PORTS.length}`);

  for (const a of AGREEMENTS) {
    const { countries, ...rest } = a;
    const agreement = await prisma.tradeAgreement.upsert({
      where: { code: a.code },
      update: rest,
      create: rest,
    });
    for (const countryCode of countries) {
      await prisma.tradeAgreementCountry.upsert({
        where: { agreementId_countryCode: { agreementId: agreement.id, countryCode } },
        update: {},
        create: { agreementId: agreement.id, countryCode },
      });
    }
  }
  console.log(`  acuerdos comerciales .. ${AGREEMENTS.length}`);

  for (const h of HS_CODES) {
    await prisma.hsCode.upsert({
      where: { code: h.code },
      update: { ...h, verifiedAt: d("2026-09-05"), verifiedBy: "investigación verificada" },
      create: { ...h, verifiedAt: d("2026-09-05"), verifiedBy: "investigación verificada" },
    });
  }
  console.log(`  subpartidas ........... ${HS_CODES.length}`);

  // --- Divisas -------------------------------------------------------------
  // TRM verificada en vivo el 2026-09-05 contra datos.gov.co (dataset 32sa-8pi3).
  await prisma.fxRate.upsert({
    where: {
      kind_base_quote_validFrom: {
        kind: FxRateKind.TRM_DAILY,
        base: Currency.USD,
        quote: Currency.COP,
        validFrom: d("2026-09-05"),
      },
    },
    update: {},
    create: {
      kind: FxRateKind.TRM_DAILY,
      base: Currency.USD,
      quote: Currency.COP,
      rate: "3126.08",
      validFrom: d("2026-09-05"),
      validTo: d("2026-09-08"),
      source: FxSource.DATOS_GOV_CO,
      sourceRef: "datos.gov.co/resource/32sa-8pi3.json",
    },
  });
  console.log("  TRM ................... 3.126,08 (2026-09-05 → 09-08)");

  // --- Conjunto de parámetros ---------------------------------------------
  const set = await prisma.pricingParameterSet.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      label: "Conjunto inicial verificado",
      status: ParameterSetStatus.ACTIVE,
      validFrom: d("2026-09-05"),
      publishedAt: new Date(),
      notes:
        "Sembrado desde docs/SEED-DATA.md. Solo filas de confianza alta. Las reglas " +
        "de híbridos quedan UNVERIFIED hasta que la SIA responda Q1/Q2.",
    },
  });
  console.log(`  conjunto de parámetros  v${set.version} (${set.status})`);

  await prisma.tariffRule.deleteMany({ where: { parameterSetId: set.id } });

  const verified = {
    confidence: DataConfidence.VERIFIED,
    updateMode: UpdateMode.MANUAL,
    verifiedAt: d("2026-09-05"),
    verifiedBy: "investigación verificada",
    validFrom: d("2026-01-10"),
  };

  const tariffRules = [
    // Combustión, orígenes SIN acuerdo → 40% NMF desde 2026-01-10.
    ...HS_COMBUSTION_40.flatMap((hsCodeValue) =>
      ["CN", "JP", "AE"].map((originCountryCode) => ({
        parameterSetId: set.id,
        hsCodeValue,
        originCountryCode,
        dutyRate: "0.400000",
        vatRate: "0.190000",
        exciseRate: "0.080000",
        exciseThresholdFobUsd: "30000.00",
        exciseRateAboveThreshold: "0.160000",
        dutyBase: TaxBaseKind.CIF,
        vatBase: TaxBaseKind.CIF_PLUS_ARANCEL,
        exciseBase: TaxBaseKind.TOTAL_VALUE_EXCL_IVA,
        legalBasis: "Dto 1432 de 2025 art. 1 (D.O. 53.347) · IVA ET art. 468 · INC ET arts. 512-3 y 512-4",
        ...verified,
      })),
    ),
    // Combustión con TLC y certificado de origen → 0%.
    ...HS_COMBUSTION_40.flatMap((hsCodeValue) =>
      ["US", "CA", "DE", "BE"].map((originCountryCode) => ({
        parameterSetId: set.id,
        hsCodeValue,
        originCountryCode,
        dutyRate: "0.000000",
        vatRate: "0.190000",
        exciseRate: "0.080000",
        exciseThresholdFobUsd: "30000.00",
        exciseRateAboveThreshold: "0.160000",
        dutyBase: TaxBaseKind.CIF,
        vatBase: TaxBaseKind.CIF_PLUS_ARANCEL,
        exciseBase: TaxBaseKind.TOTAL_VALUE_EXCL_IVA,
        requiresOriginCertificate: true,
        legalBasis: "Desgravación completa TLC (EE.UU. 2022 · Canadá 2020 · UE 2021). Exige certificado de origen y expedición directa.",
        ...verified,
      })),
    ),
    // BEV — cualquier origen. Arancel 0%, IVA 5%, impoconsumo NO causado.
    {
      parameterSetId: set.id,
      hsCodeValue: "8703801000",
      originCountryCode: null,
      powertrain: Powertrain.BEV,
      dutyRate: "0.000000",
      vatRate: "0.050000",
      exciseRate: "0.000000",
      dutyBase: TaxBaseKind.CIF,
      vatBase: TaxBaseKind.CIF_PLUS_ARANCEL,
      exciseBase: TaxBaseKind.TOTAL_VALUE_EXCL_IVA,
      exciseAppliesOnImport: false,
      legalBasis: "Arancel 0% régimen de vehículos eléctricos · IVA 5% ET art. 468-1 · impoconsumo excluido ET art. 512-5 num. 8",
      ...verified,
      staleAfterDays: 90,
    },
    // Híbridos — NO VERIFICADO. Existe la fila para que sea visible en el admin,
    // pero con confianza UNVERIFIED el motor no cotiza en firme.
    ...["8703400090", "8703600090"].map((hsCodeValue) => ({
      parameterSetId: set.id,
      hsCodeValue,
      originCountryCode: null,
      dutyRate: "0.400000",
      vatRate: "0.050000",
      exciseRate: "0.080000",
      exciseThresholdFobUsd: "30000.00",
      exciseRateAboveThreshold: "0.160000",
      dutyBase: TaxBaseKind.CIF,
      vatBase: TaxBaseKind.CIF_PLUS_ARANCEL,
      exciseBase: TaxBaseKind.TOTAL_VALUE_EXCL_IVA,
      legalBasis: "PENDIENTE DE CONFIRMACIÓN — Dto 1550 de 2024 derogó el cupo del 5%. Arancel sembrado en el lado conservador. Ver SEED-DATA §9 Q1/Q2.",
      confidence: DataConfidence.UNVERIFIED,
      updateMode: UpdateMode.MANUAL,
      validFrom: d("2026-01-10"),
      staleAfterDays: 30,
    })),
  ];

  await prisma.tariffRule.createMany({ data: tariffRules as never });
  console.log(`  reglas arancelarias ... ${tariffRules.length} (${tariffRules.filter((r) => r.confidence === DataConfidence.UNVERIFIED).length} sin verificar)`);

  // --- Fletes --------------------------------------------------------------
  const portId = async (unlocode: string) =>
    (await prisma.port.findUniqueOrThrow({ where: { unlocode } })).id;

  //  es cuándo se comprobó la cifra por última vez, y no todas se
  // comprueban a la vez: las rutas por las que hoy no llega ningún vehículo del
  // catálogo llevan semanas sin repasarse, que es exactamente lo que el panel
  // de control debe denunciar en ámbar. Poner todas al día sería más cómodo y
  // menos cierto.
  const freightRoutes = [
    { from: "CNSHA", to: "COBUN", amountUsd: "8190.00", surcharges: "980.00", min: 32, max: 40, verifiedOn: "2026-09-05" },
    { from: "CNSHA", to: "COCTG", amountUsd: "9400.00", surcharges: "1120.00", min: 38, max: 46, verifiedOn: "2026-09-05" },
    { from: "USLAX", to: "COBUN", amountUsd: "3100.00", surcharges: "620.00", min: 16, max: 22, verifiedOn: "2026-09-05" },
    { from: "USNYC", to: "COCTG", amountUsd: "2450.00", surcharges: "540.00", min: 9, max: 14, verifiedOn: "2026-09-05" },
    { from: "DEBRV", to: "COCTG", amountUsd: "3350.00", surcharges: "700.00", min: 18, max: 24, verifiedOn: "2026-09-05" },
    // Sin vehículos publicados por estas dos rutas: nadie las ha vuelto a mirar.
    { from: "AEJEA", to: "COCTG", amountUsd: "5600.00", surcharges: "890.00", min: 30, max: 38, verifiedOn: "2026-08-02" },
    { from: "CAHAL", to: "COCTG", amountUsd: "2900.00", surcharges: "600.00", min: 12, max: 18, verifiedOn: "2026-07-28" },
  ];

  await prisma.freightRate.deleteMany({ where: { parameterSetId: set.id } });
  for (const r of freightRoutes) {
    await prisma.freightRate.create({
      data: {
        parameterSetId: set.id,
        originPortId: await portId(r.from),
        destinationPortId: await portId(r.to),
        mode: FreightMode.CONTAINER_40HC,
        basis: FreightBasis.PER_CONTAINER,
        amountUsd: r.amountUsd,
        surcharges: r.surcharges,
        transitDaysMin: r.min,
        transitDaysMax: r.max,
        vehiclesPerUnit: 3,
        maxPayloadKg: "26400.00",
        confidence: DataConfidence.ESTIMATED,
        updateMode: UpdateMode.ASSISTED,
        staleAfterDays: 21,
        // Cuándo se comprobó la cifra, no desde cuándo rige. La vigencia de una
        // cotización se cuenta desde AQUÍ: sin este sello el motor no sabe si la
        // tarifa está fresca y —correctamente— concede cero días de validez, así
        // que toda cotización nacería vencida.
        verifiedAt: d(r.verifiedOn),
        validFrom: d("2026-09-01"),
        sourceRef: "Referencia de mercado sep-2026. RECOTIZAR ANTES DE COMPROMETER PRECIO.",
        notes: "Asia–WCSA se multiplicó por 2,5 entre abr y sep de 2026.",
      },
    });
  }
  console.log(`  tarifas de flete ...... ${freightRoutes.length} (todas ESTIMATED, vencen a 21 días)`);

  // --- Costos de destino ---------------------------------------------------
  const bun = await portId("COBUN");
  const ctg = await portId("COCTG");

  const destinationCosts = [
    { code: "PORT_UIP_CTG", category: CostCategory.PORT_DESTINATION, labelEs: "Uso de instalaciones portuarias", labelEn: "Port facility use", method: CalcMethod.PER_CONTAINER, currency: Currency.USD, amount: "208.00", portId: ctg, legalBasis: "Tarifario CONTECAR vig. 11-may-2026", confidence: DataConfidence.VERIFIED },
    { code: "PORT_UIP_BUN", category: CostCategory.PORT_DESTINATION, labelEs: "Uso de instalaciones portuarias", labelEn: "Port facility use", method: CalcMethod.PER_VEHICLE, currency: Currency.USD, amount: "75.00", portId: bun, legalBasis: "Tarifario SPRBUN vig. 05-ene-2026", confidence: DataConfidence.VERIFIED },
    { code: "STORAGE_CTG", category: CostCategory.STORAGE_DEMURRAGE, labelEs: "Almacenaje portuario", labelEn: "Port storage", method: CalcMethod.PER_DAY, currency: Currency.USD, amount: "7.75", portId: ctg, legalBasis: "Tarifario CONTECAR — tarifa plana <20 m³", confidence: DataConfidence.VERIFIED },
    { code: "STORAGE_BUN", category: CostCategory.STORAGE_DEMURRAGE, labelEs: "Almacenaje portuario", labelEn: "Port storage", method: CalcMethod.PER_DAY, currency: Currency.USD, amount: "8.00", portId: bun, legalBasis: "Tarifario SPRBUN — bracket ≤19,9 m³ días 6-10", confidence: DataConfidence.VERIFIED },
    { code: "BROKERAGE", category: CostCategory.CUSTOMS_BROKER, labelEs: "Agenciamiento aduanero", labelEn: "Customs brokerage", method: CalcMethod.PERCENT_OF_CIF, currency: Currency.COP, rate: "0.007000", minimum: "1500000.00", legalBasis: "Referencia de mercado 0,4%-1,0% del CIF. PENDIENTE: tarifa real de la SIA (SEED-DATA §9 Q7).", confidence: DataConfidence.UNVERIFIED, inExciseBase: true },
    { code: "VUCE", category: CostCategory.VUCE, labelEs: "Registro de importación VUCE", labelEn: "VUCE import registration", method: CalcMethod.PER_VEHICLE, currency: Currency.COP, amount: "0.00", legalBasis: "Visto bueno ANLA en VUCE: COP 0 si ya existe CEPD utilizable", confidence: DataConfidence.ESTIMATED },
    { code: "ANLA_CEPD", category: CostCategory.ENVIRONMENTAL, labelEs: "Certificado de emisiones (CEPD)", labelEn: "Emissions certificate", method: CalcMethod.PER_VEHICLE, currency: Currency.COP, amount: "1301000.00", legalBasis: "Res. ANLA 001153 de 20-abr-2026 (combustión/híbrido). PENDIENTE de verificación contra fuente oficial — SEED-DATA §9 Q6.", confidence: DataConfidence.UNVERIFIED },
    { code: "PLATES_BOGOTA", category: CostCategory.REGISTRATION, labelEs: "Matrícula y placas (Bogotá)", labelEn: "Registration and plates (Bogotá)", method: CalcMethod.PER_VEHICLE, currency: Currency.COP, amount: "730700.00", legalBasis: "Matrícula Bogotá 2026 COP 708.400 + tasa RUNT COP 22.300. Otros organismos varían 20-40%.", confidence: DataConfidence.VERIFIED },
    { code: "SOAT_AUTO", category: CostCategory.REGISTRATION, labelEs: "SOAT automóvil familiar 1500-2500cc", labelEn: "Mandatory insurance", method: CalcMethod.PER_VEHICLE, currency: Currency.COP, amount: "544700.00", legalBasis: "Circular 022 de 2025 SFC — prima × 1,52 + COP 2.400 (tasa RUNT)", confidence: DataConfidence.VERIFIED },
    { code: "INLAND_BUN_BOG", category: CostCategory.INLAND_DESTINATION, labelEs: "Transporte Buenaventura → Bogotá", labelEn: "Inland transport", method: CalcMethod.PER_VEHICLE, currency: Currency.COP, amount: "2800000.00", legalBasis: "Referencia de mercado camión portavehículos.", confidence: DataConfidence.ESTIMATED, portId: bun },
    { code: "INLAND_CTG_BOG", category: CostCategory.INLAND_DESTINATION, labelEs: "Transporte Cartagena → Bogotá", labelEn: "Inland transport", method: CalcMethod.PER_VEHICLE, currency: Currency.COP, amount: "3100000.00", legalBasis: "Referencia de mercado camión portavehículos.", confidence: DataConfidence.ESTIMATED, portId: ctg },
  ];

  await prisma.destinationCostRule.deleteMany({ where: { parameterSetId: set.id } });
  for (const [i, c] of destinationCosts.entries()) {
    await prisma.destinationCostRule.create({
      data: {
        parameterSetId: set.id,
        updateMode: UpdateMode.ASSISTED,
        verifiedAt: c.confidence === DataConfidence.VERIFIED ? d("2026-09-05") : null,
        validFrom: d("2026-01-01"),
        sortOrder: (i + 1) * 10,
        ...c,
      } as never,
    });
  }
  console.log(`  costos de destino ..... ${destinationCosts.length}`);

  // --- Márgenes ------------------------------------------------------------
  await prisma.marginRule.deleteMany({ where: { parameterSetId: set.id } });
  await prisma.marginRule.createMany({
    data: [
      { parameterSetId: set.id, code: "MARGIN", labelEs: "Margen comercial", labelEn: "Commercial margin", method: CalcMethod.PERCENT_OF_LANDED, rate: "0.120000", sortOrder: 10 },
      { parameterSetId: set.id, code: "SERVICE_FEE", labelEs: "Fee de servicio", labelEn: "Service fee", method: CalcMethod.FIXED, amount: "2500000.00", currency: Currency.COP, sortOrder: 20 },
      // 2,65% + COP 700 — Wompi. Solo sobre el anticipo: ninguna pasarela
      // colombiana puede cobrar un vehículo completo (PSE tope ~COP 2,4M).
      { parameterSetId: set.id, code: "PAYMENT_FEE", labelEs: "Costos de pasarela", labelEn: "Payment processing", method: CalcMethod.PERCENT_OF_SUBTOTAL, rate: "0.026500", currency: Currency.COP, appliesToDepositOnly: true, sortOrder: 30 },
      { parameterSetId: set.id, code: "GMF", labelEs: "Gravamen a los movimientos financieros (4x1000)", labelEn: "Financial transactions tax", method: CalcMethod.PERCENT_OF_SUBTOTAL, rate: "0.004000", currency: Currency.COP, sortOrder: 40 },
    ],
  });
  console.log("  reglas de margen ...... 4");

  // --- Agregados -----------------------------------------------------------
  await prisma.addOnProduct.deleteMany({ where: { parameterSetId: set.id } });
  await prisma.addOnProduct.createMany({
    data: [
      { parameterSetId: set.id, code: "WALLBOX", labelEs: "Wallbox e instalación", labelEn: "Wallbox and installation", stage: "DESTINATION", category: "ACCESSORY", currency: Currency.COP, price: "4200000.00", requiresPowertrain: [Powertrain.BEV, Powertrain.PHEV], sortOrder: 10 },
      { parameterSetId: set.id, code: "PPF_FRONT", labelEs: "PPF frontal en Zona Franca", labelEn: "Front PPF in free trade zone", stage: "DESTINATION", category: "PROTECTION", currency: Currency.COP, price: "3800000.00", sortOrder: 20 },
      { parameterSetId: set.id, code: "PPF_FULL", labelEs: "PPF cobertura total", labelEn: "Full-body PPF", stage: "DESTINATION", category: "PROTECTION", currency: Currency.COP, price: "11500000.00", sortOrder: 30 },
      { parameterSetId: set.id, code: "WARRANTY_3Y", labelEs: "Garantía extendida 3 años", labelEn: "3-year extended warranty", stage: "DESTINATION", category: "WARRANTY", currency: Currency.COP, price: "5600000.00", sortOrder: 40 },
      { parameterSetId: set.id, code: "MAINTENANCE_KIT", labelEs: "Kit de mantenimiento prepagado", labelEn: "Prepaid maintenance kit", stage: "DESTINATION", category: "MAINTENANCE", currency: Currency.COP, price: "2900000.00", sortOrder: 50 },
      { parameterSetId: set.id, code: "PLATE_SERVICE", labelEs: "Trámite de matrícula", labelEn: "Registration service", stage: "DESTINATION", category: "LEGAL", currency: Currency.COP, price: "890000.00", sortOrder: 60 },
    ],
  });
  console.log("  agregados ............. 6");

  // --- Referencias de mercado ---------------------------------------------
  await prisma.marketReference.deleteMany({});
  await prisma.marketReference.createMany({
    data: [
      { topic: "FREIGHT_ASIA_WCSA", labelEs: "Flete Asia → Costa Oeste Sudamérica", value: "8190-10010", unit: "USD/40GP", observedAt: d("2026-09-01"), notes: "+82% intermensual. Multiplicado por ~2,5 desde abril de 2026." },
      { topic: "PORT_STATUS_BUN", labelEs: "Estado operativo Buenaventura", value: "degradado ~5 días", observedAt: d("2026-08-10"), notes: "Sismo M7,4. Patio crítico, corredor Buga-Loboguerrero con paso controlado. Invierte la lógica habitual de Pacífico para Asia." },
      { topic: "PANAMA_DRAFT", labelEs: "Calado Neopanamax Canal de Panamá", value: "47,5", unit: "pies", observedAt: d("2026-09-03"), notes: "32 tránsitos/día, desde 34. Encarece Asia→Cartagena; no afecta Asia→Buenaventura." },
    ],
  });
  console.log("  referencias de mercado  3");

  // --- Catálogo ------------------------------------------------------------
  let vehicleCount = 0;
  for (const [i, v] of VEHICLES.entries()) {
    const brand = await prisma.brand.upsert({
      where: { name: v.brand },
      update: {},
      create: { slug: v.brand.toLowerCase().replace(/\s+/g, "-"), name: v.brand, countryCode: v.brandCountry, displayOrder: i },
    });

    const modelSlug = v.model.toLowerCase().replace(/\s+/g, "-");
    const model =
      (await prisma.model.findFirst({ where: { brandId: brand.id, slug: modelSlug } })) ??
      (await prisma.model.create({
        data: { brandId: brand.id, slug: modelSlug, name: v.model, bodyType: v.bodyType },
      }));

    const trimSlug = v.trim.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const trim =
      (await prisma.trim.findFirst({ where: { modelId: model.id, slug: trimSlug, modelYear: v.modelYear } })) ??
      (await prisma.trim.create({
        data: {
          modelId: model.id,
          slug: trimSlug,
          name: v.trim,
          modelYear: v.modelYear,
          hsCodeId: v.hsCode,
          factoryCountryCode: v.factoryCountry,
          msrpUsd: v.msrpUsd.toFixed(2),
        },
      }));

    const filled = Object.values(v.spec).filter((x) => x !== undefined && x !== null).length;
    await prisma.vehicleSpec.upsert({
      where: { trimId: trim.id },
      update: {},
      create: {
        trimId: trim.id,
        bodyType: v.bodyType,
        ...v.spec,
        batteryKwh: v.spec.batteryKwh?.toFixed(2) ?? null,
        chargeDcKw: v.spec.chargeDcKw?.toFixed(2) ?? null,
        zeroToHundredS: v.spec.zeroToHundredS.toFixed(2),
        cbm: v.spec.cbm.toFixed(3),
        specCompleteness: Math.round((filled / 21) * 100),
      } as never,
    });

    const slug = `${brand.slug}-${modelSlug}-${trimSlug}-${v.modelYear}`;
    await prisma.vehicle.upsert({
      where: { slug },
      update: {},
      create: {
        trimId: trim.id,
        slug,
        // Denormalizados a propósito: la vitrina filtra por estos campos y
        // los 21 filtros deben resolverse sobre una sola tabla.
        brandId: brand.id,
        modelId: model.id,
        powertrain: v.spec.powertrain,
        bodyType: v.bodyType,
        stockCode: `TG-2026-${String(i + 1).padStart(4, "0")}`,
        condition: VehicleCondition.NEW,
        importRegime: ImportRegime.ORDINARY_IMPORT,
        // Nuevo, del año modelo en curso → elegible. Un usado sería BLOCKED.
        eligibilityStatus: EligibilityStatus.ELIGIBLE,
        modelYear: v.modelYear,
        exteriorColor: v.color,
        status: VehicleStatus.AVAILABLE,
        isPublished: true,
        publishedAt: new Date(),
        featured: v.featured ?? false,
        originCountryCode: v.factoryCountry,
        shipFromCountryCode: v.shipFrom,
        originPortId: await portId(v.originPort),
        hsCodeId: v.hsCode,
        purchaseCurrency: Currency.USD,
        purchasePrice: v.msrpUsd.toFixed(2),
        fobUsd: v.fobUsd.toFixed(2),
      } as never,
    });
    vehicleCount += 1;
  }
  console.log(`  vehículos ............. ${vehicleCount}`);

  // --- Documentos requeridos ----------------------------------------------
  const documents = [
    { code: "FACTURA_COMERCIAL", labelEs: "Factura comercial", labelEn: "Commercial invoice", responsible: "NOSOTROS", sortOrder: 10 },
    { code: "BL", labelEs: "Bill of Lading", labelEn: "Bill of Lading", responsible: "NAVIERA", sortOrder: 20 },
    { code: "CERT_ORIGEN", labelEs: "Certificado de origen", labelEn: "Certificate of origin", responsible: "NOSOTROS", sortOrder: 30, descriptionEs: "Indispensable para acceder a la preferencia arancelaria del TLC. Sin él se liquida al arancel NMF." },
    { code: "CEPD", labelEs: "Certificado de emisiones (CEPD)", labelEn: "Emissions certificate", responsible: "NOSOTROS", sortOrder: 40 },
    { code: "FICHA_HOMOLOGACION", labelEs: "Ficha técnica de homologación", labelEn: "Homologation data sheet", responsible: "NOSOTROS", sortOrder: 50 },
    { code: "REGISTRO_VUCE", labelEs: "Registro de importación VUCE", labelEn: "VUCE import registration", responsible: "SIA", sortOrder: 60 },
    { code: "DECLARACION_IMPORTACION", labelEs: "Declaración de importación", labelEn: "Import declaration", responsible: "SIA", sortOrder: 70 },
    { code: "CEDULA_CLIENTE", labelEs: "Documento de identidad del comprador", labelEn: "Buyer ID document", responsible: "CLIENTE", sortOrder: 80 },
    { code: "RUT", labelEs: "RUT", labelEn: "Tax ID (RUT)", responsible: "CLIENTE", sortOrder: 90 },
  ];
  for (const doc of documents) {
    await prisma.documentRequirement.upsert({ where: { code: doc.code }, update: doc, create: doc });
  }
  console.log(`  documentos requeridos . ${documents.length}`);

  // --- Usuario admin de demostración --------------------------------------
  //
  // El proveedor de credenciales rechaza a cualquier usuario sin `passwordHash`
  // (`if (!user?.passwordHash) return null`), así que sembrar el admin sin
  // contraseña dejaba una base de datos completa y ninguna forma de entrar.
  //
  // La contraseña es de DESARROLLO. En producción el usuario se siembra sin
  // ella y se activa por invitación: una credencial conocida y publicada en el
  // repositorio no puede existir en un entorno real.
  // Un despliegue de DEMOSTRACIÓN corre con NODE_ENV=production pero necesita
  // que se pueda entrar: sin credenciales el back-office entero queda
  // inalcanzable y no hay nada que enseñar. `SEED_ADMIN_PASSWORD` es esa puerta,
  // y es deliberadamente explícita — hay que ponerla a mano en el entorno, así
  // que un despliegue real jamás la tiene por descuido y sigue sembrándose sin
  // contraseña, activando las cuentas por invitación.
  const isProduction = process.env.NODE_ENV === "production";
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  const devPassword = "Automocion2026!";

  const effectivePassword = isProduction ? seedPassword : (seedPassword ?? devPassword);
  const passwordHash = effectivePassword
    ? await bcrypt.hash(effectivePassword, 12)
    : null;

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  /**
   * Equipo de demostración.
   *
   * Cubre a propósito los tres estados y todos los roles, porque la pantalla de
   * usuarios solo se entiende cuando hay contraste: un invitado sin último
   * acceso, un suspendido en gris y los privilegios en ámbar contra el resto.
   *
   * El personal usa el dominio corporativo y los clientes correos personales —
   * es lo que se ve en una operación real, y una lista donde todo el mundo
   * comparte dominio se lee como datos de relleno.
   */
  const TEAM = [
    { email: "admin@automocion.os", name: "Administrador", role: Role.ADMIN, status: UserStatus.ACTIVE, lastLoginAt: new Date(), createdAt: daysAgo(210) },
    { email: "juan.perez@automocion.os", name: "Juan Pérez", role: Role.ADMIN, status: UserStatus.ACTIVE, lastLoginAt: hoursAgo(2), createdAt: daysAgo(180) },
    { email: "andrea.gomez@automocion.os", name: "Andrea Gómez", role: Role.SALES, status: UserStatus.ACTIVE, lastLoginAt: hoursAgo(5), createdAt: daysAgo(120) },
    { email: "sofia.pardo@automocion.os", name: "Sofía Pardo", role: Role.SALES, status: UserStatus.ACTIVE, lastLoginAt: hoursAgo(6), createdAt: daysAgo(95) },
    { email: "carlos.rodriguez@automocion.os", name: "Carlos Rodríguez", role: Role.OPS, status: UserStatus.ACTIVE, lastLoginAt: daysAgo(1), createdAt: daysAgo(150) },
    { email: "diego.torres@automocion.os", name: "Diego Torres", role: Role.OPS, status: UserStatus.INVITED, lastLoginAt: null, createdAt: daysAgo(3) },
    { email: "camila.restrepo@automocion.os", name: "Camila Restrepo", role: Role.CONTENT_EDITOR, status: UserStatus.ACTIVE, lastLoginAt: daysAgo(2), createdAt: daysAgo(60) },
    // Agente de aduanas: ve solo los pedidos que le competen.
    { email: "amejia@siaandina.com.co", name: "Andrés Mejía (SIA Andina)", role: Role.PARTNER, status: UserStatus.ACTIVE, lastLoginAt: daysAgo(4), createdAt: daysAgo(75) },
    { email: "laura.martinez@gmail.com", name: "Laura Martínez", role: Role.CUSTOMER, status: UserStatus.ACTIVE, lastLoginAt: daysAgo(3), createdAt: daysAgo(45) },
    { email: "natalia.rojas@outlook.com", name: "Natalia Rojas", role: Role.CUSTOMER, status: UserStatus.ACTIVE, lastLoginAt: daysAgo(1), createdAt: daysAgo(28) },
    { email: "miguel.vargas@hotmail.com", name: "Miguel Vargas", role: Role.CUSTOMER, status: UserStatus.SUSPENDED, lastLoginAt: daysAgo(12), createdAt: daysAgo(70) },
    { email: "valentina.ossa@gmail.com", name: "Valentina Ossa", role: Role.CUSTOMER, status: UserStatus.INVITED, lastLoginAt: null, createdAt: daysAgo(1) },
  ];

  for (const member of TEAM) {
    // Solo el personal ACTIVO recibe contraseña de desarrollo, para que el
    // cliente pueda entrar como asesor u operaciones y ver cómo cambia el menú
    // según el permiso. Invitados y suspendidos no deben poder entrar.
    const isStaff = member.role !== Role.CUSTOMER;
    const hash =
      isProduction || member.status !== UserStatus.ACTIVE || !isStaff ? null : passwordHash;

    await prisma.user.upsert({
      where: { email: member.email },
      update: { passwordHash: hash, role: member.role, status: member.status },
      create: {
        email: member.email,
        name: member.name,
        role: member.role,
        status: member.status,
        locale: "es-CO",
        emailVerified: member.status === UserStatus.ACTIVE ? member.createdAt : null,
        passwordHash: hash,
        lastLoginAt: member.lastLoginAt,
        createdAt: member.createdAt,
        dataConsentAt: member.createdAt,
        dataConsentVersion: "v1",
      },
    });
  }
  console.log(`  usuarios .............. ${TEAM.length}`);

  if (effectivePassword === undefined || effectivePassword === null) {
    console.log("  usuario admin ......... sin contraseña (producción: usar invitación)");
    console.log("                          define SEED_ADMIN_PASSWORD si esto es una demo");
  } else if (isProduction) {
    console.log("  usuario admin ......... admin@automocion.os / (SEED_ADMIN_PASSWORD)");
  } else {
    console.log(`  usuario admin ......... admin@automocion.os / ${effectivePassword}`);
  }

  console.log("\nSeed completo.");
  console.log("ADVERTENCIA: las reglas de híbridos y el agenciamiento están sin verificar.");
  console.log("El motor las marcará y no cotizará en firme hasta que la SIA responda.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
