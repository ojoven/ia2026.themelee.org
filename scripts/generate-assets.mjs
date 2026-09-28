import sharp from "sharp";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { event } from "../lib/event.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const assets = path.join(root, "public/images");
await mkdir(assets, { recursive: true });

// Only remove light pixels connected to the outside. White details inside
// the black logo remain opaque, including the ball and lightning bolt.
const { data, info } = await sharp(path.join(root, "context/logo.jpg"))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const visited = new Uint8Array(info.width * info.height);
const queue = [];
const visit = (x, y) => {
  if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
  const pixel = y * info.width + x;
  if (visited[pixel]) return;
  const i = pixel * 4;
  if (Math.min(data[i], data[i + 1], data[i + 2]) < 185) return;
  visited[pixel] = 1;
  queue.push(pixel);
};
for (let x = 0; x < info.width; x++) {
  visit(x, 0);
  visit(x, info.height - 1);
}
for (let y = 0; y < info.height; y++) {
  visit(0, y);
  visit(info.width - 1, y);
}
for (let head = 0; head < queue.length; head++) {
  const p = queue[head];
  data[p * 4 + 3] = 0;
  const x = p % info.width;
  const y = Math.floor(p / info.width);
  visit(x - 1, y);
  visit(x + 1, y);
  visit(x, y - 1);
  visit(x, y + 1);
}
const logo = await sharp(data, { raw: info }).png().toBuffer();
await sharp(logo)
  .webp({ lossless: true })
  .toFile(path.join(assets, "logo.webp"));
await sharp(logo)
  .resize(64, 64)
  .png()
  .toFile(path.join(root, "public/icon.png"));
const favicon = await sharp(logo).resize(32, 32).png().toBuffer();
// ICO containing a PNG image, supported by modern desktop browsers.
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = 32;
icoHeader[7] = 32;
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(favicon.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile(
  path.join(root, "public/favicon.ico"),
  Buffer.concat([icoHeader, favicon]),
);
await sharp(logo)
  .resize(144, 144)
  .extend({ top: 18, bottom: 18, left: 18, right: 18, background: "#f5f1e9" })
  .flatten({ background: "#f5f1e9" })
  .png()
  .toFile(path.join(root, "public/apple-touch-icon.png"));

const sourceHero = path.join(root, "context/hero.jpg");
const { data: heroPixels, info: heroInfo } = await sharp(sourceHero)
  .rotate()
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const transparentHero = Buffer.alloc(heroInfo.width * heroInfo.height * 4);
// Fade the photographed paper matte to alpha while retaining the illustration's
// pale watercolor strokes and feathered contours.
const paper = [241, 233, 223];
for (let pixel = 0; pixel < heroInfo.width * heroInfo.height; pixel++) {
  const source = pixel * 3;
  const target = pixel * 4;
  const red = heroPixels[source];
  const green = heroPixels[source + 1];
  const blue = heroPixels[source + 2];
  const distance = Math.sqrt(
    (red - paper[0]) ** 2 +
      (green - paper[1]) ** 2 +
      (blue - paper[2]) ** 2,
  );
  const alpha = Math.max(0, Math.min(255, ((distance - 18) / 50) * 255));
  transparentHero[target] = red;
  transparentHero[target + 1] = green;
  transparentHero[target + 2] = blue;
  transparentHero[target + 3] = alpha;
}
const heroWidths = [
  320,
  384,
  480,
  640,
  750,
  828,
  900,
  1080,
  1448,
];
const heroOutputName = (width, format) =>
  format === "webp" && width === heroInfo.width
    ? "hero.webp"
    : `hero-${width}.${format}`;
const heroPipeline = () =>
  sharp(transparentHero, {
    raw: {
      width: heroInfo.width,
      height: heroInfo.height,
      channels: 4,
    },
  });

// Static exports have no runtime image optimizer, so emit the exact candidates
// used by the hero's responsive srcset in both modern and fallback formats.
for (const width of heroWidths) {
  await Promise.all([
    heroPipeline()
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: 52, effort: 4 })
      .toFile(path.join(assets, heroOutputName(width, "avif"))),
    heroPipeline()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, alphaQuality: 92, effort: 6 })
      .toFile(path.join(assets, heroOutputName(width, "webp"))),
  ]);
}

