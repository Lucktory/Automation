import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { LOCALES, type Locale } from "@/i18n/routing";
import "@/styles/tokens.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Automoción OS",
    template: "%s · Automoción OS",
  },
  description:
    "Importación de vehículos a Colombia con el costo puesto en destino calculado línea por línea.",
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(LOCALES as readonly string[]).includes(locale)) {
    notFound();
  }

  setRequestLocale(locale as Locale);
  const messages = await getMessages();

  return (
    /* Sin `data-theme`: el tema por defecto es el que vive en `:root`, que ahora
       es el claro. El atributo solo se escribe cuando alguien elige el oscuro
       explícitamente, de modo que el valor por defecto no depende de que una
       segunda regla lo pise. */
    <html
      lang={locale}
      className={`${inter.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
