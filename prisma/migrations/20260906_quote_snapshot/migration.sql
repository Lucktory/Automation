-- ===========================================================================
-- M5 · Instantánea de cotización: consecutivo atómico e inmutabilidad real
-- ---------------------------------------------------------------------------
-- Tres cosas que el esquema declaraba pero nadie hacía cumplir:
--
--   1. El consecutivo COT-AAAA-NNNN no tenía asignador. `reference UNIQUE` no
--      evita la colisión, solo la castiga con un 23505 que revienta la
--      transacción del segundo usuario.
--   2. "desde SENT la fila es INMUTABLE" era un comentario. No había disparador,
--      ni política, ni permiso revocado. Prisma Studio (`npm run db:studio`) y
--      cualquier `prisma.quote.update` la editaban sin resistencia.
--   3. `snapshot` era anulable y los totales tenían DEFAULT 0, así que una
--      cotización podía llegar a SENT sin nada que reimprimir.
--
-- Se aplica con:  node scripts/db-apply-sql.mjs prisma/migrations/20260906_quote_snapshot/migration.sql
-- ===========================================================================

-- --- 1 · Asignador del consecutivo ----------------------------------------
CREATE TABLE IF NOT EXISTS "quote_counters" (
    "issueYear" INTEGER NOT NULL,
    "next"      INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quote_counters_pkey" PRIMARY KEY ("issueYear")
);

-- --- 2 · Columnas del consecutivo y de la instantánea ----------------------
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "issueYear" INTEGER;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "sequence" INTEGER;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "snapshotVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "supersededById" TEXT;

-- La tabla está vacía (verificado antes de migrar), así que se puede exigir
-- NOT NULL sin rellenar nada. Sobre datos existentes esto habría necesitado un
-- backfill previo.
ALTER TABLE "quotes" ALTER COLUMN "issueYear" SET NOT NULL;
ALTER TABLE "quotes" ALTER COLUMN "sequence"  SET NOT NULL;

-- Sin instantánea no hay cotización reproducible; sin cifras, no hay oferta.
ALTER TABLE "quotes" ALTER COLUMN "snapshot" SET NOT NULL;
ALTER TABLE "quotes" ALTER COLUMN "subtotalUsd"   DROP DEFAULT;
ALTER TABLE "quotes" ALTER COLUMN "taxesCop"      DROP DEFAULT;
ALTER TABLE "quotes" ALTER COLUMN "landedCostCop" DROP DEFAULT;
ALTER TABLE "quotes" ALTER COLUMN "totalCop"      DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "quotes_issueYear_sequence_key"
    ON "quotes" ("issueYear", "sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_supersededById_key"
    ON "quotes" ("supersededById");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quotes_supersededById_fkey'
    ) THEN
        ALTER TABLE "quotes"
            ADD CONSTRAINT "quotes_supersededById_fkey"
            FOREIGN KEY ("supersededById") REFERENCES "quotes"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- --- 3 · Inmutabilidad desde SENT -----------------------------------------
-- Se hace cumplir en la BASE y no en la aplicación a propósito. Una guarda en
-- un repositorio la esquiva el siguiente `prisma.quote.update` que alguien
-- escriba, el seed, Prisma Studio, o una migración hecha a mano. Una oferta
-- comercial es irrevocable durante su plazo (C.Co. art. 846): si se puede
-- editar después de enviada, no es una oferta, es un borrador.
--
-- Tras SENT solo se permite mover el ESTADO de la cotización y sus marcas de
-- seguimiento. Las cifras, las líneas y la instantánea quedan congeladas.

CREATE OR REPLACE FUNCTION quote_is_frozen(status_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN status_value NOT IN ('DRAFT', 'INTERNAL_REVIEW');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION quotes_guard_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF quote_is_frozen(OLD."status"::TEXT) THEN
            RAISE EXCEPTION
                'La cotizacion % ya fue emitida (estado %) y no puede borrarse.',
                OLD."reference", OLD."status";
        END IF;
        RETURN OLD;
    END IF;

    IF quote_is_frozen(OLD."status"::TEXT) THEN
        -- Lista blanca: seguimiento del ciclo de vida, nada más.
        IF ROW(NEW."reference", NEW."issueYear", NEW."sequence", NEW."snapshot",
               NEW."snapshotVersion", NEW."parameterSetId", NEW."trmCommercial",
               NEW."trmFiscal", NEW."trmDate", NEW."subtotalUsd", NEW."taxesCop",
               NEW."landedCostCop", NEW."totalCop", NEW."totalCopCeiling",
               NEW."locale", NEW."customerId", NEW."validUntil")
           IS DISTINCT FROM
           ROW(OLD."reference", OLD."issueYear", OLD."sequence", OLD."snapshot",
               OLD."snapshotVersion", OLD."parameterSetId", OLD."trmCommercial",
               OLD."trmFiscal", OLD."trmDate", OLD."subtotalUsd", OLD."taxesCop",
               OLD."landedCostCop", OLD."totalCop", OLD."totalCopCeiling",
               OLD."locale", OLD."customerId", OLD."validUntil")
        THEN
            RAISE EXCEPTION
                'La cotizacion % ya fue emitida (estado %). Solo puede cambiar su estado y sus marcas de seguimiento; para cambiar cifras se emite una nueva y esta queda SUPERSEDED.',
                OLD."reference", OLD."status";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "quotes_immutable_after_sent" ON "quotes";
CREATE TRIGGER "quotes_immutable_after_sent"
    BEFORE UPDATE OR DELETE ON "quotes"
    FOR EACH ROW EXECUTE FUNCTION quotes_guard_immutability();

-- Las filas hijas se congelan con la madre. Sin esto se podría reescribir el
-- arancel de una cotización enviada editando su línea, sin tocar la cabecera.
CREATE OR REPLACE FUNCTION quote_children_guard_immutability()
RETURNS TRIGGER AS $$
DECLARE
    parent_status TEXT;
    parent_ref    TEXT;
    parent_id     TEXT;
BEGIN
    parent_id := COALESCE(NEW."quoteId", OLD."quoteId");
    SELECT "status"::TEXT, "reference" INTO parent_status, parent_ref
        FROM "quotes" WHERE "id" = parent_id;

    -- Si la madre ya no existe estamos dentro de un DELETE en cascada legítimo.
    IF parent_status IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF quote_is_frozen(parent_status) THEN
        RAISE EXCEPTION
            'La cotizacion % ya fue emitida (estado %): sus lineas no se pueden modificar.',
            parent_ref, parent_status;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "quote_line_items_immutable" ON "quote_line_items";
CREATE TRIGGER "quote_line_items_immutable"
    BEFORE UPDATE OR DELETE ON "quote_line_items"
    FOR EACH ROW EXECUTE FUNCTION quote_children_guard_immutability();

DROP TRIGGER IF EXISTS "quote_vehicles_immutable" ON "quote_vehicles";
CREATE TRIGGER "quote_vehicles_immutable"
    BEFORE UPDATE OR DELETE ON "quote_vehicles"
    FOR EACH ROW EXECUTE FUNCTION quote_children_guard_immutability();
