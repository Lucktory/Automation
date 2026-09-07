# ChatGPT Design Prompts — Critical Module

Prompts for the screens that carry the Motor de Liquidación. These five come first because the
rest of the product is built around them, and because module development follows the approved
designs.

## How to use these

1. Paste **BLOQUE MAESTRO** (§0) first, in a new ChatGPT conversation.
2. Then paste one screen prompt from §1–§5.
3. Keep the **same conversation** for all five screens — that is what makes them look like one
   product rather than five unrelated mockups.
4. Ask for desktop first, then say `"Ahora la versión móvil de esta misma pantalla"`.
5. If it drifts off the palette, reply: `"Recuerda el BLOQUE MAESTRO: usa solo los tokens de
   color definidos. No inventes colores."`

The palette below is **Palette A — "Graphite Showroom"**. If you choose B or C, swap the hex
values in §0 and everything downstream follows.

---

## §0 · BLOQUE MAESTRO — paste this first

```
Vas a diseñar pantallas para "Automoción OS", una plataforma web colombiana que permite
importar vehículos desde China, Estados Unidos, Dubái, Europa y Canadá, y muestra el costo
real puesto en Colombia con placas ("landed cost").

El usuario es un comprador o un operador que va a mover decenas de miles de dólares. La
interfaz debe comunicar precisión de ingeniería y solvencia financiera. No debe parecer un
sitio de descuentos ni un concesionario tradicional.

FOTOGRAFÍA: los vehículos se muestran con FOTOGRAFÍAS REALES de los modelos, en tres
cuartos delantero, sobre la placa neutra. Nada de iconos genéricos de coche, nada de
monogramas con las iniciales de la marca, nada de siluetas. Si una ficha no tuviera
foto, el hueco se resuelve con una ilustración vectorial del vehículo, nunca con letras.

SISTEMA VISUAL — respétalo exactamente en todas las pantallas. No inventes colores.

TEMA CLARO sobre fondo blanco. Tokens:
- Fondo de página        #FFFFFF
- Superficie             #F6F8FA   (tarjetas, paneles, barra lateral)
- Superficie elevada     #EDF1F5   (filas activas, paneles destacados, hover)
- Placa                  #E7ECF1   (fondo neutro detrás de la fotografía del vehículo)
- Borde                  #E4E8EE
- Borde fuerte           #C3CCD7   (estados activos y foco)
- Texto principal        #0B0D10
- Texto secundario       #4A5561
- Texto tenue            #79838F
- Primario               #1B4FE0   (acción principal, enlaces, estado activo)
- Primario hover         #1642C4
- Texto sobre primario   #FFFFFF
- Acento                 #00897C   (SOLO para datos: cifras destacadas, barra total)
- Éxito                  #0F9067
- Advertencia            #B45309
- Peligro                #D92D20
- Informativo            #175CD3
- Estado neutro          #79838F

OJO con la elevación en tema claro: el blanco es el techo, así que una superficie
"elevada" es un TINTE MÁS MARCADO, no más clara. Una fila seleccionada o un panel
destacado se oscurecen ligeramente; nunca se aclaran.

REGLAS DE COLOR, obligatorias:
1. La profundidad se comunica con niveles de superficie y bordes, NUNCA con sombras.
2. Un solo botón primario por sección. Los secundarios son botones fantasma: borde #C3CCD7,
   texto #0B0D10, fondo transparente.
3. El acento #00897C NUNCA es un botón ni un elemento clicable. Marca datos: la cifra del
   costo final, la barra del total en un gráfico. Si se puede hacer clic, no es acento.
4. Verde, ámbar y rojo solo comunican estado real. Nunca decoran.
5. Cuanto más densa es la pantalla, menos color tiene. Las tablas son casi monocromáticas
   para que un solo indicador de color se vea al instante.

TIPOGRAFÍA:
- Títulos: Sora, pesos 600 y 700, tracking ajustado
- Interfaz y texto: Inter, pesos 400, 500 y 600
- TODAS las cifras usan numerales tabulares (font-variant-numeric: tabular-nums)
- Escala en rem: 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 1.875 / 2.25 / 3

FORMA Y ESPACIO — cuatro radios, no uno:
- 4px   fichas de producto y celdas de datos (casi rectas)
- 8px   controles: campos, botones, selectores
- 12px  paneles y tarjetas de contenido
- 16px  modales
- Completamente redondo SOLO en las píldoras de filtro y las insignias de estado.
  Es la única forma circular de la pantalla.

NO uses el mismo redondeo en todo. Un radio uniforme en cada superficie hace que
todo se lea igual de importante y delata una plantilla. La jerarquía de forma es
deliberada.

- Espaciado base 4px
- Contenedor máximo 1280px, grilla de 12 columnas, gutter de 24px
- Anillo de foco: 2px #1B4FE0 con 2px de separación
- La profundidad se comunica con superficie y borde, NUNCA con sombras

FORMATO DE DATOS:
- Pesos colombianos: "COP $ 185.400.000" (punto como separador de miles, sin decimales)
- Dólares: "US$ 42.500"
- Siempre se muestra la moneda. La pantalla mezcla USD y COP constantemente.
- Fechas: "12 de octubre de 2026"

IDIOMA: todo el texto en español de Colombia. Nada de lorem ipsum, nada de inglés, nada de
marcas de vehículos inventadas (usa marcas reales: BYD, Tesla, Toyota, Kia, Volvo).

ENTREGA: diseño de alta fidelidad, vista de escritorio a 1440px de ancho, salvo que te pida
otra cosa. Confirma que entendiste y espera mi primera pantalla.
```

---

## §1 · `/simulador` — Simulador de importación

> **La pantalla más importante del producto.** Es la que se muestra primero en la demo.

