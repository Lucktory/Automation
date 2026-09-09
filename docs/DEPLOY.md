# Despliegue

Guía para poner Automoción OS en línea. Escrita para un despliegue de
**demostración** — el que se le enseña al cliente — y señalando en cada punto
qué cambia si algún día pasa a ser un entorno real.

---

## 1. Qué hace falta

| Pieza | Para qué | Nota |
|---|---|---|
| Base de datos Postgres | Todo | Neon. El driver serverless ya está configurado. |
| Plataforma de hosting | Servir Next.js 15 | Vercel es la ruta corta: detecta Next sin configuración. |
| Node 20.11 o superior | Build | Declarado en `engines`. |

No hace falta nada más para que la demostración funcione. Correo, pasarela de
pago y feed de TRM son opcionales y el sistema arranca sin ellos.

---

## 2. Variables de entorno

Copia los nombres de [`.env.example`](../.env.example). Las dos primeras son las
únicas imprescindibles:

| Variable | Obligatoria | Qué es |
|---|---|---|
| `DATABASE_URL` | **Sí** | Cadena de conexión de Neon. Debe llevar `?sslmode=require`. |
| `AUTH_SECRET` | **Sí** | Firma las cookies de sesión. Genérala con `openssl rand -base64 32`. |
| `AUTH_URL` | **Sí** en producción | La URL pública del despliegue, con `https://`. Si no coincide con el dominio real, el inicio de sesión redirige a ninguna parte. |
| `SEED_ADMIN_PASSWORD` | Sólo en demo | Ver §4. Sin ella no se puede entrar a un despliegue de producción. |
| `TRM_API_URL`, `TRM_API_TOKEN` | No | Feed diario de la tasa de cambio. Sin ellas la TRM queda en el último valor sembrado. |
| `RESEND_API_KEY` | No | Envío de correo. Sin ella los correos se registran en consola. |
| `ANTHROPIC_API_KEY` | No | Funciones asistidas. |
| `BLOB_READ_WRITE_TOKEN` | No | Almacenamiento de archivos. |
| `CRON_SECRET` | No | Protege los endpoints programados. |

`AUTH_URL` es la que más despliegues rompe. Si el inicio de sesión «no hace
nada», empieza por comprobarla.

---

## 3. Base de datos

El esquema se aplica con las migraciones de `prisma/migrations`, en orden:

```bash
npx prisma migrate deploy
```

`migrate deploy` es la orden de despliegue: aplica lo pendiente y no pregunta
nada. **No uses `migrate dev` contra una base desplegada** — puede proponer
reiniciarla.

Las migraciones incluyen los disparadores de Postgres que hacen inmutables las
cotizaciones. Si se aplican con `prisma db push` en vez de con `migrate deploy`,
esos disparadores no se crean y una cotización emitida se puede editar por
detrás, que es exactamente lo que el diseño impide. Usa `migrate deploy`.

---

## 4. Datos de demostración

```bash
npm run seed:demo
```

Encadena, en este orden, que importa:

1. `db:seed` — parámetros verificados, puertos, catálogo, equipo.
2. `seed:quotes` — cotizaciones con su instantánea de cálculo.
3. `seed:orders` — pedidos repartidos por el embudo, con su historial de estados.
4. `seed:leads` — cartera de clientes y prospectos.
5. `seed:social` — piezas gráficas a partir del catálogo.

Los pasos 2 a 5 dependen del 1, y el 3 lee las cotizaciones del 2 para que un
pedido y su cotización pertenezcan a la misma persona.

### La contraseña, que es la trampa

La siembra crea las cuentas **sin contraseña cuando `NODE_ENV=production`**, y el
proveedor de credenciales rechaza a cualquier usuario sin `passwordHash`. Es lo
correcto para un entorno real —una credencial publicada en un repositorio no
puede existir— pero significa que en un despliegue normal **no se puede entrar**.

Para una demostración, define `SEED_ADMIN_PASSWORD` antes de sembrar:

```bash
SEED_ADMIN_PASSWORD='una-contraseña-larga' npx prisma migrate deploy && npm run seed:demo
```

Entonces todo el equipo sembrado usa esa contraseña. El usuario administrador es
`admin@automocion.os`.

Si algún día esto deja de ser una demostración: no definas la variable, y activa
las cuentas por invitación.

---

## 5. Build

```bash
npm run build
```

El script es `prisma generate && next build`. El `prisma generate` explícito no
es decorativo: las plataformas de despliegue cachean `node_modules`, y sin él el
build usa un cliente Prisma viejo —o ninguno— y la primera consulta revienta en
producción con un error que no dice eso.

---

## 5b. Si el build falla

### «Invalid environment configuration: … Invalid url»

