-- Estado de publicación de las piezas sociales.
--
-- Una pieza generada no es una pieza publicada. Sin esta distinción el back
-- office no puede responder «¿cuántas quedan por sacar?», que es la cifra que
-- decide el trabajo del día, y la pantalla se veía obligada a inventarla.
--
-- El valor por defecto es DRAFT porque generar es barato y publicar no: nada
-- debe salir a una red social por omisión.

CREATE TYPE "SocialAssetStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED');

ALTER TABLE "social_assets"
  ADD COLUMN "status"      "SocialAssetStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "social_assets_status_createdAt_idx" ON "social_assets" ("status", "createdAt");
