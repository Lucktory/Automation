import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation primitives.
 *
 * Application code MUST use these instead of `next/link` and `next/navigation`,
 * and must reference route keys (`/catalogo/[slug]`) rather than literal URLs —
 * the routing table decides what the path looks like in each locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
