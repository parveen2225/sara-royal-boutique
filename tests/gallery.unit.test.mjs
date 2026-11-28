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
  // Home rails: the same thumbnails plus design-aware links; related suits keep the plain card
  assert.match(read("src/components/shop/SuitsRail.tsx"), /<SuitCard suit=\{s\} gallery designLinks \/>/);
  assert.doesNotMatch(read("src/pages/SuitCollectionsPage/SuitCollectionsPage.tsx"), /designLinks/, "Collections behaviour unchanged");
  assert.match(read("src/pages/SuitDetailPage/SuitDetailPage.tsx"), /<SuitCard suit=\{s\} \/>/);
  const css = read("src/components/shop/shop.scss");
  assert.match(css, /&_thumbs \{[^}]*pointer-events: none;/, "the overlay strip itself does not swallow clicks on the photo");
  assert.match(css, /&_visual \{[\s\S]*?\.shop_badge_out \{ bottom: auto; left: auto; top: 0\.6rem; right: 0\.6rem; \}/, "Out of Stock badge moves clear of the thumbnails");
});

test("product details gallery: whole photo visible (contain), 550-600px desktop / 340-480px phone, vertical thumbnails on desktop, zoom kept", () => {
  const page = read("src/pages/SuitDetailPage/SuitDetailPage.tsx");
  assert.match(page, /className="shop_pd_thumbs" role="group"/);
  // gallery thumbnails only change the photo; designs have their own picker
  assert.match(page, /className=\{`shop_pd_thumb \$\{i === shown \? "is_on" : ""\}`\} onClick=\{\(\) => setActive\(i\)\}/);
  assert.match(page, /\{images\.length > 1 && \(\s*<div className="shop_pd_thumbs"/, "no thumbnail rail for a single photo");
  assert.match(page, /const shown = /, "the shown index is clamped (never past the photo list)");
  assert.match(page, /onError=\{\(\) => setBroken/, "failed photos are handled, not left blank");
  assert.match(page, /<SuitImageLightbox images=\{images\} index=\{zoom\}/, "main photo opens the zoom lightbox");
  assert.match(page, /<SuitImageLightbox images=\{suit\.referenceImages\}/, "reference lightbox kept");
  const scss = read("src/pages/SuitDetailPage/suitDetail.scss");
  assert.match(scss, /\.shop_pd_main_img \{ object-fit: contain; \}/);
  assert.match(scss, /--pd-h: min\(600px, max\(440px, calc\(100vh - 13rem\)\)/, "desktop: up to 600px, by window height");
  assert.match(scss, /--pd-h: clamp\(340px, 62vh, 480px\);/, "phones: 340-480px");
  // desktop: the gallery column is as wide as its content (rail + photo box), at most 45% of the row; no empty half column
  assert.match(page, /<Col xs=\{12\} md=\{6\} lg="auto" className="shop_pd_col">/);
  assert.match(page, /<Col xs=\{12\} md=\{6\} lg>/, "details take the remaining width");
  assert.match(scss, /\.shop_pd_col \{ @media \(min-width: 992px\) \{ max-width: 45%; \} \}/);
  assert.match(scss, /--pd-box-w: min\(calc\(var\(--pd-row\) \* 0\.44 - 132px\), calc\(var\(--pd-h\) \* var\(--pd-ratio\)\)\);/);
  // one box per suit, so the details / design picker never move between designs
  assert.match(page, /const boxRatio = /); assert.match(page, /reserveRail \? "reserve_rail" : ""/);
  // regression (blank gallery): the named grid area may only be used where it is defined, i.e. with a thumbnail rail
  const gallery = scss.slice(scss.indexOf(".shop_pd_gallery {"), scss.indexOf(".shop_pd_stage { display")).replace(/\/\/.*$/gm, ""); // without comments
  const rail = gallery.slice(gallery.indexOf("&.has_thumbs {"));
  assert.match(rail, /grid-template-areas: "thumbs main"/);
  assert.match(rail, /\.shop_pd_stage \{ grid-area: main;/);
  assert.equal((gallery.match(/grid-area: main/g) || []).length, 1, "grid-area: main appears only inside &.has_thumbs");
});

test("Home cards: each thumbnail knows its design; a design is selected only after a click and carries into the links", () => {
  const s = toPublicListItem({
    ...base, fabricImages: [img("v1")],
    variants: [{ _id: "a", code: "SR-0001-V1", stock: 2, images: [img("v1")] }, { _id: "b", code: "SR-0001-V2", stock: 0, images: [img("v2")] }],
  });
  assert.deepEqual(s.imageVariants, [{ id: "a", code: "SR-0001-V1", inStock: true }, { id: "b", code: "SR-0001-V2", inStock: false }]);
  const general = toPublicListItem({ ...base, fabricImages: [img("cover")], variants: [{ _id: "a", code: "SR-0001-V1", stock: 1, images: [img("v1")] }] });
  assert.deepEqual(general.imageVariants, [null, { id: "a", code: "SR-0001-V1", inStock: true }], "the suit's own cover is a photo, not a design");
  assert.equal("imageVariants" in toPublicListItem({ ...base, fabricImages: [img("p")] }), false, "plain suits unchanged");
  const card = read("src/components/shop/SuitCard.tsx");
  assert.match(card, /designLinks && withThumbs && picked \?/, "nothing is selected until a thumbnail is clicked");
  assert.match(card, /onClick=\{\(\) => \{ setShown\(i\); setPicked\(true\); \}\}/);
  for (const re of [/<Link href=\{linkHref\} className="shop_card_media"/, /<h3 className="shop_card_title"><Link href=\{linkHref\}>/, /<Link href=\{linkHref\} className="shop_btn shop_btn_solid shop_card_btn"/]) assert.match(card, re);
  assert.match(read("src/components/shop/shop.scss"), /&_body \{ @container \(max-width: 200px\) \{ \.shop_card_btn \{ white-space: normal;/, "narrow-card buttons wrap instead of overflowing");
});
