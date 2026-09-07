import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/layout/AuthShell";
import type { Locale } from "@/i18n/routing";
import { RESET_TOKEN_TTL_MINUTES } from "@/modules/identity";
import { RequestResetForm } from "./RequestResetForm";

export default async function RecoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("auth.reset");
  const shared = await getTranslations("auth.login");

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      valueProp={shared("valueProp")}
      valuePropSub={shared("valuePropSub")}
      imageAlt={shared("imageAlt")}
    >
      <RequestResetForm
        locale={locale}
        minutes={RESET_TOKEN_TTL_MINUTES}
        labels={{
          email: t("email"),
          emailPlaceholder: shared("emailPlaceholder"),
          submit: t("submit"),
          back: t("back"),
          sentTitle: t("sentTitle"),
          sentBody: t.raw("sentBody") as string,
          resend: t("resend"),
          invalid: shared("invalid"),
        }}
      />
    </AuthShell>
  );
}
