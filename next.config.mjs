import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  images: {
    remotePatterns: [],
  },

  /**
   * Estos paquetes NO deben pasar por el bundler del servidor.
   *
   * `ws` carga complementos nativos opcionales (`bufferutil`, `utf-8-validate`)
   * mediante `require` dinámico. Al empaquetarlo, webpack rompe esa resolución y
   * el WebSocket muere a mitad de consulta con `bufferUtil.mask is not a
   * function`, que llega disfrazado de "Connection terminated unexpectedly" —
   * un error que no apunta ni de lejos a su causa.
   *
   * Dejándolos como externos, Node los resuelve él mismo y el driver de Neon
   * funciona igual que fuera de Next. Hacen falta los tres: el adaptador y el
   * driver también arrastran `ws`.
   */
  serverExternalPackages: [
    "ws",
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
  ],
};

export default withNextIntl(nextConfig);
