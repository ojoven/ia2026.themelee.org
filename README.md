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

## Comprobaciones

```sh
npm run typecheck
npm run build
```
