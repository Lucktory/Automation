import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DEMO_POSTS, postBySlug } from "@/config/demo-content";
import { Link } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";

/**
 * Un artículo.
 *
 * Se prerrenderiza en la compilación: el contenido es fijo y el buscador debe
 * encontrarlo sin ejecutar nada. `generateStaticParams` cubre los dos idiomas
 * porque las dos URLs se indexan por separado.
 */

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    DEMO_POSTS.map((post) => ({ locale, slug: post.slug })),
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");

  const post = postBySlug(slug);
  if (!post) notFound();

  const isEs = locale === "es";
  const date = new Intl.DateTimeFormat(isEs ? "es-CO" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const body = isEs ? post.bodyEs : post.bodyEn;

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={13} aria-hidden />
          {t("blog.backToBlog")}
        </Link>

        <article className="mt-6">
          <p className="text-xs text-text-muted">
            {date.format(new Date(post.publishedAt))} · {post.author} ·{" "}
            <span data-numeric>{t("blog.minutes", { minutes: post.readingMinutes })}</span>
          </p>

          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-[-0.01em] text-text-primary">
            {isEs ? post.titleEs : post.titleEn}
          </h1>

          <p className="mt-4 border-l-2 border-accent pl-4 text-base leading-relaxed text-text-secondary">
            {isEs ? post.excerptEs : post.excerptEn}
          </p>

          <div className="mt-8 flex flex-col gap-5">
            {body.map((paragraph, index) => (
              <p
                key={index}
                className="text-[0.9375rem] leading-relaxed text-text-secondary"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
