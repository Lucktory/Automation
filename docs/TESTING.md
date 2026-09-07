# Cómo probar

Dos formas: **automática** (un comando, comprueba que nada esté roto) y **manual**
(el recorrido que hará el cliente en la demostración).

---

## 0 · Arrancar

```bash
npm run dev
```

Queda en <http://localhost:3000>. La raíz redirige a `/es`.

Si la base de datos está vacía o quieres volver al punto de partida:

```bash
npm run db:seed        # catálogo, usuarios, parámetros, tarifas
npm run price:catalog  # calcula el costo puesto en Colombia de cada vehículo
npm run seed:quotes    # emite 4 cotizaciones por el camino real
```

### Credenciales

| Correo | Rol | Ve |
| --- | --- | --- |
| `admin@automocion.os` | ADMIN | todo |
| `andrea.gomez@automocion.os` | SALES | cotizaciones, clientes, inventario |
| `carlos.rodriguez@automocion.os` | OPS | pedidos, consolidación |
| `camila.restrepo@automocion.os` | CONTENT_EDITOR | blog, social |

Contraseña para todas: **`Automocion2026!`**

La barra lateral se filtra por permiso, así que vale la pena entrar con
`andrea.gomez` para enseñar que un comercial no ve «Ajustes» ni «Usuarios».

---

## 1 · Prueba automática

```bash
npm run verify      # typecheck + lint + paridad i18n + 132 pruebas
npm run smoke:all   # las tres pruebas de humo contra el servidor levantado
```

`smoke:all` encadena:

| Comando | Qué comprueba |
| --- | --- |
| `npm run smoke:pages` | Las 46 páginas renderizan **en los dos idiomas**, iniciando sesión de verdad. Falla si aparece un `⟨clave.faltante⟩` o la pantalla de error de Next — las dos devuelven 200 y aun así están rotas. |
| `npm run smoke:quote` | Emite una cotización real: consecutivo, transacción, inmutabilidad tras enviar, y dos guardados **simultáneos** que no colisionan. |
| `npm run smoke:pdf` | Genera la propuesta en PDF en español e inglés y comprueba que sean PDF válidos de dos páginas. Deja los archivos en `.next/`. |

El servidor tiene que estar corriendo para `smoke:pages` y `smoke:pdf`.

> **Deja que el servidor termine de compilar antes de lanzarlos.** En
> `next dev` cada ruta se compila la primera vez que se pide; si el humo llega
> mientras Next está recompilando tras un cambio, una página puede tardar más
> que el tiempo de espera y reportar un fallo que no existe. Abre `/es` en el
> navegador una vez, o vuelve a correr el comando: dos verdes seguidos
> significan que está bien.

Tras correr `smoke:quote` o `smoke:pdf` quedan cotizaciones de prueba en la
lista. Para dejar los datos como estaban:

```bash
npm run seed:quotes
```

---

## 2 · Recorrido manual — el guion de la demostración

### a) La portada · `/es`

Se ven tres cifras reales y los tres vehículos más baratos **puestos en
Colombia**. Cada enlace del encabezado lleva a una página que existe.

### b) El simulador · `/es/simulador` — *el corazón del producto*

Es la pantalla que hay que enseñar despacio.

1. **Cambia «Vehículos por contenedor» de 3 a 1.** El total sube unos
   **22,8 millones** al instante, sin recargar: el motor corre en el navegador.
2. **Abre «Desglose detallado» → Tributos.** Cada línea cita su propia norma:
   el arancel sobre el valor en aduana (Dto 1165), el IVA sobre valor en aduana
   **más** arancel (ET art. 459) y el impoconsumo sobre el valor total sin IVA
   (ET art. 512-3). Son tres bases distintas, y es el detalle que un experto
   busca primero.
3. **Cambia de vehículo** a uno de gasolina (Mazda CX-5) y vuelve a un eléctrico
   (BYD Song Plus). El bloque de tributos se desploma: 0 % de arancel, IVA del
   5 % y sin impoconsumo. Ese contraste es el argumento comercial.
4. **Mira los chips de origen.** «Dubái» y «Canadá» están apagados con el motivo
   «sin unidades desde este origen» — hay puerto, no hay inventario. Igual
   «RORO», que no tiene tarifa cargada.
5. **Pulsa «Descargar propuesta PDF».** Emite la cotización y abre el documento.

### c) La propuesta en PDF

Se abre en una pestaña. Dos páginas: portada con la cifra, la línea de tiempo y
la vigencia; desglose con los seis bloques, sus subtotales y el total.

Para verlo en inglés, añade `?locale=en` a la URL. Es el **mismo documento desde
la misma instantánea**, no un recálculo.

### d) El catálogo · `/es/catalogo`

Los filtros son enlaces: el estado vive en la URL, se comparte por WhatsApp y el
botón atrás funciona. Cada precio es el costo puesto en Colombia, con placas.

### e) El comparador · `/es/comparar`

Tres vehículos lado a lado por costo final. El más barato va en color acento.

### f) La reserva · `/es/checkout`

Marca «Wallbox e instalación» (+4,2 M) o «PPF cobertura total» (+11,5 M): el
total cambia. El depósito **no** — reserva la unidad, no los accesorios.

### g) El portal del cliente · `/es/portal`

El semáforo por etapa. Es el módulo de torre de control.

### h) El back-office · `/es/admin`

Entra con `admin@automocion.os`. Las trece secciones de la barra lateral abren.

- **Parámetros** — el cliente controla las cifras sin tocar código.
- **Cotizaciones** — las cuatro emitidas, con estados distintos.
- **Inventario** — busca «BYD» y filtra; «Exportar CSV» descarga un archivo real.
- **Consolidación** — «Nuevo contenedor» abre su formulario.
- **Ajustes** — los datos que imprime el pie del PDF.

### i) Los dos idiomas

El selector `ES | EN` del encabezado conserva la página. Las rutas públicas
tienen segmento traducido: `/es/catalogo` ↔ `/en/catalog`,
`/es/simulador` ↔ `/en/import-calculator`.

---

## 3 · Lo que todavía no funciona

Conviene saberlo antes de que lo pregunten:

| Control | Estado |
| --- | --- |
| «Pagar depósito» | Confirma en pantalla, no cobra. Falta la pasarela y sus credenciales. |
| «Enviar por correo» | Emite la cotización y despacha por el puerto `Mailer`. En desarrollo el adaptador es la consola: **el correo sale impreso en la terminal**, no en una bandeja. |
| Diálogos del back-office | Abren su formulario y confirman; todavía no escriben la fila. |
| Foto del vehículo | No hay imágenes sembradas: sale el monograma de la marca. |

---

## 4 · Si algo falla

| Síntoma | Causa probable |
| --- | --- |
| Todas las rutas dan 500 | Otro proceso ocupa el puerto 3000. Mátalo y vuelve a `npm run dev`. |
| `⟨pricing.algo⟩` en pantalla | Falta una clave o su catálogo no está registrado. `npm run i18n:check` lo dice. |
| El simulador dice «No cotizable» | No hay tarifa de flete vigente para la ruta. Es correcto: el motor se niega a cotizar un flete en cero. |
| Una cotización nace vencida | Las tarifas no tienen `verifiedAt`. Vuelve a sembrar. |
| Faltan los disparadores de la base | `npm run test` lo detecta. Reaplica `prisma/migrations/20260906_quote_snapshot/migration.sql` con `node scripts/db-apply-sql.mjs`. |