// Generate a social card from the actual hero, transparent logo and event copy.
// Pango can silently fall back when given the web-optimized WOFF2 files, so the
// bundled TTF copies have unambiguous family names and render deterministically.
const cardFonts = {
  heading: {
    family: "Themelee Space Grotesk",
    file: path.join(root, "scripts/fonts/space-grotesk-variable.ttf"),
  },
  body: {
    family: "Themelee Inter",
    file: path.join(root, "scripts/fonts/inter-variable.ttf"),
  },
};
const escape = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const textLayer = async (
  text,
  size,
  color,
  left,
  top,
  { font = cardFonts.heading, weight = 400, letterSpacing = 0 } = {},
) => ({
  input: await sharp({
    text: {
      text: `<span foreground="${color}" weight="${weight}" letter_spacing="${Math.round(letterSpacing * 1024)}">${escape(text)}</span>`,
      font: `${font.family} ${size}`,
      fontfile: font.file,
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer(),
  left,
  top,
});
const cardHero = await sharp(sourceHero)
  .resize(810, 630, { fit: "cover", position: "centre" })
  .png()
  .toBuffer();
const backdrop = Buffer.from(
  `<svg width="1200" height="630"><defs><linearGradient id="fade"><stop offset="0" stop-color="#f5f1e9"/><stop offset=".43" stop-color="#f5f1e9"/><stop offset=".74" stop-color="#f5f1e9" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#fade)"/><rect x="54" y="543" width="318" height="48" rx="24" fill="#e96937"/></svg>`,
);
const overlays = [
  { input: cardHero, left: 390, top: 0 },
  { input: backdrop, left: 0, top: 0 },
  {
    input: await sharp(logo).resize(52, 52).png().toBuffer(),
    left: 54,
    top: 38,
  },
  await textLayer("THE MÊLÉE · DONOSTIA", 17, "#252821", 120, 56, {
    weight: 650,
  }),
  await textLayer("IA, desarrollo", 76, "#252821", 49, 142, {
    weight: 600,
    letterSpacing: -5,
  }),
  await textLayer("y producto.", 88, "#df572c", 49, 226, {
    weight: 600,
    letterSpacing: -5,
  }),
  await textLayer(event.date, 27, "#252821", 55, 373, { weight: 550 }),
  await textLayer(`${event.time} · ${event.venueResumed}`, 23, "#494c43", 55, 414),
  await textLayer("CÓMO USARLA · CÓMO SACARLE PARTIDO", 16, "#252821", 55, 476, {
    font: cardFonts.body,
    weight: 600,
  }),
  await textLayer("FISHBOWL · ENTRADA GRATIS", 16, "#252821", 78, 560, {
    font: cardFonts.body,
    weight: 650,
  }),
];
await sharp({
  create: { width: 1200, height: 630, channels: 3, background: "#f5f1e9" },
})
  .composite(overlays)
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(path.join(root, "public/og-image.jpg"));

// Onboarding illustrations get the same paper-to-alpha treatment as the hero,
// using each image's own corner tone as the paper colour.
const onboardingArt = ["welcome", "role", "tools", "frequency", "topics"];
await mkdir(path.join(assets, "onboarding"), { recursive: true });
for (const name of onboardingArt) {
  const { data: pixels, info: artInfo } = await sharp(
    path.join(root, `context/onboarding/${name}.png`),
  )
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const artPaper = [pixels[0], pixels[1], pixels[2]];
  const faded = Buffer.alloc(artInfo.width * artInfo.height * 4);
  for (let pixel = 0; pixel < artInfo.width * artInfo.height; pixel++) {
    const source = pixel * 3;
    const target = pixel * 4;
    const distance = Math.sqrt(
      (pixels[source] - artPaper[0]) ** 2 +
        (pixels[source + 1] - artPaper[1]) ** 2 +
        (pixels[source + 2] - artPaper[2]) ** 2,
    );
    faded[target] = pixels[source];
    faded[target + 1] = pixels[source + 1];
    faded[target + 2] = pixels[source + 2];
    faded[target + 3] = Math.max(0, Math.min(255, ((distance - 14) / 46) * 255));
  }
  const art = () =>
    sharp(faded, {
      raw: { width: artInfo.width, height: artInfo.height, channels: 4 },
    }).resize({ width: 1040, withoutEnlargement: true });
  await Promise.all([
    art()
      .avif({ quality: 52, effort: 4 })
      .toFile(path.join(assets, `onboarding/${name}.avif`)),
    art()
      .webp({ quality: 80, alphaQuality: 92, effort: 6 })
      .toFile(path.join(assets, `onboarding/${name}.webp`)),
  ]);
}

const generatedHeroImages = heroWidths.flatMap((width) => [
  `images/${heroOutputName(width, "avif")}`,
  `images/${heroOutputName(width, "webp")}`,
]);
for (const name of [
  ...generatedHeroImages,
  ...onboardingArt.flatMap((name) => [
    `images/onboarding/${name}.avif`,
    `images/onboarding/${name}.webp`,
  ]),
  "images/logo.webp",
  "icon.png",
  "favicon.ico",
  "og-image.jpg",
]) {
  const size = (await stat(path.join(root, "public", name))).size;
  console.log(`${name}: ${(size / 1024).toFixed(1)} KB`);
}
