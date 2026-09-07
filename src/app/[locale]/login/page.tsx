import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/layout/AuthShell";
import type { Locale } from "@/i18n/routing";
import { LoginForm } from "./LoginForm";

/**
 * Inicio de sesión.
 *
 * El marco partido vive en `AuthShell`, compartido con registro y recuperación:
 * tres copias del mismo layout se separan visualmente en cuanto alguien toca
 * una sola.
 */
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("auth.login");

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      valueProp={t("valueProp")}
      valuePropSub={t("valuePropSub")}
      imageAlt={t("imageAlt")}
    >
      <LoginForm
        locale={locale}
        labels={{
          email: t("email"),
          password: t("password"),
          submit: t("submit"),
          forgot: t("forgot"),
          invalid: t("invalid"),
          magicLink: t("magicLink"),
          or: t("or"),
          noAccount: t("noAccount"),
          register: t("register"),
          showPassword: t("showPassword"),
        }}
      />
    </AuthShell>
  );
}
