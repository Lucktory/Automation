import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DEMO_POSTS } from "@/config/demo-content";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Blog.
 *
 * Lee del registro de contenido, no de una lista escrita aquí, así que el
 * back-office muestra exactamente los mismos artículos. Cuando exista el CMS,
 * cambia el proveedor de datos y esta página no se entera.
 */
export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");
  const isEs = locale === "es";

  const posts = DEMO_POSTS.filter((post) => post.status === "PUBLISHED");
  const date = new Intl.DateTimeFormat(isEs ? "es-CO" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro title={t("blog.title")} subtitle={t("blog.subtitle")} />

        {posts.length === 0 ? (
          <p className="mt-10 text-sm text-text-muted">{t("blog.empty")}</p>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={{ pathname: "/blog/[slug]", params: { slug: post.slug } }}
                  className="group flex h-full flex-col rounded-card border border-border bg-surface p-5 transition-colors hover:border-border-strong"
                >
                  <p className="text-xs text-text-muted">
                    {date.format(new Date(post.publishedAt))} ·{" "}
                    <span data-numeric>
                      {t("blog.minutes", { minutes: post.readingMinutes })}
                    </span>
                  </p>
                  <h2 className="mt-2 font-display text-base leading-snug font-semibold text-text-primary group-hover:text-accent">
                    {isEs ? post.titleEs : post.titleEn}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {isEs ? post.excerptEs : post.excerptEn}
                  </p>
                  <span className="mt-auto pt-4 text-xs text-primary">
                    {t("blog.readMore")} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