```
PANTALLA 1: "Simulador de importación".

Esta es la pantalla más importante del producto. Su trabajo es que el usuario cambie un
parámetro y vea el costo final recalcularse al instante, con el desglose completo de por qué
cuesta lo que cuesta.

ESTRUCTURA, de arriba a abajo:

1. Encabezado fijo del sitio: logo "Automoción OS" a la izquierda; navegación (Catálogo, Cómo
   trabajamos, Mapa global, Blog); un selector de idioma "ES | EN" como control segmentado; un
   botón primario "Simular importación"; e ícono de cuenta.

2. Encabezado de página: título "Simulador de importación" en Sora 1.875rem, y a su derecha
   una INSIGNIA DE TRM. La insignia es una píldora sobre superficie elevada que muestra:
   "TRM $ 4.128,50 · 4 sep 2026 · automática" con un punto verde #17B26A a la izquierda. Al
   lado, un ícono de sincronizar. Esta insignia es importante: comunica que el dato está fresco.

3. Cuerpo en dos paneles sobre grilla de 12 columnas:

   PANEL IZQUIERDO (columnas 1 a 5) — "Parámetros", sobre superficie #12151A.
   Secciones colapsables, todas abiertas salvo la última:
   - "Vehículo": selector de vehículo del catálogo con buscador, mostrando miniatura, marca,
     modelo y versión seleccionados (ejemplo: BYD Seal Excellence AWD 2026).
   - "Origen": país de origen como grupo de chips con banderas (Estados Unidos, China, Dubái,
     Europa, Canadá) — China seleccionado; puerto de entrada (Buenaventura / Cartagena);
     precio de compra en USD; comisión de subasta o dealer; flete terrestre interno; documentos
     de exportación.
   - "Flete y seguro": modo (Contenedor 40' HC / RORO); costo del contenedor; recargos;
     tasa de seguro en porcentaje.
   - "Consolidación": un stepper "Vehículos por contenedor: 1 2 3 4+" con el 3 seleccionado, y
     un selector de método de prorrateo (Partes iguales / Por valor CIF / Por volumen / Por
     peso / Manual).
   - "Nacionalización" y "Comercial": colapsadas, con el texto "usando valores estándar".

   Detalle importante: cada campo muestra su valor por defecto como placeholder. UN campo
   —"Costo del contenedor"— aparece MODIFICADO: tiene una barra vertical ámbar #F79009 a la
   izquierda, una etiqueta pequeña "modificado" y un enlace "restablecer". Esto permite ver de
   un vistazo dónde el usuario se apartó del estándar.

   PANEL DERECHO (columnas 6 a 12) — resultados, fijo al hacer scroll, sobre superficie
   elevada #1A1F26:
   - Etiqueta "Costo puesto en Colombia, con placas" en texto tenue.
   - LA CIFRA: "COP $ 185.400.000" en Sora 3rem, color acento #00D0C0, numerales tabulares.
   - Debajo, en texto secundario: "≈ US$ 44.900 · 3 vehículos por contenedor · desde China"
   - Un gráfico de cascada horizontal que muestra cómo se acumula el costo: barras en texto
     tenue #6B7684 para cada bloque (Origen, Flete y seguro, Tributos, Nacionalización,
     Servicios, Margen) y la barra final del total en acento #00D0C0. Las barras de Tributos
     van en ámbar #F79009, porque es la cifra a la que más reacciona la gente.
   - Debajo, un acordeón "Desglose detallado" con los seis bloques. Muestra el bloque
     "Tributos" abierto, con sus líneas: Arancel, Impoconsumo, IVA. Cada línea tiene: nombre,
     una nota pequeña en texto tenue citando SU PROPIA base legal — el arancel "sobre el valor
     en aduana", el IVA "sobre valor en aduana + arancel · ET art. 459", y el impoconsumo "sobre
     el valor total del bien, sin IVA · ET art. 512-3"; son bases DISTINTAS —, el valor en
     COP alineado a la derecha con numerales tabulares, y un ícono de información.
   - Una franja de tiempos: seis fases (Compra, Origen, Navegación, Puerto, Nacionalización,
     Matrícula) conectadas por una línea, cada una con su número de días, y un total
     "≈ 78 días hábiles".

4. Debajo de los dos paneles, a todo el ancho: tabla "Reparto del contenedor". Columnas:
   Vehículo, Valor CIF, Participación %, Flete asignado. Tres filas. La última fila de la tabla
   es una fila de residuo en cursiva y texto tenue que dice "Ajuste de redondeo ... COP $ 1"
   y luego una fila de total en negrita. Esta fila de residuo debe verse; es la prueba de que
   la matemática cuadra.

5. Barra de acciones al pie del panel derecho: botón primario "Descargar propuesta PDF", y dos
   botones fantasma: "Guardar cotización" y "Enviar por correo".

Todo el texto en español de Colombia, con cifras realistas para importación de vehículos a
Colombia. Entrégame la vista de escritorio a 1440px.
```

---

## §2 · `/admin/parametros` — Motor de parámetros

> **La pantalla que gana la confianza del cliente:** demuestra que él controla las cifras.

```
PANTALLA 2: "Panel de administración — Motor de parámetros".

Es la pantalla de control del operador. Aquí edita todas las tarifas del negocio. Debe sentirse
como una sala de control: densa, precisa y sobria. Es la pantalla con MENOS color de todo el
producto, precisamente porque es la más densa.

ESTRUCTURA:

1. Barra lateral de administración a la izquierda, 240px, sobre superficie #12151A con borde
   derecho #232A33. Logo arriba. Ítems de menú con ícono y etiqueta: Dashboard, Inventario,
   Parámetros (ACTIVO), Consolidación, Cotizaciones, Pedidos, Clientes, Fuentes, Omnicanal,
   Social, Blog, Usuarios, Ajustes. El ítem activo tiene fondo #1A1F26 y una barra vertical
   azul #2E6BFF de 3px a la izquierda.

2. Barra superior: ruta de navegación "Administración / Parámetros", un buscador, la insignia
   de TRM, y el avatar del usuario.

3. BANNER DE VERSIÓN, a todo el ancho, sobre superficie elevada con un tinte verde muy sutil y
   un borde izquierdo verde #17B26A de 3px:
   "Conjunto v12 · ACTIVO desde el 1 de septiembre de 2026 · última edición por Juan M. hace
   2 horas". A la derecha: botón fantasma "Ver historial", botón fantasma "Nueva versión" y
   botón primario "Publicar cambios" (deshabilitado, porque no hay borrador).

4. Cuerpo en tres zonas:

   IZQUIERDA (3 columnas) — pestañas verticales: Divisas · Fletes · Aranceles (ACTIVA) ·
   Costos de destino · Agregados · Márgenes. Cada una con un contador pequeño de filas.

   CENTRO (6 columnas) — la tabla de "Aranceles". Es casi monocromática: fondo #12151A, texto
   secundario #A3AEBB, y solo los valores numéricos en texto principal #F2F5F8 con numerales
   tabulares. Columnas:
   Subpartida | País de origen | Motorización | Arancel % | IVA % | Impoconsumo % | Vigencia
   desde | Vigencia hasta | Fuente
   Muestra unas ocho filas con combinaciones realistas (subpartidas de automóviles, orígenes
   Estados Unidos / China / Unión Europea, motorizaciones Eléctrico / Híbrido / Gasolina).
   Detalles obligatorios:
   - Una fila está en edición en línea: sus celdas son campos de entrada con borde #333D49 y
     anillo de foco azul.
   - Una fila tiene la vigencia vencida: se muestra al 50% de opacidad con una píldora gris
     "vencida".
   - Cada fila tiene una columna "Fuente" con texto tenue, del tipo "Arancel de Aduanas ·
     verificado 12 ago 2026", y un ícono de advertencia ámbar en las filas cuya verificación
     tiene más de 90 días.
   - Al final de la tabla, un botón fantasma "+ Agregar regla".

   DERECHA (3 columnas) — panel "Simular impacto", sobre superficie elevada. Contiene:
   un selector de vehículo de ejemplo, un selector de origen, y debajo una comparación
   ANTES / DESPUÉS línea por línea. Las líneas que suben van en rojo #F04438 con una flecha
   hacia arriba; las que bajan en verde #17B26A; las que no cambian en texto tenue. Al pie, el
   cambio en el total: "COP $ 185.400.000 → COP $ 191.220.000  (+3,1%)".

Nada más lleva color. El único botón primario de la pantalla es "Publicar cambios".

Español de Colombia. Vista de escritorio a 1440px.
```

