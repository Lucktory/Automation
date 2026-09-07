import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/layout/AuthShell";
import type { Locale } from "@/i18n/routing";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("auth.register");
  const shared = await getTranslations("auth.login");

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      valueProp={shared("valueProp")}
      valuePropSub={shared("valuePropSub")}
      imageAlt={shared("imageAlt")}
      footer={
        <p className="text-center text-[0.8125rem] text-text-muted">
          {t("haveAccount")}{" "}
          <Link href={`/${locale}/login`} className="text-primary hover:underline">
            {t("signIn")}
          </Link>
        </p>
      }
    >
      <RegisterForm
        locale={locale}
        labels={{
          name: t("name"),
          namePlaceholder: t("namePlaceholder"),
          email: t("email"),
          emailPlaceholder: t("emailPlaceholder"),
          phone: t("phone"),
          phonePlaceholder: t("phonePlaceholder"),
          password: t("password"),
          showPassword: shared("showPassword"),
          strength: {
            weak: t("strength.weak"),
            fair: t("strength.fair"),
            strong: t("strength.strong"),
          },
          consent: t("consent"),
          consentLink: t("consentLink"),
          consentLaw: t("consentLaw"),
          submit: t("submit"),
          doneTitle: t("doneTitle"),
          doneBody: t("doneBody"),
          signInHref: `/${locale}/login`,
          signIn: t("signIn"),
          errors: {
            invalid: t("invalid"),
            weakPassword: t("weakPassword"),
          },
        }}
      />
    </AuthShell>
  );
}
