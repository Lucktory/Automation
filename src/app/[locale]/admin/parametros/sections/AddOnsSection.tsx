import { getTranslations } from "next-intl/server";
import { DataTable, StatusPill, type Column } from "@/components/admin/DataTable";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Agregados: lo que el comprador puede sumar al pedido.
 *
 * La columna de compatibilidad no es un adorno. Un cargador de pared sólo tiene
 * sentido en un eléctrico o un híbrido enchufable, y ofrecérselo a quien compra
 * un gasolina es la clase de error que el cliente ve antes que nadie. La
 * restricción vive en el dato, así que la pantalla la enseña tal cual.
 */

interface AddOnRow {
  id: string;
  code: string;
  label: string;
  stage: string;
  category: string;
  currency: string;
  price: number;
  powertrains: readonly string[];
  active: boolean;
}

export async function AddOnsSection({ locale, setId }: { locale: Locale; setId: string }) {
  const t = await getTranslations("admin.parameters");

  const rows: AddOnRow[] = await prisma.addOnProduct
    .findMany({
      where: { parameterSetId: setId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        labelEs: true,
        labelEn: true,
        stage: true,
        category: true,
        currency: true,
        price: true,
        requiresPowertrain: true,
        active: true,
      },
    })
    .then((found) =>
      found.map((row) => ({
        id: row.id,
        code: row.code,
        label: locale === "es" ? row.labelEs : row.labelEn,
        stage: row.stage,
        category: row.category,
        currency: String(row.currency),
        price: Number(row.price),
        powertrains: row.requiresPowertrain.map(String),
        active: row.active,
      })),
    )
    .catch(() => []);

  const number = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 });

  const columns: readonly Column<AddOnRow>[] = [
    {
      key: "code",
      header: t("addons.columns.code"),
      numeric: true,
      render: (r) => <span className="text-xs text-text-muted">{r.code}</span>,
    },
    {
      key: "label",
      header: t("addons.columns.label"),
      render: (r) => <span className="text-text-primary">{r.label}</span>,
    },
    {
      key: "stage",
      header: t("addons.columns.stage"),
      render: (r) => <span className="text-xs whitespace-nowrap">{r.stage}</span>,
    },
    {
      key: "category",
      header: t("addons.columns.category"),
      render: (r) => <span className="text-xs whitespace-nowrap">{r.category}</span>,
    },
    {
      key: "price",
      header: t("addons.columns.price"),
      align: "right",
      numeric: true,
      render: (r) => (
        <span className="font-medium whitespace-nowrap text-text-primary">
          {r.currency} {number.format(r.price)}
        </span>
      ),
    },
    {
      key: "powertrain",
      header: t("addons.columns.powertrain"),
      render: (r) => (
        <span className="text-xs text-text-muted">
          {r.powertrains.length === 0 ? t("addons.anyPowertrain") : r.powertrains.join(", ")}
        </span>
      ),
    },
    {
      key: "status",
      header: t("addons.columns.status"),
      render: (r) =>
        r.active ? (
          <StatusPill tone="success">{t("addons.active")}</StatusPill>
        ) : (
          <StatusPill tone="muted">{t("addons.inactive")}</StatusPill>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      isDimmed={(r) => !r.active}
      emptyMessage={t("addons.empty")}
    />
  );
}
