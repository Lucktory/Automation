import type { Permission } from "@/modules/identity";
import { LOCALES } from "@/i18n/routing";

/**
 * El árbol de navegación del back-office, como DATOS.
 *
 * Los componentes de navegación no nombran ninguna página: reciben este árbol y
 * lo pintan. Añadir una sección es añadir un objeto aquí, y su permiso decide
 * quién la ve — así la barra lateral nunca muestra una ruta que el usuario no
 * puede abrir.
 */

export interface AdminNavItem {
  /** Clave i18n dentro de `admin.nav`. */
  key: string;
  href: string;
  /** Nombre del icono en lucide-react. */
  icon: string;
  permission: Permission;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: "dashboard", href: "/admin", icon: "LayoutDashboard", permission: "admin.access" },
  { key: "inventory", href: "/admin/inventario", icon: "Car", permission: "inventory.read" },
  { key: "parameters", href: "/admin/parametros", icon: "SlidersHorizontal", permission: "parameters.read" },
  { key: "consolidation", href: "/admin/consolidacion", icon: "Container", permission: "quotes.read" },
  { key: "quotes", href: "/admin/cotizaciones", icon: "FileText", permission: "quotes.read" },
  { key: "orders", href: "/admin/pedidos", icon: "PackageCheck", permission: "orders.read" },
  { key: "clients", href: "/admin/clientes", icon: "Users", permission: "quotes.read" },
  { key: "sources", href: "/admin/fuentes", icon: "Database", permission: "inventory.read" },
  { key: "omnichannel", href: "/admin/omnicanal", icon: "Share2", permission: "inventory.read" },
  { key: "social", href: "/admin/social", icon: "Image", permission: "content.write" },
  { key: "blog", href: "/admin/blog", icon: "Newspaper", permission: "content.write" },
  { key: "users", href: "/admin/usuarios", icon: "UserCog", permission: "users.read" },
  { key: "settings", href: "/admin/ajustes", icon: "Settings", permission: "settings.write" },
];

/** Pestañas de /admin/parametros. Mismo principio: datos, no JSX repetido. */
export const PARAMETER_TABS = [
  { key: "fx", slug: "divisas", icon: "DollarSign" },
  { key: "freight", slug: "fletes", icon: "Ship" },
  { key: "tariffs", slug: "aranceles", icon: "FileText" },
  { key: "destination", slug: "destino", icon: "MapPin" },
  { key: "addons", slug: "agregados", icon: "PlusSquare" },
  { key: "margins", slug: "margenes", icon: "TrendingUp" },
] as const;

export type ParameterTabKey = (typeof PARAMETER_TABS)[number]["key"];
export type ParameterTabSlug = (typeof PARAMETER_TABS)[number]["slug"];

/**
 * Qué pestaña de parámetros pide una URL.
 *
 * Un slug desconocido cae en la primera pestaña en vez de dejar la pantalla en
 * blanco: una URL vieja o mal escrita tiene que enseñar algo.
 */
export function parameterTabBySlug(slug: string | undefined) {
  return PARAMETER_TABS.find((tab) => tab.slug === slug) ?? PARAMETER_TABS[0];
}

/**
 * Navegación pública del sitio, como DATOS.
 *
 * El encabezado no nombra ninguna ruta: recorre esta lista. `href` es una clave
 * de la tabla de rutas de `i18n/routing`, no una URL — el segmento traducido lo
 * decide el enrutador, así que /es/como-trabajamos y /en/how-it-works salen de
 * la misma entrada.
 */
export interface PublicNavItem {
  /** Clave i18n dentro de `common.nav`. */
  key: string;
  href: "/catalogo" | "/como-trabajamos" | "/mapa-global" | "/blog";
}

export const PUBLIC_NAV: readonly PublicNavItem[] = [
  { key: "catalog", href: "/catalogo" },
  { key: "howItWorks", href: "/como-trabajamos" },
  { key: "globalMap", href: "/mapa-global" },
  { key: "blog", href: "/blog" },
];

/**
 * Qué sección del back-office corresponde a una ruta.
 *
 * Lo usan la barra lateral (para marcar el ítem activo) y la barra superior
 * (para la última miga). Estaba duplicado en las dos, con su propia expresión
 * regular de locales escrita a mano; una sola función evita que el resaltado y
 * la miga acaben diciendo cosas distintas sobre la misma pantalla.
 *
 * El prefijo de idioma se quita a partir de la lista real de locales, no de un
 * `(es|en)` a mano: añadir portugués mañana no puede romper el resaltado.
 */
export function activeAdminItem(
  items: readonly AdminNavItem[],
  pathname: string,
): AdminNavItem | undefined {
  const stripped = pathname.replace(new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`), "");
  // El más específico gana: /admin/pedidos no debe activarse por /admin.
  return [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) =>
      item.href === "/admin" ? stripped === "/admin" : stripped.startsWith(item.href),
    );
}
