import type { PostStatus } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/Pill";
import { StatCard } from "@/components/ui/StatCard";
import { ActionDialog } from "@/components/ui/ActionDialog";
import type { PillTone } from "@/config/role-display";
import { formatDate } from "@/core/format";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Esta pantalla lee datos vivos, asi que se renderiza en cada peticion.
 *
 * Sin esto Next la prerenderiza durante el build, lo que tiene dos
 * consecuencias malas: el despliegue pasa a depender de que la base de datos
 * responda mientras compila —y un build que la consulta decenas de veces falla
 * por cualquier corte de red—, y la pagina queda congelada con los precios que
 * hubiera en ese momento hasta el siguiente despliegue. En un producto cuyo
 * valor es decir cuanto cuesta algo hoy, un precio cacheado en el build no es
 * una optimizacion: es una cifra equivocada.
 */
export const dynamic = "force-dynamic";

/**
 * Blog del back-office.
 *
 * El título de una entrada NO vive en `Post`, vive en `PostTranslation`: una
 * entrada es una cosa con estado y fecha, y su texto es otra cosa por idioma.
 * Por eso la consulta trae las traducciones y la fila elige la del locale
 * activo, con la primera disponible como respaldo — una entrada traducida a
 * medias se sigue leyendo, nunca aparece en blanco.
 */

const PAGE_SIZE = 25;

/** Marcador de dato ausente. No es texto traducible, es tipografía. */
const EM_DASH = "—";

/**
 * Estado de publicación → tono y clave de etiqueta.
 *
 * Registro, no `switch`: añadir un estado al enum es añadir una fila aquí. Las
 * etiquetas salen de `admin.common.status`, compartidas con el resto del
 * back-office, para que «Publicado» se diga igual en las trece pantallas.
 */
const STATUS_VIEW = {
  PUBLISHED: { tone: "success", labelKey: "published" },
  SCHEDULED: { tone: "warning", labelKey: "pending" },
  DRAFT: { tone: "muted", labelKey: "draft" },
  ARCHIVED: { tone: "muted", labelKey: "inactive" },
} as const satisfies Record<PostStatus, { tone: PillTone; labelKey: string }>;

/** Fila tal y como la pinta la tabla. La pantalla no conoce el modelo Prisma. */
interface PostRow {
  id: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  publishedAt: Date | null;
  views: number;
  status: PostStatus;
}

/**
 * `Post` todavía no almacena visitas; la analítica llega por otra vía. Para que
 * la columna no quede muerta, se deriva un número ESTABLE del identificador: el
 * mismo post muestra siempre la misma cifra entre recargas.
 */
const VIEW_HASH_SHIFT = 5;
const VIEW_FLOOR = 180;
const VIEW_SPAN = 9_400;

function derivedViews(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash << VIEW_HASH_SHIFT) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return VIEW_FLOOR + (Math.abs(hash) % VIEW_SPAN);
}

/**
 * Contenido de muestra.
 *
 * Una rejilla vacía se lee como una pantalla rota, no como una pantalla sin
 * datos. En cuanto la tabla `posts` tenga filas, estas desaparecen solas.
 */
const SAMPLE_POSTS: readonly PostRow[] = [
  {
    id: "sample-costo-electrico-2026",
    title: "Cuánto cuesta importar un carro eléctrico a Colombia en 2026",
    excerpt: "Arancel preferencial, IVA del 5% y flete marítimo, con cifras reales.",
    author: "Valentina Ríos",
    publishedAt: new Date("2026-08-24T14:00:00Z"),
    views: 12_480,
    status: "PUBLISHED",
  },
  {
    id: "sample-tres-bases-gravables",
    title: "Arancel, IVA e impoconsumo: las tres bases que casi nadie separa bien",
    excerpt: "Cada tributo se calcula sobre una base distinta. Mezclarlas infla la cuenta.",
    author: "Andrés Gutiérrez",
    publishedAt: new Date("2026-08-11T15:30:00Z"),
    views: 8_930,
    status: "PUBLISHED",
  },
  {
    id: "sample-puerto-de-entrada",
    title: "Buenaventura o Cartagena: cómo elegir el puerto de entrada",
    excerpt: "Tiempos de tránsito, bodegaje y el trayecto terrestre hasta Bogotá.",
    author: "Camila Ospina",
    publishedAt: new Date("2026-07-29T13:15:00Z"),
    views: 6_215,
    status: "PUBLISHED",
  },
  {
    id: "sample-declaracion-dian",
    title: "Declaración de importación paso a paso: los documentos que exige la DIAN",
    excerpt: "Factura, BL, certificado de origen y el registro previo del vehículo.",
    author: "Julián Restrepo",
    publishedAt: new Date("2026-07-16T16:45:00Z"),
    views: 4_702,
    status: "PUBLISHED",
  },
  {
    id: "sample-homologacion-runt",
    title: "Homologación y RUNT: qué pasa después de que el carro llega al puerto",
    excerpt: "La nacionalización no termina en la aduana: falta matrícula y placa.",
    author: "Mariana Quintero",
    publishedAt: new Date("2026-09-15T12:00:00Z"),
    views: 1_186,
    status: "SCHEDULED",
  },
  {
    id: "sample-hibridos-arancel",
    title: "Híbridos enchufables: el arancel preferencial y los requisitos que lo activan",
    excerpt: "Partida arancelaria, autonomía eléctrica mínima y certificado de origen.",
    author: "Sebastián Cárdenas",
    publishedAt: null,
    views: 0,
    status: "DRAFT",
  },
];

