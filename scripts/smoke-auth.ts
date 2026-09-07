import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

/**
 * Prueba de humo del flujo de cuenta, contra la base de datos REAL.
 *
 * Comprueba lo que ninguna prueba con dobles puede: que el registro escribe el
 * consentimiento, que el token se guarda hasheado, que caduca, que es de un
 * solo uso y que la contraseña nueva sirve para entrar.
 *
 *   npx tsx scripts/smoke-auth.ts
 */

const { accountPorts, usersDeps } = await import("../src/composition/container");
const { registerCustomer, requestPasswordReset, completePasswordReset } = await import(
  "../src/modules/identity"
);
const { prisma } = await import("../src/infra/db/prisma");
const bcrypt = (await import("bcryptjs")).default;

const EMAIL = `smoke.${Date.now()}@ejemplo.test`;
const PASSWORD = "Prueba-2026-Segura!";
const NEW_PASSWORD = "Otra-Clave-2026!";

const check = (label: string, ok: boolean) => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) process.exitCode = 1;
};

try {
  console.log("\n1. Registro");
  await registerCustomer(accountPorts, {
    name: "Prueba Humo",
    email: EMAIL,
    phone: "+573001234567",
    password: PASSWORD,
    locale: "es",
    consentVersion: "v1",
  });

  const created = await prisma.user.findUnique({ where: { email: EMAIL } });
  check("cuenta creada", created !== null);
  check("rol CLIENTE", created?.role === "CUSTOMER");
  check("estado ACTIVO", created?.status === "ACTIVE");
  check("consentimiento habeas data registrado", created?.dataConsentAt !== null);
  check("teléfono normalizado a E.164", created?.phone === "+573001234567");
  check(
    "contraseña hasheada, no en claro",
    created?.passwordHash !== null && created?.passwordHash !== PASSWORD,
  );
  check(
    "la contraseña verifica",
    await bcrypt.compare(PASSWORD, created?.passwordHash ?? ""),
  );

  console.log("\n2. Registro repetido (no debe revelar que ya existe)");
  const second = await registerCustomer(accountPorts, {
    name: "Otro",
    email: EMAIL,
    phone: "+573009999999",
    password: "Cualquiera-2026!",
    locale: "es",
    consentVersion: "v1",
  });
  check("no crea una segunda cuenta", second.created === false);
  check(
    "no sobrescribe la contraseña existente",
    await bcrypt.compare(PASSWORD, (await prisma.user.findUnique({ where: { email: EMAIL } }))?.passwordHash ?? ""),
  );

  console.log("\n3. Solicitud de restablecimiento");
  await requestPasswordReset(accountPorts, {
    email: EMAIL,
    locale: "es",
    baseUrl: "http://localhost:3000",
  });

  const stored = await prisma.verificationToken.findFirst({
    where: { identifier: EMAIL },
  });
  check("token guardado", stored !== null);
  check("token guardado HASHEADO (64 hex de sha256)", /^[0-9a-f]{64}$/.test(stored?.token ?? ""));
  check("token con caducidad futura", (stored?.expires.getTime() ?? 0) > Date.now());

  console.log("\n4. Restablecimiento con token inválido");
  const bad = await completePasswordReset(accountPorts, {
    token: "token-que-no-existe",
    newPassword: NEW_PASSWORD,
  });
  check("token inválido rechazado", bad === "INVALID_TOKEN");

  console.log("\n5. Restablecimiento con el token real");
  // El token en claro solo existe en el correo; para la prueba se regenera uno
  // y se guarda su hash, replicando lo que hizo `requestPasswordReset`.
  const plain = accountPorts.crypto.randomToken();
  await accountPorts.tokens.deleteAllFor(EMAIL);
  await accountPorts.tokens.create(
    EMAIL,
    accountPorts.crypto.hashToken(plain),
    new Date(Date.now() + 10 * 60 * 1000),
  );

  const ok = await completePasswordReset(accountPorts, {
    token: plain,
    newPassword: NEW_PASSWORD,
  });
  check("restablecimiento aceptado", ok === "OK");

  const after = await prisma.user.findUnique({ where: { email: EMAIL } });
  check("la contraseña nueva verifica", await bcrypt.compare(NEW_PASSWORD, after?.passwordHash ?? ""));
  check("la antigua ya no sirve", !(await bcrypt.compare(PASSWORD, after?.passwordHash ?? "")));

  console.log("\n6. Reutilización del mismo token");
  const reused = await completePasswordReset(accountPorts, {
    token: plain,
    newPassword: "Tercera-Clave-2026!",
  });
  check("token de un solo uso", reused === "INVALID_TOKEN");

  console.log("\n7. Correo desconocido");
  await requestPasswordReset(accountPorts, {
    email: "no.existe@ejemplo.test",
    locale: "es",
    baseUrl: "http://localhost:3000",
  });
  const ghost = await prisma.verificationToken.findFirst({
    where: { identifier: "no.existe@ejemplo.test" },
  });
  check("no crea token para cuentas inexistentes", ghost === null);

  void usersDeps;
} finally {
  await prisma.verificationToken.deleteMany({ where: { identifier: EMAIL } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  console.log("\nlimpieza hecha.");
  await prisma.$disconnect();
}
