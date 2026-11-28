import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { toPublicListItem, toPublicDetail } from "../src/lib/publicSuits.ts";

const read = (p) => fs.readFileSync(p, "utf8");
const img = (n) => ({ url: `https://res.cloudinary.com/demo/image/upload/v1/sara-royal/${n}.jpg` });
const base = { _id: "64b000000000000000000001", sku: "SR-0001", name: "Rose", originalPricePaise: 200000, salePricePaise: 150000, stock: 3 };

test("card gallery: up to 4 uploaded photos (first = cover) plus the total, for 1 / 2 / 4 / 6 photos", () => {
  for (const [n, shown] of [[1, 1], [2, 2], [4, 4], [6, 4]]) {
    const s = toPublicListItem({ ...base, fabricImages: Array.from({ length: n }, (_, i) => img(`p${i}`)) });
    assert.equal(s.images.length, shown, `${n} photos`);
    assert.equal(s.imageCount, n);
    assert.equal(s.images[0], s.cover, "first thumbnail is the cover");
  }
  assert.deepEqual(toPublicListItem({ ...base, fabricImages: [] }).images, []);
});

test("card gallery for a suit with design variants: cover, then each design's first photo; no duplicates; price/stock untouched", () => {
  const s = toPublicListItem({
    ...base, stock: 3, fabricImages: [img("cover"), img("side")],
    variants: [{ _id: "a", code: "SR-0001-V1", stock: 1, images: [img("cover"), img("v1b")] }, { _id: "b", code: "SR-0001-V2", stock: 2, images: [img("v2")] }],
  });
  assert.deepEqual(s.images.map((u) => u.split("/").pop()), ["cover.jpg", "v2.jpg", "side.jpg"]);
  assert.equal(s.imageCount, 3);
  assert.deepEqual([s.salePricePaise, s.maxQuantity, s.inStock], [150000, 3, true]);
  // the detail payload is unchanged by the card gallery
  assert.equal(toPublicDetail({ ...base, fabricImages: [img("x")] }).fabricImages.length, 1);
});

test("Collections cards: thumbnails are buttons beside the photo link (never inside it), opt-in from Collections only", () => {
  const card = read("src/components/shop/SuitCard.tsx");
  const link = card.slice(card.indexOf("const media = ("), card.indexOf("</Link>", card.indexOf("const media = (")));
  assert.doesNotMatch(link, /<button/, "no button inside the photo link (a click there would navigate)");
  assert.match(card, /className="shop_card_thumbs" role="group"/);
  assert.match(card, /aria-pressed=\{i === shown\}/);
  assert.match(card, /gallery = false/);
  assert.match(read("src/pages/SuitCollectionsPage/SuitCollectionsPage.tsx"), /<SuitCard suit=\{s\} gallery \/>/);
  // Home rails and related suits keep the plain card (Home page unchanged)
  assert.doesNotMatch(read("src/components/shop/SuitsRail.tsx"), /gallery/);
  assert.match(read("src/pages/SuitDetailPage/SuitDetailPage.tsx"), /<SuitCard suit=\{s\} \/>/);
  const css = read("src/components/shop/shop.scss");
  assert.match(css, /&_thumbs \{[^}]*pointer-events: none;/, "the overlay strip itself does not swallow clicks on the photo");
  assert.match(css, /&_visual \{[\s\S]*?\.shop_badge_out \{ bottom: auto; left: auto; top: 0\.6rem; right: 0\.6rem; \}/, "Out of Stock badge moves clear of the thumbnails");
});

test("product details gallery: whole photo visible (contain), capped height, vertical thumbnails on desktop, zoom kept", () => {
  const page = read("src/pages/SuitDetailPage/SuitDetailPage.tsx");
  assert.match(page, /className="shop_pd_thumbs" role="group"/);
  // gallery thumbnails only change the photo; designs have their own picker
  assert.match(page, /className=\{`shop_pd_thumb \$\{i === active \? "is_on" : ""\}`\} onClick=\{\(\) => setActive\(i\)\}/);
  assert.match(page, /<SuitImageLightbox images=\{images\} index=\{zoom\}/, "main photo opens the zoom lightbox");
  assert.match(page, /<SuitImageLightbox images=\{suit\.referenceImages\}/, "reference lightbox kept");
  const scss = read("src/pages/SuitDetailPage/suitDetail.scss");
  assert.match(scss, /\.shop_pd_main_img \{ object-fit: contain; \}/);
  assert.match(scss, /@media \(min-width: 992px\) \{ aspect-ratio: auto; height: clamp\(380px, 36vw, 480px\); max-height: none; \}/);
  assert.match(scss, /grid-template-areas: "thumbs main"/);
  assert.match(scss, /max-height: min\(72vh, 520px\)/, "phones: never taller than the screen allows");
});