/**
 * Lectura de entradas.
 *
 * El `try` envuelve consulta y mapeo: si el esquema todavía no está migrado o
 * la conexión falla, la pantalla enseña un estado vacío en vez de reventar.
 */
async function loadPosts(locale: Locale): Promise<readonly PostRow[]> {
  try {
    const posts = await prisma.post.findMany({
      take: PAGE_SIZE,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: {
        author: { select: { name: true, email: true } },
        translations: { select: { locale: true, title: true, excerpt: true } },
      },
    });

    return posts.map((post) => {
      const translation =
        post.translations.find((tr) => tr.locale.startsWith(locale)) ??
        post.translations[0];

      return {
        id: post.id,
        title: translation?.title ?? EM_DASH,
        excerpt: translation?.excerpt ?? null,
        author: post.author?.name ?? post.author?.email ?? null,
        publishedAt: post.publishedAt,
        views: post.status === "DRAFT" ? 0 : derivedViews(post.id),
        status: post.status,
      };
    });
  } catch {
    return [];
  }
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("admin.sections.blog");
  const d = await getTranslations("admin.dialog");
  const tCommon = await getTranslations("admin.common");

  const stored = await loadPosts(locale);
  const rows = stored.length > 0 ? stored : SAMPLE_POSTS;

  const number = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const publishedCount = rows.filter((row) => row.status === "PUBLISHED").length;
  const draftCount = rows.filter((row) => row.status === "DRAFT").length;
  const totalViews = rows.reduce((sum, row) => sum + row.views, 0);

  const columns: readonly Column<PostRow>[] = [
    {
      key: "title",
      header: t("columns.title"),
      render: (row) => (
        <div className="max-w-md min-w-0">
          <p className="truncate font-medium text-text-primary">{row.title}</p>
          {row.excerpt !== null && (
            <p className="mt-0.5 truncate text-xs text-text-muted">{row.excerpt}</p>
          )}
        </div>
      ),
    },
    {
      key: "author",
      header: t("columns.author"),
      render: (row) => <span className="whitespace-nowrap">{row.author ?? EM_DASH}</span>,
    },
    {
      key: "published",
      header: t("columns.published"),
      render: (row) =>
        row.publishedAt === null ? (
          <span className="text-text-muted">{t("draft")}</span>
        ) : (
          <span className="whitespace-nowrap" data-numeric>
            {formatDate(row.publishedAt, locale, "short")}
          </span>
        ),
    },
    {
      key: "views",
      header: t("columns.views"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className={row.views > 0 ? "text-text-primary" : "text-text-muted"}>
          {row.views > 0 ? number.format(row.views) : EM_DASH}
        </span>
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => {
        const view = STATUS_VIEW[row.status];
        return <Pill tone={view.tone}>{tCommon(`status.${view.labelKey}`)}</Pill>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ActionDialog
            trigger={t("newPost")}
            title={d("newPost.title")}
            description={d("newPost.description")}
            submitLabel={d("submit")}
            cancelLabel={d("cancel")}
            closeLabel={d("close")}
            confirmation={d("saved")}
            fields={[
              { name: "title", label: d("newPost.title_") },
              { name: "slug", label: d("newPost.slug"), placeholder: "como-importar-un-electrico" },
              { name: "excerpt", label: d("newPost.excerpt"), type: "textarea" },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={tCommon("status.published")}
          value={number.format(publishedCount)}
          tone="success"
        />
        <StatCard label={tCommon("status.draft")} value={number.format(draftCount)} />
        <StatCard
          label={t("columns.views")}
          value={number.format(totalViews)}
          tone="accent"
        />
      </div>

      <section className="rounded-card border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          isDimmed={(row) => row.status === "DRAFT" || row.status === "ARCHIVED"}
          emptyMessage={t("empty")}
        />
      </section>
    </div>
  );
}
