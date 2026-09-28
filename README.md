# The Mêlée — ¡vuelve!

Landing del encuentro del 2 de octubre: [https://ia2026.themelee.org](https://ia2026.themelee.org). Next.js 16 (App Router), React 19 y TypeScript, con estilos CSS propios. Contenido renderizado en servidor y animaciones CSS que respetan `prefers-reduced-motion`.

## Desarrollo

```sh
npm install
npm run assets
npm run dev
```

## Producción

```sh
npm run build
```

El build regenera automáticamente las imágenes y crea una exportación completamente estática en `out/`. Puedes publicar el contenido de esa carpeta en cualquier alojamiento de archivos estáticos; no necesita un servidor de Next.js.

Configura `NEXT_PUBLIC_SITE_URL` con la URL definitiva antes del build: se utiliza en la URL canónica y los metadatos de Open Graph y X. Su valor predeterminado es `https://themelee.org`.

## Contenido pendiente

- `lib/event.mjs`: sustituir `registrationUrl` (`https://example.com/inscripcion`) por el formulario definitivo. Los tres botones utilizan este valor.
- El encuentro será en **Garate Innogunea, Universidad de Deusto (Donostia)**.

## Recursos

Los originales se conservan en `context/`. `npm run assets` utiliza Sharp para:

- Optimizar `context/hero.jpg` a WebP para que la exportación estática lo sirva directamente.
- Eliminar únicamente el blanco exterior de `context/logo.jpg`, conservando los detalles blancos internos.
- Crear el logo transparente, los favicons PNG e ICO y el icono de Apple.
- Componer `public/og-image.jpg` (1200 × 630) con la imagen del hero, el logo y el resumen del evento. Los textos se rasterizan con una fuente incluida en las dependencias, sin servicios de generación externos.

Las fuentes Space Grotesk, Inter y Caveat se alojan localmente mediante `next/font/local`; el navegador no realiza peticiones a Google Fonts.

El contenido de la comunidad se ha adaptado del [archivo original de The Mêlée](https://themelee.org/), enlazado desde la propia landing. No se ha trasladado ninguna sede histórica como ubicación del nuevo evento.

## Onboarding y mapa del círculo

- `/app`: formulario de cuatro pasos (perfil, herramientas, intensidad de trabajo con IA y prioridades de conversación) para enviar a las personas inscritas el día antes del evento. El nombre es opcional; admite herramientas añadidas por texto y permite arrastrar los seis temas para ordenarlos. Cada navegador guarda un identificador y reenviar actualiza la respuesta.
- `/app/dashboard`: el mapa del círculo con los datos agregados. Se muestra después de enviar el formulario. La organización ve además los nombres opcionales y las propuestas abiertas en `/app/dashboard#key=<ADMIN_KEY>`.
- Opciones, herramientas y niveles están en `lib/onboarding.mjs`, compartido por las páginas y la API.

Ambas páginas siguen siendo estáticas y hablan con un servicio aparte (`api/server.mjs`, Node + PostgreSQL) en `NEXT_PUBLIC_API_URL`. Copia `.env.example` a `.env` y:

```sh
npm run api:db            # PostgreSQL local en Docker (puerto 5439)
npm run api               # API en http://localhost:8787 (crea la tabla al arrancar)
npm run api:seed          # 64 respuestas de prueba, enviadas por el mismo endpoint del formulario
npm run api:seed -- --clear   # borra las respuestas de prueba antes de enviar el enlace real
```

En producción, despliega `api/` con `DATABASE_URL`, `ADMIN_KEY` y `ALLOWED_ORIGINS` (el dominio de la web), y construye la web con `NEXT_PUBLIC_API_URL` apuntando a esa API.

En `secondary`, la web estática usa `/api` a través de Apache. La API de producción se ejecuta como `ia2026-onboarding-prod-api.service` y su PostgreSQL usa `api/docker-compose.prod.yml` con un volumen propio. El entorno `demo:*` conserva una base de datos distinta y puede reiniciarse sin borrar respuestas reales.

### Previsualizar con una base de datos nueva

El entorno de prueba usa otra base de datos, API y servidor web. Cada comando recrea **solo** el volumen de prueba; la base de datos habitual del puerto 5439 no se modifica.

```sh
npm run demo:empty   # 0 respuestas
npm run demo:few     # reinicia la demo y añade 3 respuestas de ejemplo
npm run demo:stop    # detiene la demo y elimina su volumen
```

Abre `http://localhost:3001/app` para probar el formulario o `http://localhost:3001/app/dashboard#key=demo-local` para ver las estadísticas incluso cuando todavía no hay respuestas. La API de prueba está en `http://localhost:8788` y PostgreSQL en `127.0.0.1:5440`. Los servicios de prueba solo escuchan en localhost; si trabajas en un servidor remoto, reenvía los puertos 3001 y 8788 a tu equipo.

En un servidor donde el puerto 3001 esté ocupado o Docker requiera sudo sin contraseña, usa `DEMO_WEB_PORT=3003 DEMO_USE_SUDO_DOCKER=1 npm run demo:empty`. El puerto de la API se puede ajustar con `DEMO_API_PORT`; añade `DEMO_ALLOWED_ORIGIN=https://ia2026.themelee.org` si accedes desde el dominio publicado.

## En directo

Tres vistas para el día del evento, sincronizadas en tiempo real:

- `/live`: la web para los móviles (la del QR). Muestra el tema actual y, cuando se lanza una votación, sus opciones. El voto es anónimo (un identificador aleatorio por navegador, distinto del del onboarding) y se puede cambiar mientras la votación está abierta.
- `/live/screen`: la pantalla del proyector. Escenas: bienvenida con QR, el mapa del círculo, tema (con aviso y QR si hay una votación abierta), votación y mensaje libre. `F` o doble clic alterna la pantalla completa y `D` el modo oscuro. Evita que el equipo se suspenda y oculta el cursor.
- `/live/control#key=<ADMIN_KEY>`: la sala de control. Vista previa de la pantalla, escenas, temporizador, la votación en curso (cerrar, mostrar u ocultar resultados, retirar), el guion con cinco votaciones preparadas por tema y un formulario para crear votaciones propias, de una opción o de varias con límite opcional.

Las votaciones preparadas y la descripción de cada tema están en `lib/live.mjs`. Los votos guardan la posición de la opción: no reordenes ni quites opciones de una votación que ya tenga votos.

La API (`api/live.mjs`) mantiene un único estado que envía completo por Server-Sent Events en `/live/stream`, y lo guarda en PostgreSQL (`live_state`, `live_votes` y `live_polls`, que se crean al arrancar). Si la API se reinicia, vuelve con el mismo tema, votación, votos y temporizador, y las páginas se reconectan solas. Los recuentos no llegan al público hasta que se muestran los resultados.

Antes del evento:

1. Reinicia la API de producción para que cree las tablas nuevas, y publica la web.
2. Haz una prueba con un móvil con datos y otro con la wifi de la sala.
3. En la sala de control, pulsa **Reiniciar sesión** para borrar los votos de prueba. Las votaciones que hayas creado se mantienen.

El proxy de Apache de `/api` tiene que dejar pasar el streaming. La API envía `Cache-Control: no-cache, no-transform` para que la compresión no retenga los eventos y un ping cada 20 segundos. Si los cambios llegaran con retraso, añade `flushpackets=on` al `ProxyPass` de `/api`. Las rutas nuevas ya están en `public/.htaccess`.

## Comprobaciones

```sh
npm run typecheck
npm run build
```
