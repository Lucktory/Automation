/**
 * Datos de la empresa emisora, en un solo sitio.
 *
 * Los imprime el pie del PDF de propuesta y los edita la pantalla
 * /admin/ajustes. Vivían duplicados dentro de esa pantalla; con dos copias, el
 * día que cambie el NIT una de las dos se queda vieja, y la que se manda al
 * cliente es justamente la del PDF.
 *
 * OJO con la nota legal: NO debe afirmar un plazo de validez fijo. El sistema
 * calcula la vigencia de cada cotización a partir de la frescura de su tarifa de
 * flete (`quoteValidity`), así que una nota que diga «15 días» contradice la
 * fecha impresa dos centímetros más arriba en el mismo documento. El plazo se
 * imprime, no se afirma.
 */
export interface CompanyProfile {
  readonly legalName: string;
  readonly nit: string;
  readonly address: string;
  readonly city: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
  /** Nota legal al pie de la propuesta. Sin plazos: el plazo va calculado. */
  readonly quoteFooter: string;
}

export const COMPANY_PROFILE: CompanyProfile = {
  legalName: "Automoción OS Colombia S.A.S.",
  nit: "901.456.789-3",
  address: "Calle 100 # 19-61, Oficina 802",
  city: "Bogotá D.C.",
  phone: "+57 601 745 2280",
  email: "comercial@automocionos.co",
  website: "https://automocionos.co",
  quoteFooter:
    "Los valores de esta propuesta son una estimación liquidada con la TRM y con los " +
    "aranceles, el IVA y el impuesto al consumo vigentes en la fecha de emisión. La " +
    "liquidación definitiva de los tributos la determina la autoridad aduanera al " +
    "momento de la declaración de importación. La propuesta está sujeta a la " +
    "disponibilidad del vehículo en origen y al resultado del reconocimiento aduanero.",
};