---

## §3 · `/catalogo/[slug]` — Ficha del vehículo

```
PANTALLA 3: "Ficha del vehículo" (página de detalle del catálogo).

Es la pantalla más comercial del producto: aquí el comprador decide.

ESTRUCTURA:

1. Encabezado fijo del sitio (igual que en el simulador) y migas de pan:
   "Catálogo / BYD / Seal / Excellence AWD".

2. Bloque principal dividido, sobre fondo #0B0D10:

   IZQUIERDA (columnas 1 a 7) — galería: imagen principal grande del vehículo sobre una placa
   de fondo neutro #15181D, con una tira de 5 miniaturas debajo; la miniatura activa lleva un
   anillo azul #2E6BFF. Un ícono de pantalla completa en la esquina.

   DERECHA (columnas 8 a 12) — panel de resumen fijo al hacer scroll, sobre superficie elevada
   #1A1F26, con borde #232A33:
   - "BYD Seal" en Sora 1.875rem, y debajo "Excellence AWD · 2026" en texto secundario.
   - Una fila de píldoras de especificación: "Eléctrico", "530 HP", "570 km", "82,5 kWh".
   - Separador.
   - Etiqueta "Costo puesto en Colombia, con placas" en texto tenue.
   - La cifra "COP $ 185.400.000" en Sora 2.25rem, color acento #00D0C0.
   - Debajo, la insignia de TRM en pequeño y el texto "Cotización válida por 7 días".
   - Selector de origen: control segmentado con banderas, "EE. UU. · China · Dubái · Europa ·
     Canadá", con China seleccionado.
   - Selector de consolidación: "Compartiendo contenedor con: 1 · 2 · 3 · 4+", con el 3
     seleccionado y una nota verde pequeña "ahorras COP $ 4.100.000".
   - Botón primario a todo el ancho "Cotizar ahora", y debajo dos botones fantasma en fila:
     "Descargar PDF" y "WhatsApp".

3. Barra de pestañas: Ficha técnica · Costo en Colombia (ACTIVA) · Agregados · Tiempos ·
   Documentos.

4. Contenido de la pestaña "Costo en Colombia": el mismo gráfico de cascada y el mismo acordeón
   de desglose que en el simulador, con las mismas reglas de color (bloques en gris, tributos
   en ámbar, total en acento). Encima del gráfico, una frase en texto secundario:
   "Sabes exactamente por qué cuesta lo que cuesta. Este es el desglose completo."

5. Sección "Agregados": cuatro tarjetas sobre superficie #12151A con casilla de selección,
   ícono, nombre, descripción corta y precio: "Wallbox y instalación", "PPF frontal en Zona
   Franca", "Garantía extendida 3 años", "Kit de mantenimiento". Una de ellas está seleccionada
   y tiene borde azul #2E6BFF.

6. Sección "Tiempos": la franja de seis fases con días, igual que en el simulador.

7. Sección "Vehículos similares": cuatro tarjetas de vehículo en fila. Cada tarjeta: foto sobre
   placa neutra, insignia de disponibilidad, marca y modelo, versión, píldoras de año /
   motorización / autonomía, y el precio en acento con la etiqueta pequeña "landed cost
   estimado".

8. Pie de página oscuro con cuatro columnas de enlaces.

Español de Colombia. Vista de escritorio a 1440px.
```

---

## §4 · `/admin/consolidacion` — Consolidación logística

```
PANTALLA 4: "Panel de administración — Consolidación logística".

Aquí el operador arma un contenedor con varios vehículos y decide cómo se reparte el costo del
flete entre ellos. Misma barra lateral y barra superior de administración que la pantalla 2.

ESTRUCTURA:

1. Barra de herramientas: selector de origen (China), selector de puerto (Buenaventura),
   selector de tipo de contenedor (40' HC), y botón primario "Guardar consolidación".

2. Zona central, a todo el ancho — VISTA DEL CONTENEDOR: un diagrama en planta, visto desde
   arriba, de un contenedor de 40 pies. Rectángulo con borde #333D49 sobre superficie #12151A,
   dividido en cuatro espacios. Tres espacios están ocupados por fichas de vehículo: cada ficha
   es una tarjeta pequeña sobre superficie elevada #1A1F26 con miniatura, marca y modelo, peso
   y un ícono de arrastrar. El cuarto espacio está vacío, con borde punteado y el texto
   "Arrastra un vehículo aquí" en texto tenue.

3. A la derecha del contenedor, tres medidores verticales:
   - "Unidades 3 / 4" — barra al 75%, en verde #17B26A
   - "Peso 6.240 / 26.000 kg" — barra al 24%, en verde
   - "Volumen 42 / 67 m³" — barra al 63%, en verde
   Los medidores usan verde por debajo del 80%, ámbar #F79009 entre 80 y 100%, y rojo #F04438
   por encima.

4. Debajo del contenedor — "Vehículos sin asignar": una fila horizontal de cinco fichas de
   vehículo disponibles, arrastrables.

5. Panel derecho — "Reparto del costo":
   - Costo total del contenedor: "US$ 4.850"
   - Selector de método de prorrateo como lista de opciones: Partes iguales / Por valor CIF
     (SELECCIONADO) / Por volumen / Por peso / Manual.
   - Tabla de asignación con columnas: Vehículo | Valor CIF | Participación % | Flete asignado.
     Tres filas con cifras realistas. Las participaciones en color acento #00D0C0.
   - Al final: una fila de "Ajuste de redondeo" en cursiva y texto tenue con el valor
     "US$ 0,01", y una fila de TOTAL en negrita que cuadra exactamente con el costo del
     contenedor.
   - Una nota pequeña en texto tenue: "El residuo se asigna a la última unidad para que la
     suma sea exacta."

Español de Colombia. Vista de escritorio a 1440px.
```

---

## §5 · Smart PDF — Propuesta comercial

