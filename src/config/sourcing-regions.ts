/**
 * Regiones de abastecimiento, como DATOS.
 *
 * Los chips de "Origen" del simulador NO son países de fabricación: son los
 * mercados desde los que embarcamos. Por eso el diseño mezcla un país
 * (Canadá), una ciudad (Dubái) y un continente (Europa) — no es una
 * inconsistencia, es la forma en que el negocio agrupa sus puertos de salida.
 *
 * Cada región reúne los códigos de país de sus PUERTOS DE ORIGEN. Un chip solo
 * se muestra si la base de datos tiene al menos un puerto de origen en esa
 * región, así que abrir un mercado nuevo es agregar el puerto —y, si hace
 * falta, el código de país aquí—, nunca tocar un componente.
 *
 * Ojo con la distinción que sostiene el motor: la región decide DESDE DÓNDE
 * embarca la unidad; el TLC lo decide el país de FABRICACIÓN del vehículo, que
 * es otro campo. Un Kia coreano embarcado en Shanghái sigue siendo coreano para
 * el arancel.
 */
export interface SourcingRegion {
  /** Clave i18n dentro de `pricing.simulator.regions`. */
  key: string;
  /** Código de dos letras de la bandera; la dibuja el registro de `Flag`. */
  flagCode: string;
  /** Códigos ISO-3166-1 alfa-2 de los países cuyos puertos pertenecen aquí. */
  countryCodes: readonly string[];
}

export const SOURCING_REGIONS: readonly SourcingRegion[] = [
  { key: "US", flagCode: "US", countryCodes: ["US"] },
  { key: "CN", flagCode: "CN", countryCodes: ["CN"] },
  { key: "AE", flagCode: "AE", countryCodes: ["AE"] },
  { key: "EU", flagCode: "EU", countryCodes: ["DE", "BE", "NL", "SE", "ES", "IT", "FR"] },
  { key: "CA", flagCode: "CA", countryCodes: ["CA"] },
];


/** La región a la que pertenece un país, o `null` si no está mapeado. */
export function regionOfCountry(countryCode: string): SourcingRegion | null {
  return (
    SOURCING_REGIONS.find((region) => region.countryCodes.includes(countryCode)) ?? null
  );
}
