// Builds the photo masters served at public/images/<original path>.
//
// Every admin photo key ("images/hillcountry/day3.jpg") keeps its path; the file behind it is
// either a Real-ESRGAN x4plus upscale of the original (downsampled to 3072px) or one of the
// owner's high-resolution photos where the original was a collage or too soft. The untouched
// originals stay in /originals. Writes content/generated/images.json (size + blur placeholder).
//
//   UPSCALED_DIR=<realesrgan 4x output> HQ_DIR=<"HQ Images" folder> node scripts/build-images.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ORIGINALS = path.join(ROOT, "originals");
const PUBLIC = path.join(ROOT, "public");
const UPSCALED = process.env.UPSCALED_DIR;
const HQ = process.env.HQ_DIR;
if (!UPSCALED || !HQ) throw new Error("Set UPSCALED_DIR and HQ_DIR");

// Slots whose original cannot be fixed by upscaling (collages, split frames, 1000px crops).
const REPLACED = {
  "images/signaturejourney/sigjhp1.jpg": { hq: "Signature Sri Lanka Journey.jpeg" },
  "images/signaturejourney/signaturejourney.jpg": { hq: "Signature Sri Lanka Journey.jpeg" },
  "images/hillcountry/hillcountryhp.jpg": { hq: "Hill Country & Scenic Rail.jpeg" },
  "images/naturewildlife/wildlifehp1.jpg": { hq: "Nature & Wildlife Discovery.jpeg" },
  "images/naturewildlife/wildlifehp.jpg": { hq: "Nature & Wildlife Discovery.jpeg" },
  "images/coastalretreat/coastalhp.jpg": { hq: "Coastal Retreat.jpeg" },
  "images/hillcountry/day2.jpg": { hq: "Kandy Temple of the Tooth.jpeg" },
  "images/hillcountry/day4.jpg": { hq: "Nuwara Eliya Gregory Lake or a tea factory.jpeg" },
  "images/hillcountry/day5.jpg": { hq: "Hill Country blue train on the Nine Arch Bridge.jpeg" },
  "images/hillcountry/day6.jpg": { hq: "Ella Little Adam's Peak or Ravana Falls.jpeg" },
  "images/coastalretreat/day1.jpg": { up: "highlights/beach/arugambay" },
  "images/highlights/cultural/sigirya.jpg": { hq: "Culture Sigiriya rock fortress.jpeg" },
  "images/highlights/cultural/atamasthana.jpg": { hq: "Polonnaruwa .jpeg" },
  "images/highlights/cultural/kandy.jpg": { hq: "Kandy Temple of the Tooth.jpeg" },
  "images/highlights/wildlife/leopard.jpg": { hq: "Leopard in the wild.jpeg" },
};

// New photo slots for the redesign (also registered in the admin's website photo list).
const ADDED = {
  "images/hq/elephants.jpg": "Elephants in the wild.jpeg",
  "images/hq/rainforest.jpg": "Greenery misty forest road or rainforest path.jpeg",
  "images/hq/tea-hills.jpg": "Tea Hills rolling tea estates.jpeg",
  "images/hq/tea-leaves.jpg": "Tea bush close-up.jpeg",
  "images/hq/nine-arch-bridge.jpg": "Nine Arch Bridge from track level.jpeg",
  "images/hq/coconut-tree-hill.jpg": "Coconut Tree Hill.jpeg",
  "images/hq/coast-bay.jpg": "Coast palm-lined bay and ocean.jpeg",
  "images/hq/galle-lighthouse.jpg": "Galle Fort.jpeg",
};

const MAX_HQ = 3200;
const MAX_UP = 3072;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(jpe?g|png)$/i.test(e.name) ? [p] : [];
  });
}

async function write(key, input, max) {
  const out = path.join(PUBLIC, key);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let img = sharp(input).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true });
  img = key.endsWith(".png")
    ? img.png({ compressionLevel: 9, effort: 8 })
    : img.jpeg({ quality: 82, mozjpeg: true, progressive: true });
  const info = await img.toFile(out);
  const blur = await sharp(out).resize(24, 24, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return { w: info.width, h: info.height, blur: `data:image/webp;base64,${blur.toString("base64")}` };
}

const manifest = {};
const originals = walk(path.join(ORIGINALS, "images"));
for (const file of originals) {
  const key = path.relative(ORIGINALS, file).replace(/\\/g, "/");
  const rel = key.replace(/^images\//, "").replace(/\.(jpe?g|png)$/i, "");
  const swap = REPLACED[key];
  const source = swap?.hq
    ? { path: path.join(HQ, swap.hq), max: MAX_HQ }
    : { path: path.join(UPSCALED, (swap?.up || rel) + ".png"), max: MAX_UP };
  manifest[key] = await write(key, source.path, key.endsWith(".png") ? 2400 : source.max);
  console.log(key, manifest[key].w + "x" + manifest[key].h, swap ? "(replaced)" : "(upscaled)");
}
for (const [key, file] of Object.entries(ADDED)) {
  manifest[key] = await write(key, path.join(HQ, file), MAX_HQ);
  console.log(key, manifest[key].w + "x" + manifest[key].h, "(new)");
}

// Foliage cut-outs for the 3D hero layers (keep alpha).
fs.mkdirSync(path.join(PUBLIC, "media", "3d"), { recursive: true });
for (const [name, file] of [["leaves", "Close-up jungle leaves.png"], ["fronds", "Palm fronds.png"]]) {
  await sharp(path.join(HQ, file)).resize({ width: 2048 }).webp({ quality: 80, alphaQuality: 90 }).toFile(path.join(PUBLIC, "media", "3d", name + ".webp"));
}

fs.writeFileSync(path.join(ROOT, "content", "generated", "images.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(Object.keys(manifest).length, "images");
