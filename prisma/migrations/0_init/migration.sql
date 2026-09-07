-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'OPS', 'SALES', 'CONTENT_EDITOR', 'CUSTOMER', 'PARTNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'COP', 'EUR', 'CNY', 'AED', 'CAD', 'KRW', 'JPY', 'GBP', 'MXN');

-- CreateEnum
CREATE TYPE "Powertrain" AS ENUM ('GASOLINE', 'DIESEL', 'MHEV', 'HEV', 'PHEV', 'BEV', 'FCEV', 'CNG', 'LPG', 'FLEX');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'CROSSOVER', 'PICKUP', 'VAN', 'MINIVAN', 'COUPE', 'WAGON', 'CONVERTIBLE', 'TRUCK');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('MANUAL', 'AUTOMATIC', 'CVT', 'DCT', 'AMT', 'SINGLE_SPEED');

-- CreateEnum
CREATE TYPE "DriveType" AS ENUM ('FWD', 'RWD', 'AWD', 'FOUR_WD');

-- CreateEnum
CREATE TYPE "RangeStandard" AS ENUM ('WLTP', 'EPA', 'NEDC', 'CLTC', 'MANUFACTURER');

-- CreateEnum
CREATE TYPE "EmissionStandard" AS ENUM ('EURO_4', 'EURO_5', 'EURO_6', 'EURO_6D', 'EPA_TIER_3', 'CHINA_6', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('NEW', 'DEMO', 'USED', 'CLASSIC_35Y');

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('MSO', 'CLEAN', 'REBUILT', 'SALVAGE', 'FLOOD', 'LEMON', 'EXPORT_ONLY', 'NO_TITLE');

-- CreateEnum
CREATE TYPE "ImportRegime" AS ENUM ('ORDINARY_IMPORT', 'FREE_ZONE', 'TEMPORARY_IMPORT', 'DIPLOMATIC', 'CLASSIC_ANTIQUE', 'RETURNING_RESIDENT', 'RE_EXPORT');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'NEEDS_REVIEW', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DRAFT', 'SOURCING', 'AVAILABLE', 'RESERVED', 'PURCHASED', 'IN_TRANSIT', 'IN_FREE_ZONE', 'NATIONALIZING', 'NATIONALIZED', 'DELIVERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('AUCTION', 'DEALER', 'MARKETPLACE', 'OEM', 'BROKER', 'MANUAL');

-- CreateEnum
CREATE TYPE "IngestStrategy" AS ENUM ('REST_API', 'HTTP_HTML', 'HEADLESS_BROWSER', 'CSV_FEED', 'XML_FEED', 'EMAIL_INBOX', 'MANUAL_UPLOAD');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED', 'RATE_LIMITED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RawListingStatus" AS ENUM ('NEW', 'NORMALIZED', 'NEEDS_REVIEW', 'MATCHED', 'PUBLISHED', 'REJECTED', 'DUPLICATE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ParameterSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FxRateKind" AS ENUM ('TRM_DAILY', 'TRM_CUSTOMS_WEEK', 'SPOT_MANUAL', 'CROSS_RATE');

-- CreateEnum
CREATE TYPE "FxSource" AS ENUM ('SUPERFINANCIERA', 'DATOS_GOV_CO', 'BANREP', 'MANUAL', 'ECB', 'OTHER');

-- CreateEnum
CREATE TYPE "FreightMode" AS ENUM ('CONTAINER_20', 'CONTAINER_40', 'CONTAINER_40HC', 'RORO', 'LCL', 'FLAT_RACK', 'AIR');

-- CreateEnum
CREATE TYPE "FreightBasis" AS ENUM ('PER_CONTAINER', 'PER_VEHICLE', 'PER_CBM', 'PER_TON', 'PER_WM');

-- CreateEnum
CREATE TYPE "TaxKind" AS ENUM ('ARANCEL', 'IVA', 'IMPOCONSUMO', 'SALVAGUARDIA', 'ANTIDUMPING');

-- CreateEnum
CREATE TYPE "TaxBaseKind" AS ENUM ('FOB', 'CIF', 'CIF_PLUS_ARANCEL', 'TOTAL_VALUE_EXCL_IVA', 'LANDED', 'CUSTOM_FORMULA');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('ORIGIN_ACQUISITION', 'ORIGIN_INLAND', 'ORIGIN_DOCS', 'ORIGIN_EXPORT', 'INTERNATIONAL_FREIGHT', 'INTERNATIONAL_INSURANCE', 'PORT_DESTINATION', 'FREE_ZONE', 'CUSTOMS_BROKER', 'VUCE', 'ENVIRONMENTAL', 'HOMOLOGATION', 'INSPECTION', 'STORAGE_DEMURRAGE', 'INLAND_DESTINATION', 'FINANCIAL', 'REGISTRATION', 'WARRANTY_RESERVE', 'MARGIN', 'DISCOUNT', 'ADDON', 'OTHER');

-- CreateEnum
CREATE TYPE "CalcMethod" AS ENUM ('FIXED', 'PER_VEHICLE', 'PER_CONTAINER', 'PER_DAY', 'PER_CBM', 'PERCENT_OF_FOB', 'PERCENT_OF_CIF', 'PERCENT_OF_TAXES', 'PERCENT_OF_LANDED', 'PERCENT_OF_SUBTOTAL', 'TIERED_BY_VALUE', 'FORMULA');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('EQUAL_SHARE', 'BY_FOB_VALUE', 'BY_CIF_VALUE', 'BY_CBM', 'BY_WEIGHT', 'BY_SLOTS', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaxableBaseAllocationMethod" AS ENUM ('BY_FOB_VALUE', 'BY_WEIGHT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FxPolicy" AS ENUM ('FIXED_COP_UNTIL_EXPIRY', 'BANDED', 'INDEXED_AT_PAYMENT', 'QUOTED_IN_USD');

-- CreateEnum
CREATE TYPE "LineItemKind" AS ENUM ('VEHICLE_FOB', 'AUCTION_FEE', 'ORIGIN_INLAND', 'ORIGIN_DOCS', 'INTERNATIONAL_FREIGHT', 'INTERNATIONAL_INSURANCE', 'ARANCEL', 'IVA', 'IMPOCONSUMO', 'PORT_FEE', 'FREE_ZONE_FEE', 'CUSTOMS_BROKER_FEE', 'VUCE_FEE', 'ENVIRONMENTAL_FEE', 'HOMOLOGATION_FEE', 'INSPECTION_FEE', 'STORAGE_FEE', 'INLAND_DESTINATION', 'FINANCIAL_FEE', 'REGISTRATION_FEE', 'ADDON', 'MARGIN', 'DISCOUNT', 'ROUNDING', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'AWAITING_DEPOSIT', 'CONFIRMED', 'SOURCING', 'PURCHASED', 'ORIGIN_LOGISTICS', 'BOOKED', 'LOADED', 'IN_TRANSIT', 'ARRIVED_PORT', 'IN_FREE_ZONE', 'NATIONALIZATION', 'RELEASED', 'DESTINATION_LOGISTICS', 'UPFITTING', 'REGISTRATION', 'READY_FOR_DELIVERY', 'DELIVERED', 'CLOSED', 'ON_HOLD', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TrafficLight" AS ENUM ('GREEN', 'AMBER', 'RED', 'GREY');

-- CreateEnum
CREATE TYPE "MilestoneDimension" AS ENUM ('PHYSICAL', 'DOCUMENTARY', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'LATE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('CUSTOMER', 'ORDER', 'VEHICLE', 'CONSOLIDATION');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('NOT_STARTED', 'PENDING_UPLOAD', 'UPLOADED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'WAIVED');

-- CreateEnum
CREATE TYPE "GpsSource" AS ENUM ('TELEMATICS', 'CARRIER_API', 'AIS_VESSEL', 'MANUAL', 'GEOFENCE_EVENT');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'INSTALLMENT', 'FINAL', 'ADDON', 'ADJUSTMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('WOMPI', 'PAYU', 'MERCADO_PAGO', 'STRIPE', 'BANK_TRANSFER', 'WIRE_USD', 'CASH');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST', 'NURTURING');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEB_FORM', 'QUOTE_SIMULATOR', 'CHATBOT', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'TUCARRO', 'CARROYA', 'MARKETPLACE', 'REFERRAL', 'PAID_ADS', 'ORGANIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('WEB_WIDGET', 'WHATSAPP', 'INSTAGRAM_DM', 'MESSENGER', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL', 'HUMAN_AGENT');

-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('OPEN', 'BOT_HANDLING', 'ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('TUCARRO', 'CARROYA', 'MERCADO_LIBRE', 'FACEBOOK_MARKETPLACE', 'INSTAGRAM', 'OLX', 'GOOGLE_VEHICLE_ADS', 'OWN_SITE');

-- CreateEnum
CREATE TYPE "ChannelListingStatus" AS ENUM ('DRAFT', 'QUEUED', 'PUBLISHED', 'PAUSED', 'SOLD', 'EXPIRED', 'ERROR', 'DELETED');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('CREATE', 'UPDATE', 'PRICE_UPDATE', 'STOCK_UPDATE', 'PAUSE', 'DELETE', 'IMPORT_LEADS', 'FETCH_STATUS');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'CRON', 'WEBHOOK', 'SCRAPER', 'AI_AGENT');

-- CreateEnum
CREATE TYPE "SocialTemplate" AS ENUM ('IG_SQUARE_SPEC', 'IG_STORY_PRICE', 'IG_CAROUSEL_GALLERY', 'WA_CATALOG_CARD', 'OG_IMAGE');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('VERIFIED', 'ESTIMATED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "UpdateMode" AS ENUM ('AUTOMATIC', 'ASSISTED', 'MANUAL');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('VALOR', 'VALOR_CON_ADVERTENCIA', 'NO_COTIZABLE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "phone" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT NOT NULL DEFAULT 'es-CO',
    "documentType" TEXT,
    "documentId" TEXT,
    "fiscalName" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "department" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'CO',
    "dataConsentAt" TIMESTAMP(3),
    "dataConsentVersion" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "countries" (
    "code" CHAR(2) NOT NULL,
    "code3" CHAR(3) NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "region" TEXT,
    "isOriginHub" BOOLEAN NOT NULL DEFAULT false,
    "flagEmoji" TEXT,
    "mapLat" DECIMAL(9,6),
    "mapLng" DECIMAL(9,6),

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ports" (
    "id" TEXT NOT NULL,
    "unlocode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "isOrigin" BOOLEAN NOT NULL DEFAULT true,
    "isDestination" BOOLEAN NOT NULL DEFAULT false,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "freeDaysDefault" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_agreements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalBasis" TEXT,
    "legalUrl" TEXT,
    "inForceFrom" DATE NOT NULL,
    "inForceTo" DATE,
    "originProofRequired" BOOLEAN NOT NULL DEFAULT true,
    "originProofType" TEXT,
    "notes" TEXT,

    CONSTRAINT "trade_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_agreement_countries" (
    "agreementId" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,

    CONSTRAINT "trade_agreement_countries_pkey" PRIMARY KEY ("agreementId","countryCode")
);

-- CreateTable
CREATE TABLE "hs_codes" (
    "code" TEXT NOT NULL,
    "formatted" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapter" CHAR(2) NOT NULL,
    "heading" CHAR(4) NOT NULL,
    "unitOfMeasure" TEXT,
    "requiresLicense" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "hs_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "countryCode" CHAR(2),
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "generation" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "heroImageUrl" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trims" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "marketCode" TEXT,
    "hsCodeId" TEXT,
    "factoryCountryCode" CHAR(2),
    "msrpUsd" DECIMAL(14,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "homologated" BOOLEAN NOT NULL DEFAULT false,
    "homologationRef" TEXT,
    "homologationAt" TIMESTAMP(3),
    "homologationCostCop" DECIMAL(18,2),
    "homologationUnitsAmortized" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_specs" (
    "id" TEXT NOT NULL,
    "trimId" TEXT NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "powertrain" "Powertrain" NOT NULL,
    "transmission" "Transmission",
    "driveType" "DriveType",
    "engineDisplacementCc" INTEGER,
    "horsepowerHp" INTEGER,
    "torqueNm" INTEGER,
    "batteryKwh" DECIMAL(6,2),
    "rangeKm" INTEGER,
    "rangeStandard" "RangeStandard",
    "chargeAcKw" DECIMAL(5,2),
    "chargeDcKw" DECIMAL(6,2),
    "consumptionKwh100" DECIMAL(5,2),
    "fuelEconomyKmGal" DECIMAL(5,2),
    "zeroToHundredS" DECIMAL(4,2),
    "topSpeedKph" INTEGER,
    "seats" INTEGER,
    "doors" INTEGER,
    "cargoLiters" INTEGER,
    "curbWeightKg" INTEGER,
    "groundClearanceMm" INTEGER,
    "emissionStandard" "EmissionStandard",
    "lengthMm" INTEGER,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "wheelbaseMm" INTEGER,
    "cbm" DECIMAL(7,3),
    "towingKg" INTEGER,
    "ncapStars" INTEGER,
    "airbags" INTEGER,
    "warrantyYears" INTEGER,
    "batteryWarrantyYears" INTEGER,
    "features" JSONB,
    "specCompleteness" INTEGER NOT NULL DEFAULT 0,
    "sourceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "trimId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vin" VARCHAR(17),
    "lotNumber" TEXT,
    "stockCode" TEXT,
    "condition" "VehicleCondition" NOT NULL DEFAULT 'NEW',
    "titleStatus" "TitleStatus" NOT NULL DEFAULT 'MSO',
    "importRegime" "ImportRegime" NOT NULL DEFAULT 'ORDINARY_IMPORT',
    "eligibilityStatus" "EligibilityStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "eligibilityNote" TEXT,
    "modelYear" INTEGER NOT NULL,
    "mileageKm" INTEGER NOT NULL DEFAULT 0,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "plateOrigin" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "originCountryCode" CHAR(2) NOT NULL,
    "shipFromCountryCode" CHAR(2),
    "originPortId" TEXT,
    "hsCodeId" TEXT,
    "purchaseCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "purchasePrice" DECIMAL(14,2),
    "fobUsd" DECIMAL(14,2),
    "auctionFeeUsd" DECIMAL(14,2),
    "listPriceUsd" DECIMAL(14,2),
    "estLandedCop" DECIMAL(18,2),
    "estLandedAt" TIMESTAMP(3),
    "estLandedParamSetId" TEXT,
    "cbm" DECIMAL(7,3),
    "weightKg" INTEGER,
    "brandId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "powertrain" "Powertrain" NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "sourceId" TEXT,
    "rawListingId" TEXT,
    "externalUrl" TEXT,
    "auctionEndsAt" TIMESTAMP(3),
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "descriptionMd" TEXT,
    "damageNotes" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_images" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "alt" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "blurhash" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "countryCode" CHAR(2),
    "baseUrl" TEXT,
    "strategy" "IngestStrategy" NOT NULL DEFAULT 'MANUAL_UPLOAD',
    "termsReviewed" BOOLEAN NOT NULL DEFAULT false,
    "termsUrl" TEXT,
    "robotsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "contractRef" TEXT,
    "legalRiskNote" TEXT,
    "authRef" TEXT,
    "rateLimitRpm" INTEGER NOT NULL DEFAULT 20,
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cron" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "targetUrl" TEXT,
    "searchParams" JSONB,
    "selectorMap" JSONB,
    "fieldMapping" JSONB,
    "maxPages" INTEGER NOT NULL DEFAULT 5,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "itemsNew" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "httpErrors" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "logUrl" TEXT,
    "triggeredBy" "ActorType" NOT NULL DEFAULT 'CRON',

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_listings" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "runId" TEXT,
    "externalId" TEXT NOT NULL,
    "url" TEXT,
    "rawPayload" JSONB NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "normalizedBrand" TEXT,
    "normalizedModel" TEXT,
    "normalizedTrim" TEXT,
    "normalizedYear" INTEGER,
    "normalizedVin" TEXT,
    "normalizedMileageKm" INTEGER,
    "normalizedPrice" DECIMAL(14,2),
    "normalizedCurrency" "Currency",
    "normalizedCondition" "VehicleCondition",
    "normalizedCountry" CHAR(2),
    "imageUrls" TEXT[],
    "matchedTrimId" TEXT,
    "matchConfidence" DECIMAL(5,4),
    "status" "RawListingStatus" NOT NULL DEFAULT 'NEW',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "raw_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_parameter_sets" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT,
    "status" "ParameterSetStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "notes" TEXT,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_parameter_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "kind" "FxRateKind" NOT NULL DEFAULT 'TRM_DAILY',
    "base" "Currency" NOT NULL DEFAULT 'USD',
    "quote" "Currency" NOT NULL DEFAULT 'COP',
    "rate" DECIMAL(14,6) NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "source" "FxSource" NOT NULL DEFAULT 'DATOS_GOV_CO',
    "sourceRef" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overriddenById" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_rules" (
    "id" TEXT NOT NULL,
    "parameterSetId" TEXT NOT NULL,
    "hsCodeValue" VARCHAR(10) NOT NULL,
    "originCountryCode" CHAR(2),
    "powertrain" "Powertrain",
    "agreementId" TEXT,
    "dutyRate" DECIMAL(9,6) NOT NULL,
    "vatRate" DECIMAL(9,6) NOT NULL,
    "exciseRate" DECIMAL(9,6) NOT NULL,
    "dutyBase" "TaxBaseKind" NOT NULL DEFAULT 'CIF',
    "vatBase" "TaxBaseKind" NOT NULL DEFAULT 'CIF_PLUS_ARANCEL',
    "exciseBase" "TaxBaseKind" NOT NULL DEFAULT 'TOTAL_VALUE_EXCL_IVA',
    "exciseThresholdFobUsd" DECIMAL(14,2),
    "exciseRateAboveThreshold" DECIMAL(9,6),
    "exciseAppliesOnImport" BOOLEAN NOT NULL DEFAULT true,
    "requiresOriginCertificate" BOOLEAN NOT NULL DEFAULT false,
    "legalBasis" TEXT NOT NULL,
    "legalUrl" TEXT,
    "confidence" "DataConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "updateMode" "UpdateMode" NOT NULL DEFAULT 'MANUAL',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "staleAfterDays" INTEGER NOT NULL DEFAULT 90,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariff_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freight_rates" (
    "id" TEXT NOT NULL,
    "parameterSetId" TEXT NOT NULL,
    "originPortId" TEXT NOT NULL,
    "destinationPortId" TEXT NOT NULL,
    "mode" "FreightMode" NOT NULL,
    "basis" "FreightBasis" NOT NULL DEFAULT 'PER_CONTAINER',
    "amountUsd" DECIMAL(14,2) NOT NULL,
    "surcharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "transitDaysMin" INTEGER NOT NULL,
    "transitDaysMax" INTEGER NOT NULL,
    "vehiclesPerUnit" INTEGER DEFAULT 1,
    "maxPayloadKg" DECIMAL(10,2),
    "confidence" "DataConfidence" NOT NULL DEFAULT 'ESTIMATED',
    "updateMode" "UpdateMode" NOT NULL DEFAULT 'ASSISTED',
    "staleAfterDays" INTEGER NOT NULL DEFAULT 21,
    "verifiedAt" TIMESTAMP(3),
    "sourceRef" TEXT,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freight_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_cost_rules" (
    "id" TEXT NOT NULL,
    "parameterSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "method" "CalcMethod" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rate" DECIMAL(9,6),
    "minimum" DECIMAL(18,2),
    "maximum" DECIMAL(18,2),
    "formula" TEXT,
    "portId" TEXT,
    "importRegime" "ImportRegime",
    "powertrain" "Powertrain",
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "inExciseBase" BOOLEAN NOT NULL DEFAULT false,
    "confidence" "DataConfidence" NOT NULL DEFAULT 'ESTIMATED',
    "updateMode" "UpdateMode" NOT NULL DEFAULT 'ASSISTED',
    "staleAfterDays" INTEGER NOT NULL DEFAULT 180,
    "verifiedAt" TIMESTAMP(3),
    "legalBasis" TEXT,
    "sourceRef" TEXT,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destination_cost_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "margin_rules" (
    "id" TEXT NOT NULL,
    "parameterSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "method" "CalcMethod" NOT NULL DEFAULT 'PERCENT_OF_LANDED',
    "rate" DECIMAL(9,6),
    "amount" DECIMAL(18,2),
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "appliesToDepositOnly" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "margin_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_products" (
    "id" TEXT NOT NULL,
    "parameterSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "descriptionEs" TEXT,
    "descriptionEn" TEXT,
    "stage" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "price" DECIMAL(18,2) NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "requiresPowertrain" "Powertrain"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addon_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_references" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "observedAt" DATE NOT NULL,
    "sourceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidations" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "mode" "FreightMode" NOT NULL DEFAULT 'CONTAINER_40HC',
    "originPortId" TEXT NOT NULL,
    "destinationPortId" TEXT NOT NULL,
    "containerCostUsd" DECIMAL(14,2) NOT NULL,
    "surchargesUsd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commercialAllocation" "AllocationMethod" NOT NULL DEFAULT 'BY_CIF_VALUE',
    "taxableBaseAllocation" "TaxableBaseAllocationMethod" NOT NULL DEFAULT 'BY_FOB_VALUE',
    "maxVehicles" INTEGER NOT NULL DEFAULT 4,
    "maxPayloadKg" DECIMAL(10,2),
    "bookingRef" TEXT,
    "billOfLading" TEXT,
    "vesselName" TEXT,
    "etd" DATE,
    "eta" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consolidations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_items" (
    "id" TEXT NOT NULL,
    "consolidationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "commercialShare" DECIMAL(9,6) NOT NULL,
    "taxableBaseShare" DECIMAL(9,6) NOT NULL,
    "allocatedFreightUsd" DECIMAL(14,2) NOT NULL,
    "roundingAdjustmentUsd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "manualShare" DECIMAL(9,6),
    "slot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "locale" TEXT NOT NULL DEFAULT 'es',
    "customerId" TEXT,
    "createdById" TEXT,
    "leadId" TEXT,
    "parameterSetId" TEXT NOT NULL,
    "trmCommercial" DECIMAL(14,6) NOT NULL,
    "trmFiscal" DECIMAL(14,6),
    "trmDate" DATE NOT NULL,
    "fxPolicy" "FxPolicy" NOT NULL DEFAULT 'BANDED',
    "fxToleranceBps" INTEGER DEFAULT 200,
    "subtotalUsd" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxesCop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "landedCostCop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCopCeiling" DECIMAL(18,2),
    "resolutionStatus" "ResolutionStatus" NOT NULL DEFAULT 'VALOR_CON_ADVERTENCIA',
    "snapshot" JSONB,
    "estimatedDays" INTEGER,
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_vehicles" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "descriptionEs" TEXT NOT NULL,
    "hsCodeValue" VARCHAR(10),
    "powertrain" "Powertrain",
    "originCountryCode" CHAR(2),
    "modelYear" INTEGER,
    "fobUsd" DECIMAL(14,2) NOT NULL,
    "cifUsd" DECIMAL(14,2) NOT NULL,
    "landedCostCop" DECIMAL(18,2) NOT NULL,
    "containerShare" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "quote_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "kind" "LineItemKind" NOT NULL,
    "block" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "noteEs" TEXT,
    "noteEn" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "amountUsd" DECIMAL(14,2),
    "amountCop" DECIMAL(18,2) NOT NULL,
    "appliedRuleId" TEXT,
    "appliedRuleKind" TEXT,
    "legalBasis" TEXT,
    "baseKind" "TaxBaseKind",
    "baseAmountCop" DECIMAL(18,2),
    "rateApplied" DECIMAL(9,6),
    "resolutionStatus" "ResolutionStatus" NOT NULL DEFAULT 'VALOR',
    "warning" TEXT,
    "addOnProductId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_readiness" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "switchCode" TEXT NOT NULL,
    "chosenValue" TEXT NOT NULL,
    "isExplicitChoice" BOOLEAN NOT NULL DEFAULT false,
    "evidence" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "quote_readiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "locale" TEXT NOT NULL DEFAULT 'es',
    "customerId" TEXT NOT NULL,
    "accountManagerId" TEXT,
    "quoteId" TEXT,
    "importerIsEndConsumer" BOOLEAN NOT NULL DEFAULT true,
    "importRegime" "ImportRegime" NOT NULL DEFAULT 'ORDINARY_IMPORT',
    "totalCop" DECIMAL(18,2) NOT NULL,
    "depositCop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidCop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "documentaryLight" "TrafficLight" NOT NULL DEFAULT 'GREY',
    "physicalLight" "TrafficLight" NOT NULL DEFAULT 'GREY',
    "estimatedDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "descriptionEs" TEXT NOT NULL,
    "unitPriceCop" DECIMAL(18,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isAddOn" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "note" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "actorType" "ActorType" NOT NULL DEFAULT 'USER',
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_milestones" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "code" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "dimension" "MilestoneDimension" NOT NULL DEFAULT 'PHYSICAL',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "plannedAt" TIMESTAMP(3),
    "actualAt" TIMESTAMP(3),
    "responsible" TEXT,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "descriptionEs" TEXT,
    "descriptionEn" TEXT,
    "scope" "DocumentScope" NOT NULL DEFAULT 'ORDER',
    "responsible" TEXT NOT NULL DEFAULT 'CLIENTE',
    "importRegime" "ImportRegime",
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_uploads" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "vehicleId" TEXT,
    "requirementId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_pings" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "source" "GpsSource" NOT NULL DEFAULT 'MANUAL',
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "label" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL DEFAULT 'DEPOSIT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'WOMPI',
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "amount" DECIMAL(18,2) NOT NULL,
    "feeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "externalRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'WEB_FORM',
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "message" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "interestVehicleId" TEXT,
    "ownerId" TEXT,
    "userId" TEXT,
    "dataConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL DEFAULT 'WEB_WIDGET',
    "status" "ChatStatus" NOT NULL DEFAULT 'BOT_HANDLING',
    "locale" TEXT NOT NULL DEFAULT 'es',
    "userId" TEXT,
    "agentId" TEXT,
    "leadId" TEXT,
    "visitorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "categoryId" TEXT,
    "authorId" TEXT,
    "coverImageUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_translations" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" JSONB NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_translations" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "page_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_listings" (
    "id" TEXT NOT NULL,
    "channel" "ChannelKind" NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "ChannelListingStatus" NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "priceCop" DECIMAL(18,2),
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_sync_logs" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "operation" "SyncOperation" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_assets" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "template" "SocialTemplate" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL DEFAULT 'USER',
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PostToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_documentType_documentId_idx" ON "users"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code3_key" ON "countries"("code3");

-- CreateIndex
CREATE UNIQUE INDEX "ports_unlocode_key" ON "ports"("unlocode");

-- CreateIndex
CREATE INDEX "ports_countryCode_isOrigin_idx" ON "ports"("countryCode", "isOrigin");

-- CreateIndex
CREATE UNIQUE INDEX "trade_agreements_code_key" ON "trade_agreements"("code");

-- CreateIndex
CREATE INDEX "hs_codes_heading_idx" ON "hs_codes"("heading");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE INDEX "brands_active_displayOrder_idx" ON "brands"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "models_bodyType_active_idx" ON "models"("bodyType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "models_brandId_slug_key" ON "models"("brandId", "slug");

-- CreateIndex
CREATE INDEX "trims_hsCodeId_idx" ON "trims"("hsCodeId");

-- CreateIndex
CREATE INDEX "trims_active_modelYear_idx" ON "trims"("active", "modelYear");

-- CreateIndex
CREATE UNIQUE INDEX "trims_modelId_slug_modelYear_key" ON "trims"("modelId", "slug", "modelYear");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_specs_trimId_key" ON "vehicle_specs"("trimId");

-- CreateIndex
CREATE INDEX "vehicle_specs_powertrain_bodyType_idx" ON "vehicle_specs"("powertrain", "bodyType");

-- CreateIndex
CREATE INDEX "vehicle_specs_batteryKwh_rangeKm_idx" ON "vehicle_specs"("batteryKwh", "rangeKm");

-- CreateIndex
CREATE INDEX "vehicle_specs_horsepowerHp_idx" ON "vehicle_specs"("horsepowerHp");

-- CreateIndex
CREATE INDEX "vehicle_specs_seats_doors_idx" ON "vehicle_specs"("seats", "doors");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_slug_key" ON "vehicles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_stockCode_key" ON "vehicles"("stockCode");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_rawListingId_key" ON "vehicles"("rawListingId");

-- CreateIndex
CREATE INDEX "vehicles_isPublished_status_featured_idx" ON "vehicles"("isPublished", "status", "featured");

-- CreateIndex
CREATE INDEX "vehicles_brandId_modelId_modelYear_idx" ON "vehicles"("brandId", "modelId", "modelYear");

-- CreateIndex
CREATE INDEX "vehicles_powertrain_bodyType_isPublished_idx" ON "vehicles"("powertrain", "bodyType", "isPublished");

-- CreateIndex
CREATE INDEX "vehicles_originCountryCode_status_idx" ON "vehicles"("originCountryCode", "status");

-- CreateIndex
CREATE INDEX "vehicles_estLandedCop_idx" ON "vehicles"("estLandedCop");

-- CreateIndex
CREATE INDEX "vehicles_eligibilityStatus_idx" ON "vehicles"("eligibilityStatus");

-- CreateIndex
CREATE INDEX "vehicle_images_vehicleId_sortOrder_idx" ON "vehicle_images"("vehicleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "sources_code_key" ON "sources"("code");

-- CreateIndex
CREATE INDEX "sources_type_active_idx" ON "sources"("type", "active");

-- CreateIndex
CREATE INDEX "scrape_jobs_enabled_nextRunAt_idx" ON "scrape_jobs"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "scrape_runs_jobId_startedAt_idx" ON "scrape_runs"("jobId", "startedAt");

-- CreateIndex
CREATE INDEX "scrape_runs_status_startedAt_idx" ON "scrape_runs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "raw_listings_status_lastSeenAt_idx" ON "raw_listings"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "raw_listings_payloadHash_idx" ON "raw_listings"("payloadHash");

-- CreateIndex
CREATE INDEX "raw_listings_normalizedVin_idx" ON "raw_listings"("normalizedVin");

-- CreateIndex
CREATE UNIQUE INDEX "raw_listings_sourceId_externalId_key" ON "raw_listings"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_parameter_sets_version_key" ON "pricing_parameter_sets"("version");

-- CreateIndex
CREATE INDEX "pricing_parameter_sets_status_validFrom_idx" ON "pricing_parameter_sets"("status", "validFrom");

-- CreateIndex
CREATE INDEX "fx_rates_kind_validFrom_validTo_idx" ON "fx_rates"("kind", "validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_kind_base_quote_validFrom_key" ON "fx_rates"("kind", "base", "quote", "validFrom");

-- CreateIndex
CREATE INDEX "tariff_rules_hsCodeValue_originCountryCode_validFrom_validT_idx" ON "tariff_rules"("hsCodeValue", "originCountryCode", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "tariff_rules_parameterSetId_confidence_idx" ON "tariff_rules"("parameterSetId", "confidence");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_rules_parameterSetId_hsCodeValue_originCountryCode_p_key" ON "tariff_rules"("parameterSetId", "hsCodeValue", "originCountryCode", "powertrain", "validFrom");

-- CreateIndex
CREATE INDEX "freight_rates_originPortId_destinationPortId_validFrom_idx" ON "freight_rates"("originPortId", "destinationPortId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "freight_rates_parameterSetId_originPortId_destinationPortId_key" ON "freight_rates"("parameterSetId", "originPortId", "destinationPortId", "mode", "validFrom");

-- CreateIndex
CREATE INDEX "destination_cost_rules_parameterSetId_category_idx" ON "destination_cost_rules"("parameterSetId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "destination_cost_rules_parameterSetId_code_portId_validFrom_key" ON "destination_cost_rules"("parameterSetId", "code", "portId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "margin_rules_parameterSetId_code_key" ON "margin_rules"("parameterSetId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "addon_products_parameterSetId_code_key" ON "addon_products"("parameterSetId", "code");

-- CreateIndex
CREATE INDEX "market_references_topic_observedAt_idx" ON "market_references"("topic", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consolidations_reference_key" ON "consolidations"("reference");

-- CreateIndex
CREATE INDEX "consolidations_originPortId_destinationPortId_etd_idx" ON "consolidations"("originPortId", "destinationPortId", "etd");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_items_consolidationId_vehicleId_key" ON "consolidation_items"("consolidationId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_reference_key" ON "quotes"("reference");

-- CreateIndex
CREATE INDEX "quotes_status_createdAt_idx" ON "quotes"("status", "createdAt");

-- CreateIndex
CREATE INDEX "quotes_customerId_status_idx" ON "quotes"("customerId", "status");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_sortOrder_idx" ON "quote_line_items"("quoteId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "quote_readiness_quoteId_switchCode_key" ON "quote_readiness"("quoteId", "switchCode");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reference_key" ON "orders"("reference");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_customerId_status_idx" ON "orders"("customerId", "status");

-- CreateIndex
CREATE INDEX "order_status_events_orderId_createdAt_idx" ON "order_status_events"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "tracking_milestones_orderId_sortOrder_idx" ON "tracking_milestones"("orderId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_milestones_orderId_code_key" ON "tracking_milestones"("orderId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_code_key" ON "document_requirements"("code");

-- CreateIndex
CREATE INDEX "document_uploads_orderId_status_idx" ON "document_uploads"("orderId", "status");

-- CreateIndex
CREATE INDEX "gps_pings_orderId_recordedAt_idx" ON "gps_pings"("orderId", "recordedAt");

-- CreateIndex
CREATE INDEX "payments_orderId_status_idx" ON "payments"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_userId_key" ON "leads"("userId");

-- CreateIndex
CREATE INDEX "leads_status_createdAt_idx" ON "leads"("status", "createdAt");

-- CreateIndex
CREATE INDEX "chat_conversations_status_updatedAt_idx" ON "chat_conversations"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_categoryId_locale_key" ON "category_translations"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_locale_slug_key" ON "category_translations"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "posts_status_publishedAt_idx" ON "posts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "post_translations_locale_slug_idx" ON "post_translations"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_postId_locale_key" ON "post_translations"("postId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_locale_slug_key" ON "post_translations"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "pages_key_key" ON "pages"("key");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_pageId_locale_key" ON "page_translations"("pageId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_locale_slug_key" ON "page_translations"("locale", "slug");

-- CreateIndex
CREATE INDEX "channel_listings_channel_status_idx" ON "channel_listings"("channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "channel_listings_channel_vehicleId_key" ON "channel_listings"("channel", "vehicleId");

-- CreateIndex
CREATE INDEX "channel_sync_logs_listingId_createdAt_idx" ON "channel_sync_logs"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "social_assets_vehicleId_template_idx" ON "social_assets"("vehicleId", "template");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_createdAt_idx" ON "audit_logs"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "_PostToTag_B_index" ON "_PostToTag"("B");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ports" ADD CONSTRAINT "ports_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_agreement_countries" ADD CONSTRAINT "trade_agreement_countries_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "trade_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_agreement_countries" ADD CONSTRAINT "trade_agreement_countries_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trims" ADD CONSTRAINT "trims_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trims" ADD CONSTRAINT "trims_hsCodeId_fkey" FOREIGN KEY ("hsCodeId") REFERENCES "hs_codes"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_specs" ADD CONSTRAINT "vehicle_specs_trimId_fkey" FOREIGN KEY ("trimId") REFERENCES "trims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_trimId_fkey" FOREIGN KEY ("trimId") REFERENCES "trims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_hsCodeId_fkey" FOREIGN KEY ("hsCodeId") REFERENCES "hs_codes"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_originCountryCode_fkey" FOREIGN KEY ("originCountryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_originPortId_fkey" FOREIGN KEY ("originPortId") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_rawListingId_fkey" FOREIGN KEY ("rawListingId") REFERENCES "raw_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "scrape_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_listings" ADD CONSTRAINT "raw_listings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_listings" ADD CONSTRAINT "raw_listings_runId_fkey" FOREIGN KEY ("runId") REFERENCES "scrape_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_listings" ADD CONSTRAINT "raw_listings_matchedTrimId_fkey" FOREIGN KEY ("matchedTrimId") REFERENCES "trims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_parameter_sets" ADD CONSTRAINT "pricing_parameter_sets_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_overriddenById_fkey" FOREIGN KEY ("overriddenById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_rules" ADD CONSTRAINT "tariff_rules_parameterSetId_fkey" FOREIGN KEY ("parameterSetId") REFERENCES "pricing_parameter_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_rules" ADD CONSTRAINT "tariff_rules_hsCodeValue_fkey" FOREIGN KEY ("hsCodeValue") REFERENCES "hs_codes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_rules" ADD CONSTRAINT "tariff_rules_originCountryCode_fkey" FOREIGN KEY ("originCountryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_rules" ADD CONSTRAINT "tariff_rules_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "trade_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_rates" ADD CONSTRAINT "freight_rates_parameterSetId_fkey" FOREIGN KEY ("parameterSetId") REFERENCES "pricing_parameter_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_rates" ADD CONSTRAINT "freight_rates_originPortId_fkey" FOREIGN KEY ("originPortId") REFERENCES "ports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_rates" ADD CONSTRAINT "freight_rates_destinationPortId_fkey" FOREIGN KEY ("destinationPortId") REFERENCES "ports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_cost_rules" ADD CONSTRAINT "destination_cost_rules_parameterSetId_fkey" FOREIGN KEY ("parameterSetId") REFERENCES "pricing_parameter_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "margin_rules" ADD CONSTRAINT "margin_rules_parameterSetId_fkey" FOREIGN KEY ("parameterSetId") REFERENCES "pricing_parameter_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_products" ADD CONSTRAINT "addon_products_parameterSetId_fkey" FOREIGN KEY ("parameterSetId") REFERENCES "pricing_parameter_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidations" ADD CONSTRAINT "consolidations_originPortId_fkey" FOREIGN KEY ("originPortId") REFERENCES "ports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidations" ADD CONSTRAINT "consolidations_destinationPortId_fkey" FOREIGN KEY ("destinationPortId") REFERENCES "ports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_items" ADD CONSTRAINT "consolidation_items_consolidationId_fkey" FOREIGN KEY ("consolidationId") REFERENCES "consolidations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_items" ADD CONSTRAINT "consolidation_items_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_parameterSetId_fkey" FOREIGN KEY ("parameterSetId") REFERENCES "pricing_parameter_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_vehicles" ADD CONSTRAINT "quote_vehicles_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_vehicles" ADD CONSTRAINT "quote_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_addOnProductId_fkey" FOREIGN KEY ("addOnProductId") REFERENCES "addon_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_readiness" ADD CONSTRAINT "quote_readiness_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_milestones" ADD CONSTRAINT "tracking_milestones_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_milestones" ADD CONSTRAINT "tracking_milestones_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "document_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_pings" ADD CONSTRAINT "gps_pings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_pings" ADD CONSTRAINT "gps_pings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_interestVehicleId_fkey" FOREIGN KEY ("interestVehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_listings" ADD CONSTRAINT "channel_listings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_sync_logs" ADD CONSTRAINT "channel_sync_logs_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "channel_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_assets" ADD CONSTRAINT "social_assets_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

