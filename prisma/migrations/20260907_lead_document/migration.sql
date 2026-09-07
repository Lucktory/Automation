-- Documento de identidad en el prospecto.
--
-- `users` ya lo guardaba, pero la mitad de la cartera son personas que todavía
-- no tienen cuenta: sin este par de columnas la pantalla de clientes no puede
-- mostrar la columna «Documento» para ellas y la tabla queda a medias.
--
-- No es un dato cosmético: sin cédula o NIT no hay declaración de importación
-- posible, así que se pide antes de que el prospecto se convierta en cliente.

ALTER TABLE "leads"
  ADD COLUMN "documentType" TEXT,
  ADD COLUMN "documentId"   TEXT;