```
PANTALLA 5: documento PDF de propuesta comercial, no una pantalla web.

Formato carta vertical (letter, 8.5 × 11 pulgadas). Este documento se le envía al comprador
final, así que debe verse impreso y profesional. IMPORTANTE: el PDF va sobre FONDO BLANCO, no
sobre el tema oscuro. Usa la versión clara de la paleta:
- Fondo #FFFFFF, superficie #F7F8FA, bordes #E3E7EC
- Texto principal #0B0D10, secundario #4A5561, tenue #7A8695
- Primario #1B4FE0, acento #00A99B
- Éxito #17B26A, advertencia #F79009

Diseña las DOS PRIMERAS PÁGINAS:

PÁGINA 1 — Portada y resumen:
- Franja superior con el logo "Automoción OS" y, a la derecha, "Propuesta N.º COT-2026-0412"
  y la fecha.
- Título grande en Sora: "Propuesta de importación".
- Bloque del vehículo: foto a la izquierda, y a la derecha marca, modelo, versión, año y una
  fila de especificaciones clave.
- Recuadro destacado sobre superficie #F7F8FA con borde: la etiqueta "Costo puesto en Colombia,
  con placas" y la cifra "COP $ 185.400.000" en Sora 2.25rem, color acento #00A99B, numerales
  tabulares. Debajo, en texto tenue: "TRM aplicada $ 4.128,50 del 4 de septiembre de 2026 ·
  Origen: China · 3 vehículos por contenedor".
- Franja de tiempos: seis fases con sus días y el total estimado.
- Recuadro de validez con borde ámbar #F79009 a la izquierda: "Esta propuesta es válida hasta
  el 11 de septiembre de 2026. Los tributos y el flete se recalculan con la TRM y las tarifas
  vigentes a la fecha de la operación."

PÁGINA 2 — Desglose del landing cost:
- Título "Desglose detallado".
- Una tabla agrupada en seis bloques (Costos de origen, Flete y seguro, Tributos,
  Nacionalización, Servicios adicionales, Margen comercial). Cada bloque tiene un encabezado
  con fondo #F7F8FA, sus líneas de detalle, y un subtotal en negrita.
  Cada línea muestra: concepto, una nota pequeña en texto tenue explicando la base de cálculo,
  el valor en USD cuando aplica, y el valor en COP alineado a la derecha con numerales
  tabulares.
- La fila del TOTAL al final, destacada, con la cifra en color acento.
- Pie de página en texto tenue con los datos de la empresa, el número de página, y una nota
  legal de dos líneas aclarando que las cifras de tributos son estimaciones basadas en las
  tarifas vigentes y que la liquidación definitiva la determina la autoridad aduanera.

Todo en español de Colombia, con cifras realistas y coherentes entre las dos páginas.
```

---


## §6 · Autenticación — `/login`, `/registro`, `/recuperar` *(M3)*

> Un solo prompt cubre las tres: comparten layout y solo cambia el formulario.

```
PANTALLA 6: pantallas de autenticación. Mismo sistema visual de siempre.

LAYOUT COMPARTIDO por las tres, en pantalla dividida:

IZQUIERDA (columnas 1 a 5): panel de marca a sangre completa. Fotografía de un vehículo en
un entorno portuario o de showroom oscuro, cubierta por un velo del color de fondo #0B0D10
al 85% que se desvanece hacia la derecha. Sobre el velo, arriba a la izquierda, el logo
"Automoción OS". Abajo a la izquierda, una frase de valor en Sora 1.5rem, texto principal:
"Sabes exactamente cuánto cuesta tu carro puesto en Colombia." Debajo, en texto secundario:
"Arancel, IVA, impoconsumo, flete y nacionalización. Línea por línea."

DERECHA (columnas 6 a 12): el formulario, centrado vertical y horizontalmente, con ancho
máximo de 420px, sobre el fondo de página #0B0D10. La tarjeta del formulario va sobre
superficie #12151A con borde #232A33 y radio 12px, con 32px de padding.

Todos los campos: fondo #0B0D10, borde #232A33, radio 8px, etiqueta encima en texto
secundario 0.875rem. El botón de envío es primario #2E6BFF y ocupa todo el ancho.

Diseña las TRES variantes, una debajo de otra:

VARIANTE A — "Iniciar sesión":
  Título "Iniciar sesión" en Sora 1.5rem. Subtítulo en texto tenue: "Accede a tus
  cotizaciones y al seguimiento de tu pedido."
  Campos: Correo electrónico; Contraseña con ícono de ojo para mostrar/ocultar.
  Un enlace "¿Olvidaste tu contraseña?" alineado a la derecha bajo el campo de contraseña,
  en texto secundario con hover en primario.
  Botón primario ancho completo: "Entrar".
  Separador horizontal con la palabra "o" centrada sobre una línea #232A33.
  Botón fantasma ancho completo: "Enviarme un enlace de acceso".
  Al pie, texto tenue centrado: "¿No tienes cuenta? Regístrate" con "Regístrate" en primario.

VARIANTE B — "Crear cuenta":
  Título "Crear cuenta".
  Campos: Nombre completo; Correo electrónico; Teléfono (con prefijo +57 fijo a la
  izquierda del campo); Contraseña con indicador de fuerza como barra de 4 segmentos que
  usa peligro #F04438, advertencia #F79009 y éxito #17B26A.
  Una casilla de verificación OBLIGATORIA, con el texto en texto secundario 0.8125rem:
  "Autorizo el tratamiento de mis datos personales conforme a la Política de Tratamiento de
  Datos (Ley 1581 de 2012)." con "Política de Tratamiento de Datos" como enlace en primario.
  Botón primario ancho completo: "Crear cuenta".

VARIANTE C — "Recuperar contraseña", en DOS estados uno al lado del otro:
  Estado 1: título "Recuperar contraseña", texto tenue "Te enviamos un enlace para crear una
  nueva.", un campo de Correo electrónico, botón primario "Enviar enlace", y un enlace
  "Volver a iniciar sesión".
  Estado 2 (enviado): un ícono de sobre en círculo con éxito #17B26A al 12% de opacidad de
  fondo y el ícono en #17B26A, título "Revisa tu correo", texto secundario "Enviamos un
  enlace a juan@ejemplo.com. Caduca en 30 minutos.", y un botón fantasma "Reenviar".

Muestra además, en el formulario de inicio de sesión, un ESTADO DE ERROR: el campo de
contraseña con borde #F04438 y debajo, en #F04438 y 0.8125rem, el mensaje "Correo o
contraseña incorrectos."

Vista de escritorio a 1440px. Español de Colombia.
```

---

## §7 · `/admin/usuarios` — Usuarios y roles *(M3)*

> Establece el patrón de LISTA del admin, que reutilizan inventario, cotizaciones, pedidos,
> clientes y ajustes. Vale la pena diseñarlo bien una vez.