Significa que la variable está PUESTA y mal formada, **no que falte**. Un valor
en blanco se trata como ausente desde `src/config/env.ts`, y todas las variables
salvo las tres del §2 son opcionales.

La causa habitual es haber pegado el valor **con comillas**. En un archivo `.env`
las comillas son sintaxis y el intérprete las retira; en el panel de un proveedor
se guardan como parte del valor, y `"postgresql://…"` entre comillas no es una
URL válida. `env.ts` ahora quita un par de comillas envolventes, pero conviene no
ponerlas: pega el valor desnudo.

La otra causa es copiar `.env.example` entero al panel, que arrastra media docena
de variables vacías. Define sólo las que vas a usar.

### «Failed to collect page data» / «Error occurred prerendering page»

Alguna pantalla intentó consultar la base de datos mientras compilaba. Las 22
pantallas que leen datos vivos declaran `export const dynamic = "force-dynamic"`
justamente para que eso no ocurra, así que este error significa que se añadió una
pantalla nueva con consultas y sin esa línea.

Se comprueba reproduciendo en local la condición del proveedor — un build sin
ninguna variable de entorno:

```bash
mv .env.local .env.local.hidden
npm run build                      # tiene que pasar igualmente
mv .env.local.hidden .env.local
```

Si ese build pasa, el del proveedor también. Es la comprobación que conviene
hacer antes de cada despliegue.

---

## 5c. Si la aplicación despliega pero no carga

El síntoma es una página que dice **«Application error: a server-side exception
has occurred»** y un código de dieciséis cifras. Ese mensaje es deliberadamente
opaco —Next no filtra detalles internos al visitante— y no distingue entre tres
causas que se arreglan de tres maneras distintas.

**Abre `/api/health`.** Responde las tres preguntas de una vez:

```
https://<tu-dominio>/api/health
```

Esa ruta **no pasa por el middleware**, así que sigue contestando aunque lo que
esté roto sea precisamente la autenticación, que es el caso más común. Nunca
devuelve el valor de una variable, sólo si está puesta.

| Lo que responde | Qué significa | Qué hacer |
|---|---|---|
| `"problem": "MISSING_ENV"` | Falta una de las tres obligatorias | Añádela y **vuelve a desplegar** |
| `"problem": "NOT_MIGRATED"` | La base responde pero le faltan tablas | `npx prisma migrate deploy` |
| `"problem": "NOT_SEEDED"` | Las tablas existen y están vacías | `npm run seed:demo` |
| `"problem": "DATABASE_UNREACHABLE"` | No se pudo consultar | Revisa que uses el endpoint `-pooler` |
| `"ok": true` con conteos | Todo bien por detrás | El fallo está en otra parte; mira los registros |

### La trampa: las variables no se aplican solas

Definir una variable en el panel del proveedor **no afecta al despliegue que ya
está corriendo**. Hay que volver a desplegar para que la tome. Es la causa
número uno de «ya la puse y sigue fallando».

### Por qué suele ser la autenticación

El middleware ejecuta Auth.js en **cada** petición, y Auth.js exige `AUTH_SECRET`
en producción: sin ella lanza una excepción antes de que se renderice nada, así
que **todas** las páginas fallan a la vez, incluida la portada. Si el sitio
entero está caído en lugar de una sola pantalla, empieza por ahí.

---

## 6. Comprobación después de desplegar

En este orden, porque cada uno descarta una causa distinta:

1. **`/es`** carga → el build y el hosting están bien.
2. **`/es/catalogo`** muestra vehículos con precio → la base responde y tiene datos.
3. **`/es/login`** acepta `admin@automocion.os` → `AUTH_SECRET`, `AUTH_URL` y la contraseña sembrada están bien.
4. **`/es/admin`** muestra cifras distintas de cero → la siembra completa corrió.
5. **`/en/admin`** muestra lo mismo en inglés → los dos idiomas están registrados.

Si 1 y 2 pasan pero 3 falla, es `AUTH_URL` o la contraseña, no la base.

---

## 7. Lo que sigue sin funcionar, a propósito

Es una demostración, y conviene saber dónde están los bordes antes de que los
encuentre el cliente:

- **El pago del checkout** no cobra: no hay pasarela conectada.
- **Los diálogos del back-office** («Nuevo cliente», «Generar piezas», «Publicar»)
  se abren, validan y confirman, pero todavía no escriben en la base.
- **Las acciones de las piezas sociales** (Publicar, Regenerar, Eliminar) son
  visuales; «Descargar» y «Copiar enlace» sí funcionan.
- **La TRM** no se actualiza sola mientras no se configure `TRM_API_URL`.

El motor de cálculo, el catálogo, las cotizaciones, el PDF y todas las pantallas
de lectura sí funcionan de verdad y contra datos reales.
