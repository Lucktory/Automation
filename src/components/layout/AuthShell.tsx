import Image from "next/image";
import { BRAND_IMAGES } from "@/config/brand-images";
import { Logo } from "@/components/ui/Logo";

/**
 * Marco compartido de las pantallas de acceso.
 *
 * Login, registro y recuperación usan el mismo layout partido del diseño
 * aprobado. Extraerlo evita que las tres se separen visualmente con el tiempo,
 * que es exactamente lo que pasa cuando cada una repite su propio marcado.
 *
 * El velo sobre la fotografía no es decorativo: sin él el titular blanco no
 * alcanza contraste AA sobre las zonas claras del cielo.
 */
export function AuthShell({
  title,
  subtitle,
  valueProp,
  valuePropSub,
  imageAlt,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  valueProp: string;
  valuePropSub: string;
  imageAlt: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const image = BRAND_IMAGES.authPanel;

  return (
    <main className="flex min-h-screen bg-bg">
      <section className="relative hidden w-5/12 shrink-0 overflow-hidden lg:block">
        <Image
          src={image.src}
          alt={imageAlt}
          fill
          priority
          sizes="(min-width: 1024px) 42vw, 0px"
          className="object-cover"
          style={{ objectPosition: image.position }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/40"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo variant="full" height={26} priority />
          <div className="max-w-sm">
            <p className="font-display text-[1.75rem] leading-snug font-semibold text-text-primary">
              {valueProp}
            </p>
            <p className="mt-3 text-sm text-text-secondary">{valuePropSub}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-[420px]">
          {/* En móvil desaparece el panel de marca, así que el logo va aquí: una
              pantalla de acceso sin identificar el sitio pide credenciales sin
              decir a quién. */}
          <Logo variant="full" height={24} className="mb-8 lg:hidden" />

          <div className="rounded-card border border-border bg-surface p-6 sm:p-8">
            <h1 className="font-display text-2xl font-semibold text-text-primary">
              {title}
            </h1>
            <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
            {children}
          </div>

          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