```
PANTALLA 7: "Panel de administración — Usuarios y roles".
Misma barra lateral y barra superior que la pantalla de Parámetros.

Esta pantalla define el patrón de LISTA de todo el back-office, así que la densidad y el
comportamiento de la tabla importan más que la decoración.

ESTRUCTURA:

1. Barra lateral de administración (240px, superficie #12151A, borde derecho #232A33) con
   "Usuarios" como ítem ACTIVO: fondo #1A1F26 y barra vertical azul #2E6BFF de 3px.

2. Barra superior: ruta "Administración / Usuarios", buscador global, insignia de TRM, avatar.

3. Encabezado de página: título "Usuarios" en Sora 1.5rem con el conteo "14 usuarios" en
   texto secundario al lado. A la derecha, un botón primario "Invitar usuario".

4. BARRA DE HERRAMIENTAS sobre superficie #12151A con radio 12px y 16px de padding:
   un campo de búsqueda con ícono de lupa a la izquierda ("Buscar por nombre o correo…"),
   un filtro desplegable "Rol: todos", un filtro desplegable "Estado: todos", y a la derecha
   un botón fantasma con ícono de descarga "Exportar".

5. LA TABLA, casi monocromática. Encabezado de columna en texto tenue 0.75rem en mayúsculas
   con espaciado de letra, y una línea inferior #232A33. Filas separadas por #232A33, con
   hover en superficie elevada #1A1F26. Columnas:
   - Casilla de selección
   - USUARIO: avatar circular de 32px con iniciales sobre #1A1F26, y a su derecha el nombre
     en texto principal y el correo debajo en texto tenue 0.8125rem
   - ROL: píldora de color — "Cliente" en informativo #2E90FA, "Asesor" en primario #2E6BFF,
     "Operaciones" en acento #00D0C0, "Administrador" en advertencia #F79009. Las píldoras
     van con el color al 15% de fondo y el color pleno en el texto. El rol de administrador
     va en ámbar A PROPÓSITO: el privilegio elevado debe verse de un vistazo.
   - ESTADO: punto de color de 8px más etiqueta — "Activo" en éxito #17B26A, "Invitado" en
     advertencia, "Suspendido" en texto tenue
   - ÚLTIMO ACCESO: fecha relativa en texto secundario ("hace 2 horas", "hace 3 días")
   - CREADO: fecha corta en texto tenue
   - Columna de acciones con un botón de tres puntos verticales
   Muestra ocho filas con datos realistas colombianos (nombres como Juan Pérez, Andrea
   Gómez, Carlos Rodríguez).

6. FILA SELECCIONADA: muestra dos filas con la casilla marcada y fondo #1A1F26. Cuando hay
   selección, aparece una BARRA DE ACCIONES MASIVAS flotante en la parte inferior centrada,
   sobre superficie elevada con borde y sombra sutil: "2 seleccionados" a la izquierda, y a
   la derecha botones fantasma "Cambiar rol" y "Suspender", más una X para limpiar.

7. Pie de tabla: "Mostrando 8 de 14" a la izquierda en texto tenue, y controles de
   paginación a la derecha.

8. Muestra también, a un lado, el MODAL "Invitar usuario": sobre superficie elevada #1A1F26,
   radio 16px, ancho 480px, con velo oscuro detrás. Contiene: título "Invitar usuario",
   campos de Correo electrónico y un selector de Rol con descripción bajo cada opción, y al
   pie un botón fantasma "Cancelar" y un botón primario "Enviar invitación".

Vista de escritorio a 1440px. Español de Colombia.
```

---

## Orden de entrega de prompts

Los prompts se entregan por hito, justo antes de construir. Estado actual:

| Hito | Pantallas | Prompt |
|---|---|---|
| M2 | *(ninguna — el motor no tiene interfaz)* | no aplica |
| **M3** | `/admin/parametros` · auth · `/admin/usuarios` | **§2, §6, §7 — listos** |
| M5 | `/simulador` · consolidación · Smart PDF | **§1, §4, §5 — listos** |
| M4 | `/catalogo` · ficha · comparar · inventario | ficha lista (§3); faltan catálogo, comparar, inventario |
| M6 | checkout · confirmación · pedidos · control tower | pendientes |
| M7 | portal y semáforo | pendientes |
| M8 | home · cómo trabajamos · mapa · blog | pendientes |
| M9 | social studio · omnicanal · fuentes | pendientes |

---

## §8 · `/catalogo` — Vitrina

> **La segunda pantalla más importante.** Es donde el comprador decide, y donde el precio
> puesto en Colombia hace su argumento sin que nadie lo explique.

```
PANTALLA 8: "Catálogo" — la vitrina de vehículos.

Es una tienda, no una tabla. El comprador llega a comparar y a decidir. El argumento del
producto es que CADA PRECIO YA INCLUYE TODO: vehículo, flete, tributos, nacionalización y
placas. Ningún otro sitio del sector muestra esa cifra.

ESTRUCTURA, de arriba a abajo:

1. Encabezado fijo del sitio (el mismo de las demás pantallas): logo "Automoción OS" con su
   bajada "Vehículos globales. Más cerca de ti.", navegación (Catálogo, Cómo trabajamos,
   Mapa global, Blog), selector "ES | EN" como control segmentado, botón primario "Simular
   importación" e ícono de cuenta.

2. Encabezado de página, sobre fondo blanco, separado por una línea fina inferior:
   - Título "Catálogo" en Sora 2.5rem, peso 600, tracking -0.02em.
   - Bajada en una sola línea, máximo 480px de ancho, texto secundario:
     "El precio que ves es el que pagas. Vehículo, flete, tributos, nacionalización y
     placas — todo dentro."
   NO uses una tarjeta ni un recuadro para el encabezado. Es texto sobre la página.

3. Cuerpo en dos columnas, con un espacio generoso entre ellas (48px):

   COLUMNA IZQUIERDA (208px de ancho) — filtros como RAÍL, no como tarjeta.
   Importante: los filtros NO van dentro de una caja con borde y radio. Si se encierran en
   una tarjeta igual a las fichas de producto, compiten con la mercancía. Van como una
   columna de grupos separados por líneas finas horizontales.
   - Arriba, la palabra "Filtrar" en texto pequeño y peso medio, y a la derecha un enlace
     "Limpiar" subrayado y tenue que SOLO aparece cuando hay algún filtro activo.
   - Grupos, en este orden: Marca, Motorización, Carrocería, Origen.
     Cada grupo lleva su etiqueta en mayúsculas, 0.6875rem, con tracking, en texto tenue.
   - Las opciones son PÍLDORAS completamente redondas, pequeñas, que envuelven en varias
     líneas. Sin seleccionar: borde fino, texto secundario, fondo transparente. Seleccionada:
     fondo negro sólido (#0B0D10) y texto blanco — sin borde. El contraste debe ser
     inequívoco de un vistazo.
   - En "Origen" cada píldora lleva la bandera del país a la izquierda, pequeña y con esquinas
     de 1px.

   COLUMNA DERECHA — resultados.
   - Encima de la rejilla, en texto tenue muy pequeño: "10 disponibles".
   - Rejilla de fichas: 3 columnas en escritorio, 2 en tableta, 1 en móvil. Separación
     horizontal 20px, VERTICAL 32px — más aire entre filas que entre columnas, para que se
     lean como filas de productos y no como una cuadrícula uniforme.

4. LA FICHA DE PRODUCTO. Este es el elemento que hay que resolver bien:
   - SIN tarjeta contenedora. Nada de borde alrededor de toda la ficha, nada de fondo
     distinto. La ficha es la fotografía más el texto debajo, sobre el fondo blanco de la
     página. Un marco alrededor de cada producto es exactamente lo que hace que una vitrina
     parezca una plantilla.
   - Arriba, la FOTOGRAFÍA REAL del vehículo en proporción 16:10, esquinas de 4px, sobre la
     placa neutra #E7ECF1. Tres cuartos delantero. Usa modelos reales: BYD Seal, Tesla Model
     3, Zeekr X, Kia EV6, Volvo EX30, Mazda CX-5, Toyota Corolla Cross.
   - En hover: una línea de acento #00897C de 1px que se despliega de izquierda a derecha
     sobre el borde superior de la foto, y la imagen escala un 3%. Nada más se mueve.
   - Debajo de la foto, una línea de metadatos muy pequeña en texto tenue: bandera del país
     de origen · año · motorización. Separados por un punto medio.
   - El nombre en dos pesos dentro de la MISMA línea: la marca en texto tenue y el modelo en
     peso medio y texto principal. Se escanea la marca, se lee el modelo. Debajo, la versión
     en texto tenue muy pequeño.
   - Una línea fina horizontal, y bajo ella el precio: la palabra "COP" diminuta en texto
     tenue seguida de la cifra en Sora 1.125rem peso 600, con numerales tabulares. Debajo, en
     0.6875rem tenue, la etiqueta "Puesto en Colombia".
   - El precio es lo único que crece de tamaño en toda la ficha. Todo lo demás es pequeño.

5. Estado vacío: sin ilustración y sin tarjeta. Solo una línea fina superior y, centrado con
   mucho aire vertical, "Nada coincide con estos filtros." en texto tenue.

6. Pie del sitio: logo con su bajada, tres columnas de enlaces (Producto, Compañía, Legal),
   y un descargo en texto muy pequeño aclarando que las cifras de tributos son estimaciones
   y que la liquidación definitiva la determina la autoridad aduanera.

LO QUE NO QUIERO, y es tan importante como lo anterior:
- Nada de tarjetas con borde alrededor de cada producto.
- Nada de sombras. La profundidad se hace con superficie y línea.
- Nada de insignias decorativas tipo "¡Nuevo!", "Oferta", "Destacado" o porcentajes de
  descuento. Esto no es un sitio de rebajas.
- Nada de botón "Ver detalle" o "Añadir al carrito" en la ficha. La ficha entera es el
  enlace.
- Nada de estrellas de valoración ni corazones de favoritos.
- Nada de degradados de color.
- No repitas el mismo radio en todos los elementos.

Entrégame la vista de escritorio a 1440px. Todo el texto en español de Colombia.
```

