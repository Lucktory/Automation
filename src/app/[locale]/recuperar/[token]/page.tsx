import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/layout/AuthShell";
import type { Locale } from "@/i18n/routing";
import { ResetForm } from "./ResetForm";

/**
 * Restablecimiento con token.
 *
 * El token NO se valida al pintar la página: se consume al enviar el formulario.
 * Validarlo aquí lo gastaría con solo abrir el enlace — y los clientes de correo
 * hacen exactamente eso al previsualizar.
 */
export default async function ResetPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("auth.reset");
  const register = await getTranslations("auth.register");
  const shared = await getTranslations("auth.login");

  return (
    <AuthShell
      title={t("newTitle")}
      subtitle={t("newSubtitle")}
      valueProp={shared("valueProp")}
      valuePropSub={shared("valuePropSub")}
      imageAlt={shared("imageAlt")}
    >
      <ResetForm
        token={token}
        signInHref={`/${locale}/login`}
        labels={{
          newPassword: t("newPassword"),
          confirm: t("confirm"),
          showPassword: shared("showPassword"),
          strength: {
            weak: register("strength.weak"),
            fair: register("strength.fair"),
            strong: register("strength.strong"),
          },
          save: t("save"),
          doneTitle: t("doneTitle"),
          doneBody: t("doneBody"),
          signIn: shared("submit"),
          errors: {
            mismatch: t("mismatch"),
            invalidToken: t("invalidToken"),
            weakPassword: register("weakPassword"),
          },
        }}
      />
    </AuthShell>
  );
}