---

## §9 · `/admin` — Panel de control

> La primera pantalla que ve el equipo cada mañana. Su trabajo es responder «¿qué necesita
> mi atención hoy?» antes de que nadie tenga que buscarlo.

```
PANTALLA 9: "Panel de control" del back-office.

Es la portada del área privada. La ve el dueño del negocio al abrir el navegador. Tiene que
responder tres preguntas en cinco segundos: cuánto dinero hay en juego, qué se está moviendo,
y qué está roto.

ENVOLTURA (igual en todas las pantallas del back-office):
- Barra lateral fija de 240px a la izquierda, sobre superficie #F6F8FA, con el logotipo
  completo arriba y trece secciones: Panel de control, Inventario, Parámetros, Consolidación,
  Cotizaciones, Pedidos, Clientes, Fuentes, Omnicanal, Social, Blog, Usuarios, Ajustes.
  Cada una con su ícono. La activa lleva fondo #EDF1F5 y texto en peso medio.
- Barra superior con migas de pan a la izquierda y, a la derecha, el avatar circular del
  usuario con sus iniciales.

CUERPO:

1. Encabezado: título "Panel de control" en Sora 1.25rem peso 600, y debajo, en texto
   secundario: "Estado del negocio hoy: cotizaciones abiertas, pedidos en tránsito y alertas
   de parámetros." Separado del resto por una línea fina inferior.

2. FILA DE SEIS CIFRAS, en tarjetas pequeñas sobre superficie #F6F8FA con borde fino y radio
   de 12px. Cada una: etiqueta en mayúsculas 0.6875rem con tracking en texto tenue, y debajo
   la cifra en Sora 1.5rem con numerales tabulares.
   - "Cotizaciones abiertas"     4
   - "Valor en negociación"      COP $ 728,2 M   <- en color acento #00897C
   - "Pedidos en curso"          3
   - "Vehículos publicados"      10
   - "Prospectos nuevos"         7
   - "Tarifas por verificar"     2               <- en ámbar #B45309 si es mayor que cero

   (Diseña con estas cifras. En la base de datos de hoy solo son reales las cotizaciones
   —4, por valor de 728.162.842 COP— y los 10 vehículos publicados; pedidos, prospectos y
   tarifas vencidas están en cero. Un panel dibujado con seis ceros no diseña nada, pero
   conviene saber cuáles son ciertas.)
   Solo DOS de las seis llevan color. Si todas lo llevan, ninguna destaca.

3. Debajo, una rejilla de 12 columnas con dos bloques:

   IZQUIERDA (8 columnas) — "EMBUDO DE PEDIDOS".
   Una barra horizontal segmentada que muestra cuántos pedidos hay en cada etapa, con las
   etapas reales del sistema: Confirmado, Compra en origen, En tránsito, En puerto,
   Nacionalización, Matrícula, Entregado. Cada segmento con su conteo encima. Debajo de la
   barra, la leyenda con el nombre de cada etapa en texto pequeño.
   Es el bloque más grande de la pantalla: es donde está el dinero ya comprometido.

   DERECHA (4 columnas) — "REQUIERE ATENCIÓN".
   Una lista de avisos, cada uno con un punto de color a la izquierda y una línea de texto:
   - ámbar #B45309: "2 tarifas de flete sin verificar hace más de 21 días."
   - rojo #D92D20: "1 pedido detenido en nacionalización hace 9 días."
   - azul #1B4FE0: "3 cotizaciones vencen esta semana."
   Si no hay nada: un punto verde y "Nada pendiente. Todo al día."
   Sin iconos decorativos. Un punto y una frase.

4. "COTIZACIONES RECIENTES": una tabla de cinco filas, casi monocromática, con enlace
   "Ver todo" a la derecha del título. Columnas: Número (COT-2026-0001), Cliente, Vehículo,
   Total en COP alineado a la derecha con numerales tabulares, y Estado como píldora pequeña.
   Los estados reales son: Borrador, Enviada, Vista, Aceptada, Rechazada, Vencida.
   La fila entera es un enlace a la cotización.

5. Al pie del contenido, una franja discreta sobre superficie elevada: "Conjunto de
   parámetros v1 · publicado el 5 de septiembre de 2026" con un enlace "Ver parámetros".
   Es el sello de qué reglas están rigiendo los cálculos ahora mismo.

REGLAS:
- Nada de gráficos de torta. Nada de líneas de tendencia con datos inventados.
- La barra del embudo y las seis cifras son los únicos elementos con peso visual.
- Los conteos van con numerales tabulares.

Vista de escritorio a 1440px. Todo en español de Colombia.
```

---

## §10 · `/admin/social` — Piezas sociales

> Parte del módulo de automatización de marketing. Genera creatividades desde la ficha del
> vehículo y su costo final, listas para publicar.

```
PANTALLA 10: "Social" — piezas gráficas del back-office.

Genera creatividades a partir de la ficha del vehículo y su costo puesto en Colombia. El
operador entra, elige un vehículo, y saca las piezas para publicar en redes.

Misma envoltura de back-office que la pantalla anterior (barra lateral de 240px, sección
"Social" activa; barra superior con migas y avatar).

CUERPO:

1. Encabezado: "Social" con la bajada "Piezas gráficas generadas a partir de la ficha del
   vehículo y su costo final." A la derecha, un único botón primario "Generar piezas".

2. Fila de cuatro cifras pequeñas: "Piezas generadas" 42, "Vehículos con piezas" 8,
   "Publicadas" 31, "Sin publicar" 11.

3. Barra de filtros en una sola línea, sin caja: píldoras redondas por PLANTILLA, más un
   selector de vehículo a la derecha. Las plantillas reales del sistema son exactamente
   estas cinco, y hay que usar estos nombres:
   - "Ficha cuadrada"        1080 x 1080   (Instagram feed)
   - "Historia con precio"   1080 x 1920   (Instagram stories)
   - "Carrusel de galería"   1080 x 1080   (varias imágenes)
   - "Tarjeta de catálogo"    800 x 800    (WhatsApp)
   - "Imagen para enlaces"   1200 x 630    (previsualización al compartir)
   La píldora "Todas" va primera y activa.

4. REJILLA DE PIEZAS — es el corazón de la pantalla. Cuatro columnas en escritorio.
   Cada pieza es una TARJETA VERTICAL:
   - Arriba, la previsualización real de la creatividad, con la proporción de SU plantilla
     (cuadrada, vertical 9:16, o apaisada 1200x630). No todas iguales: la rejilla debe verse
     con alturas distintas, como un tablero de piezas reales.
   - La previsualización muestra lo que la pieza contiene de verdad: la fotografía del
     vehículo, su nombre, y la cifra "COP $ 151.657.405" con la etiqueta "Puesto en Colombia".
     En la historia vertical la cifra ocupa la mitad inferior; en la tarjeta de WhatsApp el
     texto va a un lado.
   - Debajo de la previsualización: el nombre del vehículo en peso medio, y una línea de
     metadatos en texto tenue: plantilla · dimensiones · fecha de creación.
   - En hover aparece, sobre la previsualización, una barra translúcida con tres acciones
     en texto pequeño: "Descargar", "Copiar enlace", "Publicar".

5. Estado vacío, cuando no hay ninguna pieza: sin ilustración. Una línea fina superior, y
   centrado con aire: "No hay piezas generadas." y debajo el botón primario "Generar piezas".

6. El panel que abre "Generar piezas": un diálogo de 480px con radio de 16px. Campos:
   selector de vehículo (con miniatura del vehículo elegido), casillas de las cinco
   plantillas (las dos de Instagram marcadas por defecto), y selector de idioma ES/EN.
   Botones al pie: "Cancelar" fantasma y "Generar" primario.

REGLAS:
- Las previsualizaciones NO son rectángulos grises con un icono: son la pieza real, con la
  foto del coche y el precio encima.
- Nada de contadores de "me gusta" ni métricas de redes inventadas.
- Vehículos reales: BYD Seal, Tesla Model 3, Zeekr X, Kia EV6, Volvo EX30, Mazda CX-5.

NOTA DE IMPLEMENTACIÓN (no afecta al diseño, pero conviene saberlo):
La tabla `SocialAsset` guarda hoy vehículo, plantilla, idioma, imagen y dimensiones. NO
tiene estado de publicación, ni canal, ni fecha programada. El estado y el canal que pide
este diseño son correctos para el módulo que el cliente compró —automatización de
marketing— pero exigen tres columnas nuevas: `status`, `channel` y `scheduledAt`.
Diséñalos igualmente; el respaldo se añade al construir.

Vista de escritorio a 1440px. Todo en español de Colombia.
```

---

## §11 · `/admin/clientes` — Clientes

> El CRM ligero. Compradores y prospectos con su actividad y su valor acumulado.

```
PANTALLA 11: "Clientes" del back-office.

Es la vista de CRM. Reúne a quien ya compró y a quien todavía está preguntando, con lo que
cada uno ha movido.

Misma envoltura de back-office (barra lateral de 240px con "Clientes" activo; barra superior).

CUERPO:

1. Encabezado: "Clientes" con la bajada "Compradores y prospectos, con su actividad y su
   valor acumulado." A la derecha, dos botones: "Exportar CSV" fantasma y "Nuevo cliente"
   primario.

2. Fila de cuatro cifras: "Clientes activos" 4, "Prospectos" 7, "Valor acumulado"
   COP $ 726 M en acento #00897C, y "Tasa de conversión" 36 %.

3. Barra de herramientas en una línea, sin caja:
   - Campo de búsqueda a la izquierda, con lupa dentro, ancho 320px:
     "Buscar por nombre o correo…"
   - A la derecha, píldoras de ESTADO: "Todos" (activa), "Clientes", "Prospectos".
   - Y un selector "Origen" con las fuentes reales del sistema: Formulario web, Simulador,
     WhatsApp, Instagram, Facebook, TuCarro, CarroYa, Referido, Publicidad, Orgánico.

4. TABLA, densa y casi monocromática. Columnas, con estos encabezados exactos:
   - Nombre — avatar circular de 32px con iniciales, y debajo del nombre, en texto tenue
     muy pequeño, la ciudad.
   - Correo
   - Teléfono — formato colombiano +57 300 123 4567
   - Documento — tipo y número: "CC 1.020.345.678"
   - Origen — píldora pequeña con la fuente del prospecto
   - Cotizaciones — número, alineado a la derecha, numerales tabulares
   - Pedidos — número, alineado a la derecha
   - Valor acumulado — COP alineado a la derecha, numerales tabulares; es la columna que
     más pesa visualmente de las numéricas
   - Última actividad — "hace 3 días" en texto tenue
   - Estado — píldora: Activo (verde), Prospecto (azul), Inactivo (gris)
   Filas de 56px, separadas por líneas finas, con fondo #EDF1F5 al pasar el cursor.
   Al final de cada fila, un botón de tres puntos que abre un menú.

5. Pie de la tabla: "Mostrando 11 de 11 clientes" a la izquierda y paginación a la derecha.

6. Al hacer clic en una fila se abre un PANEL LATERAL de 420px que entra desde la derecha,
   sobre el contenido, con un velo oscuro detrás. Contiene:
   - Cabecera con avatar grande, nombre, correo y píldora de estado.
   - Tres cifras en línea: cotizaciones, pedidos, valor acumulado.
   - "Actividad reciente": una línea de tiempo vertical con puntos, mostrando eventos reales
     del sistema: "Cotización COT-2026-0003 aceptada", "Pedido PED-2026-0002 en tránsito",
     "Cotización enviada por correo", cada uno con su fecha.
   - Al pie, dos botones: "Nueva cotización" primario y "Enviar correo" fantasma.

REGLAS:
- La tabla es casi sin color para que las tres píldoras de estado se vean al instante.
- Nombres colombianos reales y verosímiles: Andrea Gómez, Carlos Rodríguez, Camila Restrepo,
  Juan Manuel Pérez, Sofía Pardo.
- Nada de puntuaciones de "salud del cliente" ni de estrellas.

DOS COSAS QUE EL DISEÑO DEBE INCLUIR Y HOY NO EXISTEN EN PANTALLA:
1. El VALOR ACUMULADO en dinero. La descripción de la sección lo promete y no aparece
   ninguna cifra en pesos. El esquema lo soporta: suma de `Quote.totalCop` y de
   `Order.totalCop` por cliente.
2. LOS PROSPECTOS. La tabla `Lead` existe, con estado, origen, ciudad, mensaje y asesor
   asignado, y la pantalla nunca la consulta — falta la mitad de lo que anuncia. Por eso el
   filtro "Clientes / Prospectos" y la columna "Origen" son parte del diseño.

Añade también una columna de DOCUMENTO (CC, CE, NIT, PAS + número): en Colombia un cliente
sin identificación tributaria no puede facturarse, y el campo ya está en el esquema.

Vista de escritorio a 1440px. Todo en español de Colombia.
```

---

---

## §12 · `/admin/parametros` — Parámetros del motor

> La pantalla más densa del producto y la que más pesa: aquí se cambian las reglas que
> determinan el precio de toda cotización nueva. Seis secciones, seis tablas.

```
PANTALLA 12: "Parámetros" del back-office.

Es el panel de control del motor de cálculo. Cada fila de estas tablas es una regla que
decide cuánto cuesta importar un carro, así que la pantalla tiene que transmitir dos cosas
a la vez: densidad de datos y seriedad. Quien la usa está a un clic de cambiar el precio
de todo el catálogo.

Misma envoltura de back-office (barra lateral de 240px con "Parámetros" activo; barra
superior con migas "Inicio > Parámetros" y avatar).

CUERPO:

1. Encabezado igual al del resto del back-office: "Parámetros" en Sora 1.25rem peso 600, y
   debajo, en texto secundario: "Las reglas que gobiernan cada cálculo del motor. Publicar
   cambia el precio de toda cotización nueva." Línea fina inferior.
   A la DERECHA del encabezado, alineada con el título, una insignia compacta de la TRM:
   un punto de color, "TRM", la cifra 3.126,08 en numerales tabulares, y en texto tenue
   "· 04/09/2026 · automática". Es una insignia, no un botón: sin borde grueso ni sombra.

2. BANDA DE VERSIÓN, ancho completo, sobre superficie #F6F8FA con un filete vertical de
   3px a la izquierda en verde #0F9067 cuando está ACTIVO (ámbar #B45309 si es BORRADOR).
   A la izquierda, un icono de verificación y el texto:
   "Conjunto v1 · ACTIVO desde el 4 de septiembre de 2026 · última edición 05/09/2026".
   A la derecha, dos botones pequeños: "Ver historial" fantasma y "Publicar cambios"
   primario — este último DESHABILITADO y visiblemente apagado cuando no hay borrador.

3. PESTAÑAS HORIZONTALES, ancho completo, sobre una línea fina inferior. Seis, cada una
   con su icono pequeño a la izquierda:
   Divisas · Fletes · Aranceles · Costos de destino · Agregados · Márgenes
   La activa lleva subrayado de 2px en azul #1B4FE0 y texto en peso medio; las demás en
   texto secundario, sin subrayado. NADA de recuadros ni de fondo relleno: es una barra de
   pestañas subrayadas, no una lista de botones, y NO va dentro de una tarjeta.
   No es un raíl lateral. La tabla necesita el ancho completo de la pantalla.

4. TARJETA DE LA SECCIÓN, ancho completo, borde fino y radio de 12px:
   - Cabecera interna con el nombre de la sección en 1rem peso 600 y, debajo, una línea de
     descripción en texto tenue muy pequeño. A la derecha de esa cabecera, el conteo:
     "Mostrando 8 de 8 reglas" en texto tenue con numerales tabulares.
   - Y debajo la TABLA, casi monocromática, filas separadas por líneas finas, encabezados
     en mayúsculas 0.625rem con tracking y en texto tenue.

   Dibuja la pestaña "Aranceles" activa, con estas columnas exactas:
   Subpartida | País de origen | Motorización | Arancel % | IVA % | Impoconsumo % |
   Vigencia desde | Vigencia hasta | Fuente
   Los tres porcentajes alineados a la derecha con numerales tabulares; el arancel en
   texto principal y peso medio, el IVA y el impoconsumo en peso normal.
   La columna "Fuente" es la más ancha y va en texto tenue muy pequeño, a DOS LÍNEAS como
   máximo, con puntos suspensivos si no cabe — nunca debe hacer crecer la fila a cinco
   líneas. Ejemplo de contenido: "Dto 1432 de 2025 art. 1 · IVA ET art. 468 · verificado
   04/09/2026". Cuando la verificación está vencida, un triángulo de aviso ámbar #B45309
   al final de la celda.
   Filas de 52px. Una fila con la vigencia terminada se atenúa al 55% y su celda
   "Vigencia hasta" muestra una píldora gris que dice "vencida".

5. Al pie de la tarjeta, sólo si hay más de una página: "Página 1 de 2" a la izquierda y
   dos flechas ‹ › a la derecha.

REGLAS:
- La tabla manda. Todo lo demás —insignia, banda, pestañas— es más ligero que ella.
- Nada de tarjetas de estadísticas arriba: esta pantalla no resume, edita.
- Nada de gráficos.
- El color aparece exactamente tres veces: el subrayado azul de la pestaña activa, el
  filete verde de la banda de versión, y los avisos ámbar de verificación vencida.
- Los porcentajes, fechas y códigos van con numerales tabulares.

Vista de escritorio a 1440px. Todo en español de Colombia.
```

> Cuando tengas esta, pide también: `"Ahora la misma pantalla con la pestaña 'Fletes'
> activa"`, cuyas columnas son: Ruta | Equipo | Flete USD | Recargos USD | Tránsito |
> Vehículos | Vigencia desde | Fuente.
