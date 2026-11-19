// Generates supabase/seed.sql: the replaceable sample catalog used in development and
// demos. Every row it creates is flagged is_sample, and Admin > Settings > Sample data
// removes them all in one click.
//
//   node scripts/generate-seed.mjs                 writes supabase/seed.sql
//   node scripts/generate-seed.mjs --pack <store>  prints SQL adding the newer products to a store
//
// Brands, products and copy are fictional. Photos are from Unsplash (free to use under
// the Unsplash License, https://unsplash.com/license) and are loaded from their CDN.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// crop "faces" keeps people's faces in frame when a tall photo is cut to a wide banner.
const img = (id, ar = "4:5", crop = "") => `https://images.unsplash.com/photo-${id}?ar=${ar}&fit=crop${crop ? `&crop=${crop}` : ""}&w=1200&q=80&auto=format`;
const wide = (id) => img(id, "16:9");
const tall = (id) => img(id, "3:4");

const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(", ")}]::text[]`;
const json = (o) => `${q(JSON.stringify(o))}::jsonb`;

const sizeGuides = [
  {
    key: "women",
    name: "Women's tops, dresses and trousers",
    unit: "cm",
    columns: ["Size", "Bust", "Waist", "Hip"],
    rows: [["XS", "81", "63", "89"], ["S", "86", "68", "94"], ["M", "91", "73", "99"], ["L", "97", "79", "105"], ["XL", "103", "85", "111"]],
    how: "Bust: around the fullest part. Waist: around the narrowest part. Hip: around the fullest part, feet together.",
  },
  {
    key: "men",
    name: "Men's shirts, tees and knitwear",
    unit: "cm",
    columns: ["Size", "Chest", "Waist", "Sleeve"],
    rows: [["S", "92", "78", "62"], ["M", "98", "84", "63"], ["L", "104", "90", "64"], ["XL", "110", "96", "65"], ["XXL", "116", "102", "66"]],
    how: "Chest: under the arms around the fullest part. Sleeve: from the centre back of the neck to the wrist.",
  },
  {
    key: "trousers",
    name: "Trousers and denim",
    unit: "in",
    columns: ["Size", "Waist", "Hip", "Inseam"],
    rows: [["28", "28", "36", "32"], ["30", "30", "38", "32"], ["32", "32", "40", "32"], ["34", "34", "42", "32"], ["36", "36", "44", "32"]],
    how: "Measure your natural waist and the inside leg from crotch to ankle.",
  },
  {
    key: "blazer",
    name: "Tailoring",
    unit: "in",
    columns: ["Size", "Chest", "Shoulder", "Sleeve"],
    rows: [["38", "38", "17.5", "25"], ["40", "40", "18", "25.5"], ["42", "42", "18.5", "26"], ["44", "44", "19", "26.5"]],
    how: "Your tailoring size is your chest measurement in inches.",
  },
  {
    key: "belts",
    name: "Belts",
    unit: "in",
    columns: ["Size", "Fits waist"],
    rows: [["S", "28-30"], ["M", "32-34"], ["L", "36-38"]],
    how: "Choose the size of the trousers you wear the belt with.",
  },
];

const brands = [
  { slug: "atelier-mira", name: "Atelier Mira", code: "AM", featured: true, banner: img("1779406165962-7df12de281b1", "16:9"),
    description: "Fluid womenswear in satin, georgette and fine cotton. Atelier Mira designs in small seasonal drops and cuts every piece to move." },
  { slug: "northloom", name: "Northloom", code: "NL", featured: true, banner: wide("1641642231157-0849081598a2"),
    description: "Knitwear spun from merino, cotton and wool blends, made in short runs so nothing sits in a warehouse for long." },
  { slug: "kaari-studio", name: "Kaari Studio", code: "KS", featured: true, banner: wide("1761369332487-777e59fa4bcf"),
    description: "Handloom weaves, hand embroidery and handmade jewellery from artisan clusters across India. Kaari means craft." },
  { slug: "sable-row", name: "Sable Row", code: "SR", featured: true, banner: wide("1619603364904-c0498317e145"),
    description: "Tailoring and shirting with a quiet, exact fit. Natural fibres, considered details, nothing extra." },
  { slug: "field-and-fold", name: "Field & Fold", code: "FF", featured: false, banner: wide("1489987707025-afc232f7ea0f"),
    description: "Everyday essentials in organic cotton and denim, designed to be worn hard and washed often." },
  { slug: "lumen-leather", name: "Lumen Leather", code: "LL", featured: true, banner: wide("1760624089496-01ae68a92d58"),
    description: "Vegetable-tanned leather goods, stitched to soften and darken beautifully with use." },
  { slug: "glitch-garden", name: "Glitch Garden", code: "GG", featured: true, banner: img("1790283727726-f8ba027df653", "16:9", "faces"),
    description: "Y2K-born going-out pieces: corsets, crop tops, minis and statement jackets, made in small drops that don't come back." },
  { slug: "low-orbit", name: "Low Orbit", code: "LO", featured: true, banner: img("1780566759823-6ab515d86760", "16:9", "faces"),
    description: "Streetwear in heavyweight cotton, washed denim and ripstop: boxy tees, cargos, jorts and varsity jackets." },
];

const categories = [
  { slug: "women", name: "Women", image: tall("1668952135120-7d997b1b3778"), banner: wide("1779406165962-7df12de281b1"), sort: 1,
    description: "Dresses, corsets, denim and tailoring for every day and every night out." },
  { slug: "men", name: "Men", image: tall("1619603364904-c0498317e145"), banner: wide("1617137968427-85924c800a22"), sort: 2,
    description: "Shirting, knitwear, denim and outerwear, cut with care." },
  { slug: "unisex", name: "Unisex", image: tall("1521572163474-6864f9cf17ab"), banner: wide("1562157873-818bc0726f68"), sort: 3,
    description: "Wardrobe essentials designed to fit everyone." },
  { slug: "accessories", name: "Accessories", image: tall("1624687943971-e86af76d57de"), banner: wide("1760624089496-01ae68a92d58"), sort: 4,
    description: "Leather bags, belts and handmade jewellery." },
  { slug: "women-dresses", parent: "women", name: "Dresses", guide: "women", sort: 1 },
  { slug: "women-tops", parent: "women", name: "Tops & Shirts", guide: "women", sort: 2 },
  { slug: "women-skirts", parent: "women", name: "Skirts", guide: "women", sort: 3 },
  { slug: "women-trousers", parent: "women", name: "Trousers & Jeans", guide: "women", sort: 4 },
  { slug: "women-knitwear", parent: "women", name: "Knitwear", guide: "women", sort: 5 },
  { slug: "women-outerwear", parent: "women", name: "Coats & Jackets", guide: "women", sort: 6 },
  { slug: "men-shirts", parent: "men", name: "Shirts", guide: "men", sort: 1 },
  { slug: "men-tshirts", parent: "men", name: "T-Shirts", guide: "men", sort: 2 },
  { slug: "men-knitwear", parent: "men", name: "Knitwear", guide: "men", sort: 3 },
  { slug: "men-trousers", parent: "men", name: "Trousers & Denim", guide: "trousers", sort: 4 },
  { slug: "men-outerwear", parent: "men", name: "Coats & Jackets", guide: "men", sort: 5 },
  { slug: "unisex-essentials", parent: "unisex", name: "Essentials", guide: "men", sort: 1 },
  { slug: "accessories-bags", parent: "accessories", name: "Bags", sort: 1 },
  { slug: "accessories-belts", parent: "accessories", name: "Belts", guide: "belts", sort: 2 },
  { slug: "accessories-jewellery", parent: "accessories", name: "Jewellery", sort: 3 },
];

const W = ["XS", "S", "M", "L"];
const WX = ["XS", "S", "M", "L", "XL"];
const M = ["S", "M", "L", "XL", "XXL"];
const ONE = [""];

// colours: [name, hex, [image ids]]
const products = [
  // Women
  { t: "Bias-Cut Satin Slip Dress", b: "atelier-mira", c: "women-dresses", p: 6490, sizes: W, featured: true,
    colors: [["Champagne", "#E8D9C0", ["1750064159040-c37883f82014"]], ["Black", "#151515", ["1594019739447-6c8a1d744d61"]]],
    tags: ["occasion", "evening", "satin"], fabric: "100% viscose satin with a soft sheen.",
    fit: "Cut on the bias to skim the body. True to size, or size down for a closer fit.",
    care: "Dry clean recommended. Cool iron on the reverse.",
    d: "A slip dress cut on the bias so it falls in a clean line from adjustable straps to a mid-calf hem. Wear it alone in the evening or under a knit by day." },
  { t: "Liquid Satin Maxi Dress", b: "atelier-mira", c: "women-dresses", p: 8990, cmp: 11990, sizes: W,
    colors: [["Pewter", "#8E8C88", ["1790802243983-e6de0e275f59", "1790802162556-453f0527091f"]]],
    tags: ["occasion", "evening", "satin"], fabric: "Recycled polyester satin, fully lined.",
    fit: "Floor-length, close through the body with a cowl neckline. True to size.",
    care: "Dry clean only.",
    d: "A floor-length dress in heavyweight liquid satin with a draped cowl neck and low back. Made for evenings that go on." },
  { t: "Floral Print Midi Dress", b: "atelier-mira", c: "women-dresses", p: 4290, sizes: WX,
    colors: [["Poppy", "#B3261E", ["1572804013309-59a88b7e92f1"]]],
    tags: ["summer", "print"], fabric: "100% cotton voile.",
    fit: "Relaxed bodice with a full, swishy skirt. Belt included.",
    care: "Machine wash cold on a gentle cycle. Line dry in shade.",
    d: "A breezy cotton voile midi printed with small poppies, with flutter sleeves and a self-tie belt to cinch the waist." },
  { t: "Ruffled Off-Shoulder Dress", b: "atelier-mira", c: "women-dresses", p: 3490, cmp: 4490, sizes: W,
    colors: [["Ivory", "#F4F0E6", ["1515372039744-b8f02a3ae446"]]],
    tags: ["summer", "resort"], fabric: "Cotton poplin.",
    fit: "Elasticated neckline sits off the shoulder. Mini length.",
    care: "Machine wash cold. Warm iron.",
    d: "A crisp cotton mini with a tiered ruffle skirt and an elasticated off-shoulder neckline." },
  { t: "Puff-Sleeve Tiered Dress", b: "atelier-mira", c: "women-dresses", p: 5290, sizes: W,
    colors: [["Blush Dot", "#E8C4C4", ["1581044777550-4cfa60707c03"]]],
    tags: ["occasion", "print"], fabric: "Polka-dot georgette with a cotton lining.",
    fit: "Voluminous puff sleeves, relaxed through the body.",
    care: "Hand wash cold or dry clean.",
    d: "Georgette in a scattered blush dot, gathered into dramatic puff sleeves and a tiered skirt." },
  { t: "Wrap Maxi Dress", b: "atelier-mira", c: "women-dresses", p: 4990, cmp: 6490, sizes: ["S", "M", "L", "XL"],
    colors: [["Powder Blue", "#AFC6DC", ["1539008835657-9e8e9680c956"]]],
    tags: ["resort", "summer"], fabric: "Lightweight crepe.",
    fit: "True wrap with a long tie. Adjustable fit at the waist.",
    care: "Machine wash cold, gentle cycle.",
    d: "A true wrap dress in fluid crepe with a high side slit. Packs flat and never needs an iron." },
  { t: "Pleated Georgette Gown", b: "atelier-mira", c: "women-dresses", p: 9490, sizes: W,
    colors: [["Crimson", "#A4161A", ["1595777457583-95e059d581b8"]]],
    tags: ["occasion", "evening", "festive"], fabric: "Georgette with sunray pleats.",
    fit: "Fitted halter bodice with a full pleated skirt.",
    care: "Dry clean only. Store hanging.",
    d: "Hundreds of permanent sunray pleats give this halter gown its movement. A statement for weddings and festive evenings." },
  { t: "Tie-Neck Georgette Blouse", b: "atelier-mira", c: "women-tops", p: 2990, sizes: WX,
    colors: [["Ivory", "#F2EEE4", ["1608234807905-4466023792f5"]]],
    tags: ["workwear"], fabric: "Georgette.",
    fit: "Relaxed with long cuffed sleeves.",
    care: "Hand wash cold. Cool iron.",
    d: "A soft georgette blouse with a slim neck tie to wear as a bow or loose. Tucks neatly into tailored trousers." },
  { t: "Hand-Embroidered Cotton Shirt", b: "kaari-studio", c: "women-tops", p: 3290, sizes: WX,
    colors: [["White", "#FAFAF7", ["1564257631407-4deb1f99d992"]]],
    tags: ["handcrafted", "summer"], fabric: "Handwoven cotton with hand embroidery.",
    fit: "Boxy and cropped. Wear open or knotted.",
    care: "Hand wash cold, inside out. Do not wring.",
    d: "Embroidered by hand with tiny wildflowers on handwoven cotton. Each piece takes an artisan around two days." },
  { t: "Linen Drawstring Trousers", b: "kaari-studio", c: "women-trousers", p: 2990, sizes: WX,
    colors: [["Olive", "#6B5E3C", ["1789110520148-bb52ba37759b"]], ["Mint", "#BFD8C9", ["1789110520410-4fce7246f844"]]],
    tags: ["linen", "summer"], fabric: "100% linen, garment washed.",
    fit: "High rise with a drawstring waist and cropped straight leg.",
    care: "Machine wash cold. Linen softens with every wash.",
    d: "Garment-washed linen trousers with a drawstring waist and deep pockets. The easiest thing to wear on a hot day." },
  { t: "Wide-Leg Pleated Trousers", b: "atelier-mira", c: "women-trousers", p: 3490, sizes: WX,
    colors: [["Sand", "#CDBA9A", ["1789110853687-71692f0e86be"]]],
    tags: ["workwear", "aw26"], fabric: "Crepe suiting with stretch.",
    fit: "High waist, double front pleats, full-length wide leg.",
    care: "Dry clean or hand wash cold.",
    d: "Pleated, wide and fluid. These high-waisted trousers make flat shoes look deliberate." },
  { t: "Satin Jogger Pants", b: "atelier-mira", c: "women-trousers", p: 2790, cmp: 3590, sizes: W,
    colors: [["Blush", "#E5B9A8", ["1594633312681-425c7b97ccd1"]]],
    tags: ["lounge"], fabric: "Satin-finish viscose.",
    fit: "Elasticated waist and cuffs. Relaxed through the leg.",
    care: "Machine wash cold, gentle cycle.",
    d: "Pull-on satin joggers with patch pockets. Dress them up with a blouse or down with a tee." },
  { t: "Crochet Knit Poncho", b: "northloom", c: "women-knitwear", p: 3990, sizes: ONE,
    colors: [["Cream", "#EFE6D2", ["1434389677669-e08b4cac3105"]]],
    tags: ["knitwear", "handcrafted"], fabric: "Hand-crocheted cotton.",
    fit: "One size, drapes to the hip with a fringed hem.",
    care: "Hand wash cold and dry flat.",
    d: "An open-stitch crochet poncho with a fringed hem, hand-made in cotton yarn." },
  { t: "Chunky Rib Sweater", b: "northloom", c: "women-knitwear", p: 5490, sizes: W, featured: true,
    colors: [["Ivory", "#EEE8DC", ["1574201635302-388dd92a4c3f"]], ["Oatmeal", "#D9CDB8", ["1588271968087-4c51abe05afc"]]],
    tags: ["knitwear", "aw26"], fabric: "Merino wool blend.",
    fit: "Oversized with dropped shoulders. Size down for a neater fit.",
    care: "Hand wash cold with wool wash. Dry flat.",
    d: "A thick rib knit in a merino blend with a high neck and long, slouchy sleeves." },
  { t: "Cable Knit Cardigan", b: "northloom", c: "women-knitwear", p: 5990, sizes: W,
    colors: [["Mauve", "#9C7F7A", ["1581497396202-5645e76a3a8e"]]],
    tags: ["knitwear", "aw26"], fabric: "Wool and alpaca blend.",
    fit: "Relaxed with a long body.",
    care: "Hand wash cold. Dry flat.",
    d: "Soft wool-alpaca cable knit with horn buttons. The cardigan you will keep reaching for." },
  { t: "Classic Cotton Trench Coat", b: "atelier-mira", c: "women-outerwear", p: 12990, sizes: W, featured: true,
    colors: [["Camel", "#B08D5F", ["1592327877233-90b9bfd92e48", "1589400445193-c881a4b0b38a"]], ["Taupe", "#7A6A5A", ["1676716105765-e19fe6a01851"]]],
    tags: ["aw26", "outerwear"], fabric: "Water-repellent cotton gabardine.",
    fit: "Double-breasted with a belted waist. Relaxed enough for knitwear underneath.",
    care: "Dry clean only.",
    d: "The trench, done properly: storm flap, epaulettes, a belt at the waist and cuffs, in water-repellent cotton gabardine." },
  { t: "Belted Wool Wrap Coat", b: "atelier-mira", c: "women-outerwear", p: 14490, sizes: W,
    colors: [["Caramel", "#B5835A", ["1550872199-63f4382fe925"]]],
    tags: ["aw26", "outerwear"], fabric: "Wool and recycled polyester blend.",
    fit: "Wrap front with a tie belt and wide lapels.",
    care: "Dry clean only.",
    d: "A soft, heavy wrap coat with no buttons to fuss with, only a wide tie belt." },
  // Men
  { t: "Washed Linen Shirt", b: "sable-row", c: "men-shirts", p: 3490, sizes: M, featured: true,
    colors: [["Navy", "#1F2A44", ["1740711152088-88a009e877bb"]], ["Sky", "#A9C6E3", ["1792007194806-72a27dd975b0"]]],
    tags: ["linen", "summer"], fabric: "100% European linen, garment washed.",
    fit: "Regular fit with a camp collar.",
    care: "Machine wash cold. Wear it creased.",
    d: "Garment-washed linen that feels broken-in from the first wear, with a relaxed camp collar and a single chest pocket." },
  { t: "Poplin Dress Shirt", b: "sable-row", c: "men-shirts", p: 2990, sizes: M,
    colors: [["White", "#FBFBF8", ["1598033129183-c4f50c736f10"]]],
    tags: ["workwear"], fabric: "Two-ply cotton poplin.",
    fit: "Slim fit with a cutaway collar.",
    care: "Machine wash warm. Iron while damp.",
    d: "A crisp two-ply poplin shirt with a cutaway collar and mitred cuffs. The one to wear with a tie." },
  { t: "Striped Cotton Shirt", b: "sable-row", c: "men-shirts", p: 2790, sizes: M,
    colors: [["Tobacco Stripe", "#7A5A3A", ["1791631064276-af27e842af6a"]]],
    tags: ["summer"], fabric: "Cotton seersucker.",
    fit: "Regular fit.",
    care: "Machine wash cold.",
    d: "Wide tobacco and ecru stripes on airy seersucker cotton that never looks ironed, and never needs to." },
  { t: "Oxford Button-Down Shirt", b: "sable-row", c: "men-shirts", p: 2690, cmp: 3290, sizes: M,
    colors: [["Grey", "#8B8F94", ["1602810318383-e386cc2a3ccf"]], ["White", "#F7F7F2", ["1602810318383-e386cc2a3ccf"]], ["Burgundy", "#6D1F2B", ["1602810318383-e386cc2a3ccf"]]],
    tags: ["workwear"], fabric: "Brushed cotton oxford.",
    fit: "Regular fit with a button-down collar.",
    care: "Machine wash warm.",
    d: "The oxford shirt every wardrobe is built on, in brushed cotton that softens with each wash." },
  { t: "Printed Chambray Shirt", b: "field-and-fold", c: "men-shirts", p: 2490, sizes: ["S", "M", "L", "XL"], status: "draft",
    colors: [["Chambray", "#5B7DA8", ["1596755094514-f87e34085b2c"]]],
    tags: ["summer", "print"], fabric: "Cotton chambray.",
    fit: "Relaxed fit.",
    care: "Machine wash cold.",
    d: "Lightweight chambray with a tiny scattered print. (Draft: not yet on the store.)" },
  { t: "Piped Jersey Tee", b: "field-and-fold", c: "men-tshirts", p: 1690, sizes: M,
    colors: [["Navy", "#1E2433", ["1622519407650-3df9883f76a5"]]],
    tags: ["essentials"], fabric: "Heavyweight cotton jersey.",
    fit: "Boxy fit with contrast piping.",
    care: "Machine wash cold.",
    d: "A heavyweight tee with contrast piping at the collar and sleeves, inspired by vintage sportswear." },
  { t: "Merino Crew Sweater", b: "northloom", c: "men-knitwear", p: 4990, sizes: M, featured: true,
    colors: [["Rust", "#8A4B2E", ["1773747310662-e7cc9e681226"]], ["Grey Melange", "#B7B5B1", ["1604573824419-289a9a10672c"]]],
    tags: ["knitwear", "aw26"], fabric: "Extra-fine merino wool.",
    fit: "Regular fit.",
    care: "Hand wash cold or machine wash on a wool cycle. Dry flat.",
    d: "Fine-gauge merino that layers under a jacket or wears alone. Breathable, warm and never itchy." },
  { t: "Straight-Leg Selvedge Jeans", b: "field-and-fold", c: "men-trousers", p: 3990, sizes: ["28", "30", "32", "34", "36"], guide: "trousers",
    colors: [["Indigo Rinse", "#1E2A3A", ["1624378439575-d8705ad7ae80"]]],
    tags: ["denim"], fabric: "13.5 oz Japanese selvedge denim.",
    fit: "Mid rise, straight leg. Will stretch slightly with wear.",
    care: "Wash rarely, inside out, cold.",
    d: "Rigid selvedge denim that fades to fit you. Straight through the leg with a mid rise." },
  { t: "Cotton Twill Joggers", b: "field-and-fold", c: "men-trousers", p: 2490, sizes: M,
    colors: [["Khaki", "#B8A07E", ["1473966968600-fa801b869a1a"]]],
    tags: ["essentials"], fabric: "Stretch cotton twill.",
    fit: "Tapered with elasticated cuffs.",
    care: "Machine wash cold.",
    d: "Chino fabric, jogger comfort. A tapered leg with a drawstring waist." },
  { t: "Denim Trucker Jacket", b: "field-and-fold", c: "men-outerwear", p: 4590, cmp: 5990, sizes: M,
    colors: [["Indigo", "#2B3A55", ["1611312449408-fcece27cdbb7"]]],
    tags: ["denim", "aw26"], fabric: "Rigid cotton denim with a corduroy collar.",
    fit: "Classic fit, hits at the hip.",
    care: "Machine wash cold, inside out.",
    d: "A trucker jacket in rigid denim with a corduroy collar and copper shank buttons." },
  { t: "Leather Biker Jacket", b: "sable-row", c: "men-outerwear", p: 18990, sizes: ["S", "M", "L", "XL"],
    colors: [["Black", "#121212", ["1551028719-00167b16eac5"]]],
    tags: ["aw26", "outerwear"], fabric: "Full-grain lambskin leather with a cotton lining.",
    fit: "Close fit. Size up to wear over knitwear.",
    care: "Specialist leather clean only.",
    d: "An asymmetric biker in supple lambskin with silver zips. It only gets better with age." },
  { t: "Satin Bomber Jacket", b: "field-and-fold", c: "men-outerwear", p: 4290, sizes: ["S", "M", "L", "XL"],
    colors: [["Copper", "#B0673F", ["1591047139829-d91aecb6caea"]]],
    tags: ["outerwear"], fabric: "Satin shell with a quilted lining.",
    fit: "Relaxed with ribbed cuffs and hem.",
    care: "Machine wash cold, gentle cycle.",
    d: "A lightweight bomber in a copper satin, with a utility sleeve pocket." },
  { t: "Single-Breasted Overcoat", b: "sable-row", c: "men-outerwear", p: 15990, sizes: ["S", "M", "L", "XL"], scheduled: true,
    colors: [["Camel", "#B4875A", ["1619603364904-c0498317e145"]]],
    tags: ["aw26", "outerwear"], fabric: "Wool and cashmere blend.",
    fit: "Regular fit, falls below the knee.",
    care: "Dry clean only.",
    d: "A camel overcoat in a wool-cashmere blend. (Scheduled: goes live a week after the seed runs.)" },
  { t: "Tailored Wool-Blend Blazer", b: "sable-row", c: "men-outerwear", p: 12490, sizes: ["38", "40", "42", "44"], guide: "blazer",
    colors: [["Navy", "#1D2B4A", ["1617137968427-85924c800a22"]]],
    tags: ["workwear", "occasion"], fabric: "Wool blend with a half canvas.",
    fit: "Tailored fit with natural shoulders.",
    care: "Dry clean only.",
    d: "A half-canvassed blazer with natural shoulders and patch pockets. Pairs with its own trousers or with denim." },
  // Unisex
  { t: "Organic Cotton Crew Tee", b: "field-and-fold", c: "unisex-essentials", p: 1290, sizes: ["XS", "S", "M", "L", "XL", "XXL"], featured: true,
    colors: [
      ["White", "#FAFAF8", ["1521572163474-6864f9cf17ab", "1562157873-818bc0726f68"]],
      ["Black", "#151515", ["1562157873-818bc0726f68"]],
      ["Navy", "#1F2A48", ["1562157873-818bc0726f68"]],
      ["Burgundy", "#6E1E2C", ["1562157873-818bc0726f68"]],
      ["Mustard", "#D9A62E", ["1562157873-818bc0726f68"]],
    ],
    tags: ["essentials", "organic"], fabric: "180 gsm organic cotton jersey, GOTS certified.",
    fit: "Regular fit for everyone. Size down for a closer fit.",
    care: "Machine wash cold. Tumble dry low.",
    d: "A mid-weight tee in organic cotton that holds its shape wash after wash. Designed to fit every body." },
  { t: "Heavyweight Cotton Sweatshirt", b: "field-and-fold", c: "unisex-essentials", p: 2690, sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [["Off-White", "#F2EFE8", ["1620799140408-edc6dcb6d633"]]],
    tags: ["essentials", "aw26"], fabric: "400 gsm brushed-back cotton fleece.",
    fit: "Relaxed fit with ribbed cuffs and hem.",
    care: "Machine wash cold, inside out.",
    d: "A thick, brushed-back sweatshirt with a relaxed shape. Gets softer every time you wash it." },
  // Accessories
  { t: "Everyday Leather Tote", b: "lumen-leather", c: "accessories-bags", p: 7490, sizes: ONE, featured: true,
    colors: [["Tan", "#A0632F", ["1624687943971-e86af76d57de", "1760624294504-211e763ee0fb"]]],
    tags: ["leather"], fabric: "Vegetable-tanned leather, unlined.",
    fit: "38 x 33 x 12 cm. Fits a 14-inch laptop.",
    care: "Wipe with a dry cloth. Condition twice a year.",
    d: "A roomy, unlined tote in vegetable-tanned leather that darkens to a rich patina. Inside zip pocket." },
  { t: "Tweed Weekender Tote", b: "lumen-leather", c: "accessories-bags", p: 8990, sizes: ONE,
    colors: [["Forest Tweed", "#4E5B3F", ["1774389080971-01bf5d938a92"]]],
    tags: ["leather", "aw26"], fabric: "Wool tweed with leather trims.",
    fit: "45 x 30 x 18 cm.",
    care: "Spot clean only.",
    d: "A structured weekender in wool tweed with green leather handles and trims." },
  { t: "Canvas Day Backpack", b: "field-and-fold", c: "accessories-bags", p: 3290, sizes: ONE,
    colors: [["Navy", "#1F2A44", ["1553062407-98eeb64c6a62"]]],
    tags: ["essentials"], fabric: "Waxed cotton canvas.",
    fit: "18 litres with a padded laptop sleeve.",
    care: "Spot clean. Re-wax yearly.",
    d: "A minimal daypack in water-resistant waxed canvas with a padded sleeve for a 15-inch laptop." },
  { t: "Woven Leather Belt", b: "lumen-leather", c: "accessories-belts", p: 1990, sizes: ["S", "M", "L"],
    colors: [["Tan", "#9A5B2E", ["1711443982852-b3df5c563448"]]],
    tags: ["leather"], fabric: "Hand-braided leather with a brass buckle.",
    fit: "3.5 cm wide.",
    care: "Wipe clean. Condition occasionally.",
    d: "Braided by hand from strips of soft leather, so it fastens at any point." },
  { t: "Classic Buckle Belt", b: "lumen-leather", c: "accessories-belts", p: 1790, sizes: ["S", "M", "L"],
    colors: [["Cognac", "#8B4A2B", ["1624222247344-550fb60583dc", "1705493655920-20c572928501"]]],
    tags: ["leather"], fabric: "Full-grain leather with a nickel-free buckle.",
    fit: "3 cm wide.",
    care: "Wipe clean. Condition occasionally.",
    d: "A full-grain leather belt with a polished square buckle. Smart enough for tailoring, easy with denim." },
  { t: "Gold Teardrop Earrings", b: "kaari-studio", c: "accessories-jewellery", p: 2490, sizes: ONE, returnable: false,
    colors: [["Gold", "#C9A646", ["1727990865600-91f8cb8b0168"]]],
    tags: ["jewellery"], fabric: "18k gold-plated brass. Nickel free.",
    fit: "2.5 cm drop, push-back fastening.",
    care: "Keep dry. Store in the pouch provided.",
    d: "Polished, puffed teardrops that catch the light. Earrings cannot be returned for hygiene reasons." },
  { t: "Filigree Stud Earrings", b: "kaari-studio", c: "accessories-jewellery", p: 1890, sizes: ONE, returnable: false,
    colors: [["Rose Gold", "#C99A84", ["1701777892740-88419a701472"]]],
    tags: ["jewellery"], fabric: "Rose gold-plated silver filigree.",
    fit: "1.5 cm, hook fastening.",
    care: "Polish gently with a soft cloth.",
    d: "Delicate filigree flowers worked by hand in fine silver wire. Earrings cannot be returned for hygiene reasons." },

  // ---- Added October 2026: more clothing, on models or as clean product shots. Stores set up
  // before these were added get them with `--pack` (see the end of this file).
  // Women
  { t: "Belted Linen Shirt Dress", b: "atelier-mira", c: "women-dresses", p: 3990, sizes: WX, featured: true,
    colors: [["Terracotta", "#C8573F", ["1789110853872-f416085557fa", "1789110853833-bc1a883da2d6"]]],
    tags: ["linen", "summer"], fabric: "Linen and cotton blend, garment washed.",
    fit: "Relaxed shirt-dress cut to the knee, with a removable tie belt. True to size.",
    care: "Machine wash cold. Iron while damp.",
    d: "A short-sleeved shirt dress in washed linen, with a camp collar, patch pockets and a tie belt that pulls it in at the waist." },
  { t: "Sage Cotton Sundress", b: "atelier-mira", c: "women-dresses", p: 2790, sizes: W,
    colors: [["Sage", "#A9BFAE", ["1789110519607-6176d668fb72"]]],
    tags: ["summer"], fabric: "100% cotton gauze.",
    fit: "Fine adjustable straps and a gathered waist. Falls to mid-calf.",
    care: "Machine wash cold on a gentle cycle. Line dry.",
    d: "A light cotton midi with thin straps and a softly gathered waist. The coolest dress you will own on a hot afternoon." },
  { t: "Rope-Belt Linen Dress", b: "kaari-studio", c: "women-dresses", p: 3290, sizes: WX,
    colors: [["Ivory", "#F3EEE2", ["1789110520302-3df8ce0410f0"]]],
    tags: ["linen", "summer", "handcrafted"], fabric: "Handwoven linen with a braided jute belt.",
    fit: "Boxy, with dropped cap sleeves. Above the knee.",
    care: "Hand wash cold. Dry in shade.",
    d: "Handwoven linen cut into an easy boxy shape with cap sleeves and a deep hem, finished with a braided jute rope belt." },
  { t: "Linen Shift Dress", b: "atelier-mira", c: "women-dresses", p: 3490, sizes: WX,
    colors: [["Oat", "#D8CBB3", ["1747396206869-75ea57b325ce"]]],
    tags: ["linen", "workwear"], fabric: "100% linen.",
    fit: "Straight and sleeveless, skimming the body. Knee length.",
    care: "Machine wash cold. Linen softens with every wash.",
    d: "A clean-lined sleeveless shift in oat linen, with a round neck and side pockets. Polished enough for the office, easy enough for the weekend." },
  { t: "Button-Front Puff-Sleeve Dress", b: "atelier-mira", c: "women-dresses", p: 3790, cmp: 4790, sizes: W,
    colors: [["Sky Blue", "#8DB4CF", ["1763604996066-73160867c1fc", "1763604996042-d5ac7b72ead4"]]],
    tags: ["summer"], fabric: "Cotton chambray.",
    fit: "Fitted bodice, off-shoulder puff sleeves and a ruffled hem. Mini length.",
    care: "Machine wash cold. Warm iron.",
    d: "A sky blue mini with a buttoned front, puffed off-shoulder sleeves and a ruffled hem that swings when you walk." },
  { t: "Wildflower Tiered Midi Dress", b: "atelier-mira", c: "women-dresses", p: 4490, sizes: W,
    colors: [["Wildflower", "#E9C6C0", ["1762154057377-cc9d3dd6900c"]]],
    tags: ["summer", "print"], fabric: "Printed cotton voile, lined.",
    fit: "Strappy fitted bodice and a full tiered skirt.",
    care: "Machine wash cold on a gentle cycle.",
    d: "A tiered midi printed with a meadow of wildflowers, with a fitted strappy bodice and a skirt full enough to twirl in." },
  { t: "Tiered Cotton Maxi Dress", b: "atelier-mira", c: "women-dresses", p: 5490, sizes: W, featured: true,
    colors: [["White", "#F7F5F0", ["1613966570650-add3cf83aa83"]]],
    tags: ["resort", "summer"], fabric: "Crinkled cotton.",
    fit: "Halter neck, open back and a floor-length tiered skirt.",
    care: "Hand wash cold. No need to iron the crinkle.",
    d: "A white maxi in crinkled cotton with a halter neck, an open back and three tiers that billow in the breeze. Made for holidays." },
  { t: "Red Floral Sundress", b: "field-and-fold", c: "women-dresses", p: 2490, sizes: WX,
    colors: [["Red Floral", "#C9302C", ["1542295669297-4d352b042bca"]]],
    tags: ["summer", "print"], fabric: "Viscose crepe.",
    fit: "V-neck with wide straps. Above the knee, relaxed through the body.",
    care: "Machine wash cold. Cool iron.",
    d: "A cheerful red sundress scattered with small white flowers, with a V-neck and wide straps. Throw it on and go." },
  { t: "One-Shoulder Puff-Sleeve Dress", b: "atelier-mira", c: "women-dresses", p: 3990, sizes: W,
    colors: [["Powder Blue", "#A9C8E8", ["1700064990923-b1af57cf58db"]]],
    tags: ["occasion", "summer"], fabric: "Satin-back crepe.",
    fit: "One puffed sleeve, a draped bodice and a flared skirt above the knee.",
    care: "Hand wash cold or dry clean.",
    d: "A powder blue party dress with a single puffed sleeve and a softly draped bodice. Sandals by day, heels in the evening." },
  { t: "Glen Check Double-Breasted Blazer", b: "atelier-mira", c: "women-outerwear", p: 6990, sizes: W,
    colors: [["Grey Check", "#9A9A9A", ["1608234808654-2a8875faa7fd"]]],
    tags: ["workwear", "aw26"], fabric: "Wool-blend Prince of Wales check, fully lined.",
    fit: "Relaxed double-breasted cut with soft shoulder pads. Hits at the hip.",
    care: "Dry clean only.",
    d: "A double-breasted blazer in grey glen check, cut a little oversized to wear over a shirt, a knit or a slip dress." },
  { t: "Pinstripe Tailored Blazer", b: "atelier-mira", c: "women-outerwear", p: 6490, sizes: W,
    colors: [["Black Pinstripe", "#1B1B1F", ["1604914509335-9001944f23d5"]]],
    tags: ["workwear", "aw26"], fabric: "Stretch wool-blend suiting with a chalk pinstripe.",
    fit: "Single-breasted and nipped at the waist.",
    care: "Dry clean only.",
    d: "A sharp single-button blazer in black chalk-stripe suiting, nipped at the waist for a long, lean line." },
  { t: "Scarlet Tailored Blazer", b: "atelier-mira", c: "women-outerwear", p: 5990, sizes: W,
    colors: [["Scarlet", "#C8102E", ["1521510895919-46920266ddb3"]]],
    tags: ["workwear"], fabric: "Crepe suiting, half lined.",
    fit: "Relaxed single-breasted cut, made to be worn open.",
    care: "Dry clean only.",
    d: "A scarlet blazer that does the work of a whole outfit. Over black for the office, over a tee and jeans at the weekend." },
  { t: "Forest Cable-Knit Jumper", b: "northloom", c: "women-knitwear", p: 4990, sizes: W,
    colors: [["Forest", "#2F5D50", ["1580331451062-99ff652288d7"]]],
    tags: ["knitwear", "aw26"], fabric: "Merino and cotton blend.",
    fit: "Oversized and long, with dropped shoulders.",
    care: "Hand wash cold. Dry flat.",
    d: "A long cable-knit jumper in deep forest green, generous enough to pull over shirts and wear with leggings." },
  { t: "Cream Fisherman Cardigan", b: "northloom", c: "women-knitwear", p: 5290, sizes: W,
    colors: [["Cream", "#EFE7DA", ["1629580626780-7fe7fb0523e9"]]],
    tags: ["knitwear", "aw26"], fabric: "Chunky wool blend.",
    fit: "Relaxed, with dropped shoulders and a deep V.",
    care: "Hand wash cold with wool wash. Dry flat.",
    d: "A chunky fisherman-rib cardigan in undyed cream, with dropped shoulders and big, slouchy sleeves." },
  { t: "Open-Knit Cotton Sweater", b: "northloom", c: "women-knitwear", p: 3990, sizes: W,
    colors: [["Chalk", "#EDEAE3", ["1587999882859-34b3f313df77"]]],
    tags: ["knitwear", "summer"], fabric: "100% cotton in an open stitch.",
    fit: "Relaxed, with a slouchy funnel neck.",
    care: "Hand wash cold. Dry flat.",
    d: "An airy open-stitch sweater in chalk-white cotton, light enough for cool evenings by the sea." },
  { t: "High-Rise Wide-Leg Jeans", b: "field-and-fold", c: "women-trousers", guide: "trousers", p: 3290, sizes: ["26", "28", "30", "32", "34"],
    colors: [["Light Wash", "#9DB6CC", ["1598554747436-c9293d6a588f"]]],
    tags: ["denim"], fabric: "100% cotton rigid denim.",
    fit: "High rise, with a full-length wide leg.",
    care: "Machine wash cold, inside out.",
    d: "Wide-leg jeans in a light vintage wash, cut high on the waist and long in the leg. Best with a tucked-in tee." },
  // Men
  { t: "Wide-Stripe Cotton Shirt", b: "sable-row", c: "men-shirts", p: 2990, sizes: M,
    colors: [["Rust Stripe", "#A86452", ["1791631064425-0e7e04aa9a95", "1791631064348-0337580f80d1"]]],
    tags: ["summer"], fabric: "Cotton and linen blend.",
    fit: "Regular fit with a chest pocket.",
    care: "Machine wash cold. Warm iron.",
    d: "A relaxed shirt in a bold rust and cream stripe, in a cotton-linen blend that only gets softer. Wear it buttoned, or open over a tee." },
  { t: "Band-Collar Linen Shirt", b: "sable-row", c: "men-shirts", p: 2790, sizes: M,
    colors: [["Ecru", "#E8E1D3", ["1627686011747-74adda3d2343"]]],
    tags: ["linen", "summer"], fabric: "100% European linen.",
    fit: "Regular fit with a band collar.",
    care: "Machine wash cold. Iron while damp.",
    d: "A linen shirt in ecru with a neat band collar. Works with chinos, denim or a dhoti alike." },
  { t: "Indigo Linen Shirt", b: "sable-row", c: "men-shirts", p: 2890, sizes: M,
    colors: [["Indigo", "#2E4A72", ["1740711152088-88a009e877bb"]]],
    tags: ["linen"], fabric: "Garment-dyed linen.",
    fit: "Relaxed fit with a soft collar. Made to be worn with the sleeves rolled.",
    care: "Machine wash cold. The colour softens with washing.",
    d: "A garment-dyed linen shirt in deep indigo that fades beautifully with every wash." },
  { t: "Linen Popover Shirt", b: "field-and-fold", c: "men-shirts", p: 2490, sizes: M,
    colors: [["White", "#F5F2EA", ["1713881587420-113c1c43e28a"]]],
    tags: ["linen", "summer"], fabric: "Washed linen.",
    fit: "Relaxed and short-sleeved, with a three-button placket.",
    care: "Machine wash cold.",
    d: "A short-sleeved linen popover with a grandad collar and a three-button placket. Summer in a shirt." },
  { t: "Short-Sleeve Chambray Shirt", b: "field-and-fold", c: "men-shirts", p: 2390, sizes: M,
    colors: [["Chambray", "#9FB0C2", ["1713881842156-3d9ef36418cc"]]],
    tags: ["linen", "summer"], fabric: "Linen and cotton chambray.",
    fit: "Regular fit with a band collar.",
    care: "Machine wash cold.",
    d: "A soft chambray shirt with short sleeves and a band collar, in a breezy linen-cotton weave." },
  { t: "Heavyweight Crew-Neck Tee", b: "field-and-fold", c: "men-tshirts", p: 1490, sizes: M,
    colors: [["White", "#FAFAFA", ["1592994238317-fcf75c5466fd", "1778671394516-8270eac13c42"]]],
    tags: ["essentials"], fabric: "240 gsm combed cotton.",
    fit: "Regular fit, with a firm ribbed neck that holds its shape.",
    care: "Machine wash cold. Tumble dry low.",
    d: "The white tee, made heavier: 240 gsm combed cotton with a firm rib collar, so it stays crisp wash after wash." },
  { t: "Tipped Knit Polo", b: "sable-row", c: "men-tshirts", p: 2190, sizes: M,
    colors: [["Black", "#151515", ["1744551358258-5a5b9b268eca"]]],
    tags: ["workwear"], fabric: "Cotton piqué with tipped collar and cuffs.",
    fit: "Slim fit.",
    care: "Machine wash cold.",
    d: "A black piqué polo with fine contrast tipping at the collar and cuffs. Smart enough for dinner, easy enough for every day." },
  { t: "Navy Slim-Fit Suit", b: "sable-row", c: "men-outerwear", guide: "blazer", p: 18900, sizes: ["38", "40", "42", "44"], featured: true,
    colors: [["Navy", "#1F2D52", ["1617137984095-74e4e5e3613f"]]],
    tags: ["occasion", "workwear"], fabric: "Wool blend, half canvassed.",
    fit: "Slim two-piece: a single-breasted jacket and flat-front trousers.",
    care: "Dry clean only.",
    d: "A two-piece suit in deep navy with a notch lapel and slim flat-front trousers. The suit for interviews, weddings and everything in between." },
  { t: "Black Two-Piece Suit", b: "sable-row", c: "men-outerwear", guide: "blazer", p: 17900, sizes: ["38", "40", "42", "44"],
    colors: [["Black", "#141414", ["1618886614638-80e3c103d31a"]]],
    tags: ["occasion"], fabric: "Stretch wool blend.",
    fit: "Slim fit with tapered trousers.",
    care: "Dry clean only.",
    d: "An all-black suit with a slim jacket and tapered trousers. With a black shirt for evenings, or a white one for formal days." },
  { t: "Pinstripe Double-Breasted Blazer", b: "sable-row", c: "men-outerwear", guide: "blazer", p: 11900, sizes: ["38", "40", "42", "44"],
    colors: [["Dove Grey", "#BDBFC2", ["1480429370139-e0132c086e2a"]]],
    tags: ["occasion", "aw26"], fabric: "Wool and linen blend with a fine pinstripe.",
    fit: "Double-breasted, with peak lapels and a structured shoulder.",
    care: "Dry clean only.",
    d: "A dove grey double-breasted blazer with a fine pinstripe and peak lapels. Add a pocket square and you're done." },
  { t: "Charcoal Brushed Blazer", b: "sable-row", c: "men-outerwear", guide: "blazer", p: 9900, sizes: ["38", "40", "42", "44"],
    colors: [["Charcoal", "#4F555B", ["1622497170185-5d668f816a56"]]],
    tags: ["workwear", "aw26"], fabric: "Brushed wool blend.",
    fit: "Tailored fit with natural shoulders.",
    care: "Dry clean only.",
    d: "A charcoal blazer in a soft brushed wool blend, cut close with natural shoulders. As good with denim as with trousers." },
  { t: "Tapered Stretch Jeans", b: "field-and-fold", c: "men-trousers", p: 3490, sizes: ["28", "30", "32", "34", "36"],
    colors: [["Dark Rinse", "#2E3F5C", ["1714143164072-7646ef5cb24d"]], ["Mid Wash", "#4A6A96", ["1714143136372-ddaf8b606da7"]]],
    tags: ["denim"], fabric: "12 oz stretch denim.",
    fit: "Mid rise, slim through the thigh and tapered to the ankle.",
    care: "Wash rarely, cold and inside out.",
    d: "Jeans in comfortable stretch denim, slim through the thigh and tapered to the ankle. Turn up the hem for a neat finish." },
  // Unisex
  { t: "Oversized Fleece Hoodie", b: "field-and-fold", c: "unisex-essentials", p: 2990, sizes: WX,
    colors: [["Cloud Grey", "#E4E4E2", ["1688111421205-a0a85415b224"]]],
    tags: ["essentials", "aw26"], fabric: "380 gsm brushed-back cotton fleece.",
    fit: "Oversized with dropped shoulders. Size down for a regular fit.",
    care: "Machine wash cold. Tumble dry low.",
    d: "A heavyweight oversized hoodie in brushed cotton fleece, with a double-layer hood and a kangaroo pocket." },
  { t: "Garment-Dyed Hoodie", b: "field-and-fold", c: "unisex-essentials", p: 2790, sizes: WX,
    colors: [["Mocha", "#7C6A5E", ["1611817757591-c3f345024273"]]],
    tags: ["essentials", "aw26"], fabric: "Organic cotton fleece, garment dyed.",
    fit: "Regular fit with a drawstring hood.",
    care: "Machine wash cold. The colour softens with every wash.",
    d: "A garment-dyed hoodie in warm mocha brown that softens and fades a little more with every wash." },
  // Gen Z: Y2K, streetwear and vintage prep
  { t: "Ribbed Asymmetric Crop Top", b: "glitch-garden", c: "women-tops", p: 1299, sizes: W,
    colors: [["White", "#F4F2EE", ["1784979195655-b0563683a389", "1785273751508-ec5ab6b61270"]]],
    tags: ["y2k", "going-out"], fabric: "Stretch cotton rib.",
    fit: "Fitted and cropped, with a sculpted asymmetric hem. True to size.",
    care: "Machine wash cold. Dry flat.",
    d: "A fitted crop top in stretch rib with a scoop neck and a sharp, asymmetric hem. Made for high-rise jeans and low-rise everything." },
  { t: "Long-Sleeve Scoop Crop Top", b: "glitch-garden", c: "women-tops", p: 1199, sizes: W,
    colors: [["Cream", "#EFE8DC", ["1673925205809-601b5a22eb61", "1673999707565-8bb553c9765b"]]],
    tags: ["y2k", "essentials"], fabric: "Soft cotton-modal jersey.",
    fit: "Slim and cropped above the navel, with long sleeves.",
    care: "Machine wash cold. Dry flat.",
    d: "A soft long-sleeve crop top with a wide scoop neck. The layer under every jacket and over anything high-waisted." },
  { t: "White Bustier Corset Top", b: "glitch-garden", c: "women-tops", p: 1999, sizes: W, featured: true,
    colors: [["White", "#F7F5F0", ["1790283727726-f8ba027df653", "1790283727727-8f7497a96610"]]],
    tags: ["y2k", "going-out", "corset"], fabric: "Cotton twill with flexible boning and a zip at the back.",
    fit: "Structured bustier with a sweetheart neckline. Size up if you're between sizes.",
    care: "Hand wash cold. Do not tumble dry.",
    d: "A structured bustier in crisp white with seamed cups, flexible boning and a pointed hem. Baggy denim by day, a satin skirt at night." },
  { t: "Lace-Up Corset Top", b: "glitch-garden", c: "women-tops", p: 1799, sizes: W,
    colors: [["Black", "#141414", ["1790069484700-2dde2cf6c854"]]],
    tags: ["going-out", "corset"], fabric: "Cotton blend with a lace-up front.",
    fit: "Fitted through the waist, with short puff sleeves. Adjust the fit with the front lacing.",
    care: "Hand wash cold.",
    d: "A black corset top with a lace-up front, a square neck and short puffed sleeves. A little gothic, very wearable." },
  { t: "Faux Leather Corset Top", b: "glitch-garden", c: "women-tops", p: 2299, sizes: W,
    colors: [["Olive", "#5E604A", ["1768745534287-0e41db00cfaf", "1768745534147-dc039e89074f"]]],
    tags: ["y2k", "going-out", "corset"], fabric: "Faux leather with a soft jersey lining.",
    fit: "Strapless and fitted, with flexible boning.",
    care: "Wipe clean with a damp cloth.",
    d: "A strapless corset in soft olive faux leather, cut straight across the bust and close through the waist. Wear it with low-slung baggy jeans." },
  { t: "Denim Mini Skirt", b: "glitch-garden", c: "women-skirts", p: 1599, sizes: W,
    colors: [["Mid Wash", "#6F8FB5", ["1777979156072-71dc4a0f2877"]]],
    tags: ["y2k", "denim"], fabric: "100% cotton denim.",
    fit: "Mid-rise A-line mini with a raw hem.",
    care: "Machine wash cold, inside out.",
    d: "A mid-wash denim mini with a slight A-line and a frayed raw hem. The skirt that goes with every tee you own." },
  { t: "Button-Front White Denim Skirt", b: "glitch-garden", c: "women-skirts", p: 1699, sizes: W,
    colors: [["White", "#F5F4F0", ["1789110519765-58b53b0b05d7"]]],
    tags: ["y2k", "denim", "summer"], fabric: "Cotton denim.",
    fit: "High-rise mini with a buttoned front.",
    care: "Machine wash cold, separately at first.",
    d: "A white denim mini with a full button front. Crisp with a baby tee, softer with a knit." },
  { t: "Ombre Denim Maxi Skirt", b: "low-orbit", c: "women-skirts", p: 2199, sizes: W,
    colors: [["Ombre Wash", "#7E9CB8", ["1778395407599-a35d673b4568"]]],
    tags: ["denim", "streetwear"], fabric: "100% cotton denim with an ombre wash.",
    fit: "High-rise and straight to the ankle.",
    care: "Machine wash cold, inside out.",
    d: "An ankle-length denim skirt washed from dark to light and cut straight down. Sneakers, a cardigan, done." },
  { t: "Pleated Chiffon Midi Skirt", b: "glitch-garden", c: "women-skirts", p: 1899, sizes: W,
    colors: [["Ivory", "#F2EEE6", ["1762342676177-33b08c2b724e", "1762343036425-f20316fd98ed"]]],
    tags: ["prep", "summer"], fabric: "Recycled chiffon, lined.",
    fit: "Elasticated high waist; falls to mid-calf.",
    care: "Hand wash cold. Hang to dry.",
    d: "A sunray-pleated midi in airy ivory chiffon that moves with every step. Tuck in a fitted top or a cropped knit." },
  { t: "Low-Rise Baggy Jeans", b: "glitch-garden", c: "women-trousers", guide: "trousers", p: 2499, sizes: ["24", "26", "28", "30", "32"],
    colors: [["Mid Wash", "#5C7FA8", ["1762164130276-021d7c91cd89"]]],
    tags: ["y2k", "denim", "streetwear"], fabric: "Rigid 13 oz cotton denim.",
    fit: "Low rise, loose through the hip and thigh, pooling at the ankle.",
    care: "Machine wash cold, inside out.",
    d: "Low-slung baggy jeans in mid-wash rigid denim, loose all the way down and long enough to stack over sneakers." },
  { t: "Ripped Wide-Leg Jeans", b: "low-orbit", c: "women-trousers", guide: "trousers", p: 2299, sizes: ["24", "26", "28", "30", "32"],
    colors: [["Light Wash", "#A9C1DA", ["1683126257977-5142e52acc7e"]]],
    tags: ["denim", "streetwear"], fabric: "Light-wash cotton denim with distressed knees.",
    fit: "High rise with a full wide leg.",
    care: "Machine wash cold, inside out.",
    d: "Light-wash wide-leg jeans with ripped knees and a high waist. Worn in from day one." },
  { t: "Parachute Cargo Pants", b: "low-orbit", c: "women-trousers", p: 2199, sizes: W, featured: true,
    colors: [["Tan", "#C17A3A", ["1780566759823-6ab515d86760"]]],
    tags: ["streetwear", "cargo"], fabric: "Lightweight nylon-cotton blend.",
    fit: "Relaxed and wide, with a drawstring waist and big cargo pockets.",
    care: "Machine wash cold.",
    d: "Wide, swishy cargo pants in a tan nylon blend with oversized flap pockets and a drawstring waist." },
  { t: "Lavender Cargo Joggers", b: "low-orbit", c: "women-trousers", p: 1799, sizes: W,
    colors: [["Lavender", "#B9AED6", ["1789110520465-efc5ff05c95e"]]],
    tags: ["streetwear", "cargo", "athleisure"], fabric: "Cotton twill with a little stretch.",
    fit: "Relaxed, with cuffed ankles and a drawstring waist.",
    care: "Machine wash cold.",
    d: "Cargo joggers in soft lavender twill with side pockets, cuffed ankles and a drawstring waist. Sneakers mandatory." },
  { t: "Cut-Out Halter Dress", b: "glitch-garden", c: "women-dresses", p: 2799, sizes: W, featured: true,
    colors: [["Black", "#141414", ["1779400203195-8906eec4b645", "1779400203878-f0d86096dde6"]]],
    tags: ["going-out", "occasion"], fabric: "Stretch jersey, fully lined.",
    fit: "Halter neck with a deep V and a cut-out at the waist. Close-fitting.",
    care: "Hand wash cold.",
    d: "A black halter dress with a plunging neckline and a sculpted cut-out at the waist. For nights that need one great dress." },
  { t: "Off-Shoulder Mini Dress", b: "glitch-garden", c: "women-dresses", p: 2299, sizes: W,
    colors: [["Cherry", "#E5383B", ["1779153617516-5bc9c25fc3b7"]]],
    tags: ["going-out", "y2k"], fabric: "Ribbed stretch knit.",
    fit: "Off the shoulder with long sleeves; close-fitting mini length.",
    care: "Machine wash cold on a gentle cycle.",
    d: "A cherry-red ribbed mini with an off-shoulder neckline and long sleeves. Bold colour, easy fit." },
  { t: "Cropped Track Hoodie", b: "low-orbit", c: "women-tops", p: 1899, sizes: W,
    colors: [["Black", "#151515", ["1791824620103-e31080cb52a9", "1791824620245-3cfb284d4b01"]]],
    tags: ["athleisure", "streetwear"], fabric: "Cotton-blend fleece with contrast piping.",
    fit: "Boxy and cropped, with a drawstring hood.",
    care: "Machine wash cold.",
    d: "A boxy cropped hoodie in black fleece with white piping down the sleeves. Gym, café, airport." },
  { t: "Forest Varsity Jacket", b: "low-orbit", c: "women-outerwear", p: 3999, sizes: W, featured: true,
    colors: [["Forest", "#1F4D3A", ["1682354163828-d1d56c380431"]]],
    tags: ["prep", "streetwear", "aw26"], fabric: "Wool-blend body with faux leather sleeves and a chenille letter.",
    fit: "Relaxed and boxy, with ribbed collar, cuffs and hem.",
    care: "Dry clean only.",
    d: "A forest-green varsity jacket with cream sleeves, striped ribbing and a chenille letter. Throw it over a crop top and wide jeans." },
  { t: "Cropped Moto Jacket", b: "glitch-garden", c: "women-outerwear", p: 4499, sizes: W, featured: true,
    colors: [["Black", "#121212", ["1594803617043-2a5a0829fcd9"]]],
    tags: ["y2k", "streetwear", "aw26"], fabric: "Faux leather with a satin lining.",
    fit: "Cropped at the waist, with an asymmetric zip and wide lapels.",
    care: "Wipe clean. Do not wash.",
    d: "A cropped biker jacket in soft black faux leather with an asymmetric zip and silver hardware. Goes with absolutely everything." },
  { t: "Cropped Puffer Jacket", b: "glitch-garden", c: "women-outerwear", p: 3499, sizes: W, featured: true,
    colors: [["Sunshine", "#F5C518", ["1548624313-0396c75e4b1a"]]],
    tags: ["y2k", "aw26"], fabric: "Water-repellent nylon with recycled polyester fill.",
    fit: "Cropped and puffy, with a high collar.",
    care: "Machine wash cold on a gentle cycle. Tumble dry low.",
    d: "A glossy cropped puffer in sunshine yellow with a high funnel collar. An instant mood lift on cold mornings." },
  { t: "Oversized Puffer Jacket", b: "low-orbit", c: "women-outerwear", p: 4299, sizes: W,
    colors: [["Ecru", "#EAE6DA", ["1678884399113-0a2b079a31f5"]]],
    tags: ["aw26", "streetwear"], fabric: "Matte nylon shell with recycled polyester fill.",
    fit: "Oversized and hip length, with a tall stand collar.",
    care: "Machine wash cold. Tumble dry low.",
    d: "An oversized puffer in soft ecru, hip length, with a tall stand collar you can hide in." },
  { t: "Washed Oversized Tee", b: "low-orbit", c: "unisex-essentials", p: 1299, sizes: WX, featured: true,
    colors: [["Washed Charcoal", "#5A5650", ["1780566759964-e101fe4a3d8c", "1780566759827-b3314b9fc55e"]]],
    tags: ["streetwear", "essentials"], fabric: "240 gsm cotton, garment washed.",
    fit: "Oversized, with dropped shoulders and a boxy body.",
    care: "Machine wash cold, inside out.",
    d: "A heavyweight tee washed to a faded, lived-in charcoal. Dropped shoulders, boxy body: wear it big." },
  { t: "Boxy White Tee", b: "low-orbit", c: "unisex-essentials", p: 999, sizes: WX,
    colors: [["White", "#FAFAF8", ["1789110520587-73ddefb5941d"]]],
    tags: ["essentials", "streetwear"], fabric: "220 gsm combed cotton.",
    fit: "Boxy, with sleeves that fall to the elbow.",
    care: "Machine wash cold.",
    d: "A clean white tee cut boxy and wide, with elbow-length sleeves. The base layer for every fit." },
  { t: "Tie-Dye Oversized Tee", b: "low-orbit", c: "unisex-essentials", p: 1399, sizes: WX,
    colors: [["Black Tie-Dye", "#3B3B3B", ["1780565595413-16c7bc95af74"]]],
    tags: ["streetwear", "y2k"], fabric: "Cotton jersey, hand dyed, so every one is different.",
    fit: "Oversized, with dropped shoulders.",
    care: "Wash cold with darks.",
    d: "An oversized tee hand-dyed in black and white, so no two come out the same." },
  { t: "Retro Track Jacket", b: "low-orbit", c: "unisex-essentials", p: 2499, sizes: WX,
    colors: [["Cobalt", "#4E5BB8", ["1768983953826-231e8ef0b6dc"]]],
    tags: ["athleisure", "streetwear", "y2k"], fabric: "Recycled polyester tricot.",
    fit: "Relaxed, with a stand collar and a full zip.",
    care: "Machine wash cold.",
    d: "A retro track jacket in glossy cobalt tricot with red stripes down the sleeves. Zipped up or worn open over a tee." },
  { t: "Utility Cargo Pants", b: "low-orbit", c: "men-trousers", guide: "trousers", p: 2299, sizes: ["28", "30", "32", "34", "36"],
    colors: [["Olive", "#6B6B4B", ["1793443696280-029ed5e7fe99"]]],
    tags: ["streetwear", "cargo"], fabric: "Cotton ripstop.",
    fit: "Straight and relaxed, with bellows pockets on both legs.",
    care: "Machine wash cold.",
    d: "Olive ripstop cargos with deep bellows pockets and a straight, relaxed leg. Built to be worn every day." },
  { t: "Long Baggy Jorts", b: "low-orbit", c: "men-trousers", guide: "trousers", p: 1799, sizes: ["28", "30", "32", "34", "36"],
    colors: [["Light Wash", "#9DB3CC", ["1788035839158-44d85a6e8083"]]],
    tags: ["streetwear", "denim", "summer"], fabric: "Rigid cotton denim.",
    fit: "Baggy, falling just below the knee.",
    care: "Machine wash cold, inside out.",
    d: "Baggy denim shorts in a light wash, long enough to hit below the knee. Jorts, done right." },
  { t: "Maroon Varsity Jacket", b: "low-orbit", c: "men-outerwear", p: 3999, sizes: M,
    colors: [["Maroon", "#6E1F2B", ["1771165553549-336443ce93c8"]]],
    tags: ["prep", "streetwear", "aw26"], fabric: "Wool-blend body with faux leather sleeves and a chenille letter.",
    fit: "Regular fit, with ribbed collar, cuffs and hem.",
    care: "Dry clean only.",
    d: "A classic varsity jacket in maroon wool with cream sleeves, striped ribbing and a chenille letter on the chest." },
  { t: "Argyle Sweater Vest", b: "low-orbit", c: "men-knitwear", p: 1999, sizes: M,
    colors: [["Blush Argyle", "#D8C2C0", ["1784816836054-0e026c6d8c2b", "1784816836059-86bff419a8f8"]]],
    tags: ["prep", "knitwear"], fabric: "Soft wool-blend knit.",
    fit: "Relaxed V-neck vest, hip length.",
    care: "Hand wash cold. Dry flat.",
    d: "A V-neck sweater vest knitted in a blush, cocoa and white argyle. Over a white shirt for full vintage prep." },
  { t: "Plaid Flannel Overshirt", b: "low-orbit", c: "men-shirts", p: 1999, sizes: M,
    colors: [["Rust Plaid", "#7A3B2E", ["1760124128502-66d9ceaa418b"]], ["Grey Plaid", "#9A9A98", ["1782226728289-f81457b760f5"]]],
    tags: ["streetwear", "aw26"], fabric: "Brushed cotton flannel.",
    fit: "Relaxed overshirt with a button front and a chest pocket.",
    care: "Machine wash cold.",
    d: "A brushed flannel overshirt in a soft plaid, roomy enough to layer over a hoodie. In two colourways." },
  { t: "Mini Barrel Bag", b: "lumen-leather", c: "accessories-bags", p: 2499, sizes: ONE,
    colors: [["Biscuit", "#D9B48F", ["1786872814428-1f0d8d685217"]]],
    tags: ["y2k"], fabric: "Smooth leather with an adjustable strap.",
    fit: "20 × 11 × 11 cm. Fits a phone, a cardholder and keys.",
    care: "Wipe with a dry cloth. Condition now and then.",
    d: "A small barrel bag in biscuit leather on a long adjustable strap. Wear it on the shoulder or across the body." },
  { t: "White Mini Crossbody", b: "lumen-leather", c: "accessories-bags", p: 1999, sizes: ONE,
    colors: [["White", "#F3F2EF", ["1604176424472-17cd740f74e9"]]],
    tags: ["y2k", "essentials"], fabric: "Smooth leather with silver buckles.",
    fit: "18 × 14 cm, with an adjustable strap.",
    care: "Wipe clean with a damp cloth.",
    d: "A minimal white crossbody with buckled straps and a flap front. Hands-free, all day." },
];
/** The first of the newest products, which `--pack` adds to a store that already has the others. */
const FIRST_ADDED = "Ribbed Asymmetric Crop Top";

const collections = [
  { slug: "y2k-revival", title: "Y2K Revival", kind: "automated", featured: true, sort: 1,
    rules: { match: "all", conditions: [{ field: "tag", op: "equals", value: "y2k" }] },
    banner: img("1790283727726-f8ba027df653", "16:9", "faces"), image: tall("1790283727726-f8ba027df653"),
    description: "Corsets, low-rise denim, minis and cropped jackets: the early 2000s, worn now." },
  { slug: "streetwear-staples", title: "Streetwear Staples", kind: "automated", featured: true, sort: 2,
    rules: { match: "all", conditions: [{ field: "tag", op: "equals", value: "streetwear" }] },
    banner: img("1780566759823-6ab515d86760", "16:9", "faces"), image: tall("1780566759823-6ab515d86760"),
    description: "Baggy denim, cargos, boxy tees and track jackets for every day." },
  { slug: "vintage-prep", title: "Vintage Prep", kind: "automated", featured: true, sort: 3,
    rules: { match: "all", conditions: [{ field: "tag", op: "equals", value: "prep" }] },
    banner: img("1784816836054-0e026c6d8c2b", "16:9", "faces"), image: tall("1682354163828-d1d56c380431"),
    description: "Varsity jackets, argyle and pleats: prep school, remixed." },
  { slug: "autumn-winter-26", title: "Autumn / Winter '26", kind: "automated", seasonal: true, season: "Autumn/Winter 2026", featured: true, sort: 4,
    rules: { match: "all", conditions: [{ field: "tag", op: "equals", value: "aw26" }] },
    banner: wide("1617733401065-c7bdf0b33417"), image: tall("1617733401065-c7bdf0b33417"),
    description: "Trench coats, merino and heavy rib knits in a palette of camel, rust and oat. Layers for the cooler months." },
  { slug: "the-occasion-edit", title: "The Occasion Edit", kind: "manual", featured: true, sort: 5,
    products: ["Cut-Out Halter Dress", "Bias-Cut Satin Slip Dress", "Off-Shoulder Mini Dress", "Liquid Satin Maxi Dress", "Pleated Georgette Gown", "Puff-Sleeve Tiered Dress", "Tailored Wool-Blend Blazer", "Gold Teardrop Earrings"],
    banner: wide("1790802243983-e6de0e275f59"), image: tall("1790802243983-e6de0e275f59"),
    description: "Satin, cut-outs and sharp tailoring for weddings, parties and nights out." },
  { slug: "linen-and-light", title: "Linen & Light", kind: "automated", seasonal: true, season: "Summer", sort: 6,
    rules: { match: "any", conditions: [{ field: "tag", op: "equals", value: "linen" }, { field: "tag", op: "equals", value: "summer" }] },
    banner: wide("1792007194806-72a27dd975b0"), image: tall("1792007194806-72a27dd975b0"),
    description: "Garment-washed linen, voile and seersucker. Breathable pieces for hot days." },
  { slug: "handcrafted-in-india", title: "Handcrafted in India", kind: "automated", featured: true, sort: 7,
    rules: { match: "all", conditions: [{ field: "tag", op: "equals", value: "handcrafted" }] },
    banner: wide("1761369332487-777e59fa4bcf"), image: tall("1761369332487-777e59fa4bcf"),
    description: "Handloom, hand embroidery, block print and handmade jewellery from artisan workshops." },
  { slug: "under-3000", title: "Under ₹3,000", kind: "automated", featured: true, sort: 8,
    rules: { match: "all", conditions: [{ field: "price", op: "lt", value: "300000" }] },
    banner: wide("1562157873-818bc0726f68"), image: tall("1562157873-818bc0726f68"),
    description: "Everyday favourites under ₹3,000." },
  { slug: "workwear", title: "Workwear", kind: "automated", sort: 9,
    rules: { match: "all", conditions: [{ field: "tag", op: "equals", value: "workwear" }] },
    banner: wide("1613915617430-8ab0fd7c6baf"), image: tall("1613915617430-8ab0fd7c6baf"),
    description: "Crisp shirting, fluid blouses and tailoring for the working week." },
];

const colorCode = (name) => name.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w.slice(0, 3)).join("").toUpperCase().slice(0, 6);
const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Deterministic "random" stock so the seed is stable between runs.
function stockFor(sku) {
  let h = 0;
  for (const ch of sku) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = h % 100;
  if (r < 6) return 0;
  if (r < 16) return 1 + (h % 3);
  return 6 + (h % 20);
}

const out = [];
out.push(`-- Sample catalog for development and demos. Generated by scripts/generate-seed.mjs;
-- edit that file and re-run it rather than editing this one.
--
-- Everything here is flagged is_sample and can be removed from Admin > Settings >
-- Sample data. Brands and products are fictional. Photos: Unsplash (unsplash.com/license).
`);

out.push("-- Size guides");
for (const g of sizeGuides) {
  out.push(`insert into public.size_guides (name, unit, columns, rows, how_to_measure, is_sample) values (${q(g.name)}, ${q(g.unit)}, ${arr(g.columns)}, ${json(g.rows)}, ${q(g.how)}, true);`);
}
const guideRef = (key) => `(select id from public.size_guides where name = ${q(sizeGuides.find((g) => g.key === key).name)})`;

out.push("\n-- Brands");
brands.forEach((b, i) => {
  out.push(`insert into public.brands (name, slug, description, banner_url, is_featured, sort_order, is_sample) values (${q(b.name)}, ${q(b.slug)}, ${q(b.description)}, ${q(b.banner)}, ${b.featured}, ${i + 1}, true);`);
});

out.push("\n-- Categories (departments first, then their product types)");
for (const c of categories) {
  out.push(`insert into public.categories (parent_id, name, slug, description, image_url, banner_url, size_guide_id, sort_order, is_sample) values (${
    c.parent ? `(select id from public.categories where slug = ${q(c.parent)})` : "null"
  }, ${q(c.name)}, ${q(c.slug)}, ${q(c.description || "")}, ${q(c.image || null)}, ${q(c.banner || null)}, ${c.guide ? guideRef(c.guide) : "null"}, ${c.sort}, true);`);
}

out.push("\n-- Products, images and variants");
products.forEach((p, i) => {
  const brand = brands.find((b) => b.slug === p.b);
  const slug = slugify(p.t);
  const status = p.status || "active";
  // Newest products first: spread publication over the last few weeks.
  const published = p.scheduled ? "now() + interval '7 days'" : status === "active" ? `now() - interval '${(i * 19) % 60} days' - interval '${i} hours'` : "null";
  out.push(`insert into public.products (title, slug, brand_id, category_id, size_guide_id, description, fabric, fit, care, tags, status, published_at, is_featured, price, compare_at_price, is_returnable, is_sample) values (${q(p.t)}, ${q(slug)}, (select id from public.brands where slug = ${q(p.b)}), (select id from public.categories where slug = ${q(p.c)}), ${p.guide ? guideRef(p.guide) : "null"}, ${q(p.d)}, ${q(p.fabric)}, ${q(p.fit)}, ${q(p.care)}, ${arr(p.tags)}, '${status}', ${published}, ${!!p.featured}, ${p.p * 100}, ${p.cmp ? p.cmp * 100 : "null"}, ${p.returnable !== false}, true);`);
  // Each photo is stored once. A photo used by a single colour is tagged with it, so the
  // product page shows it when that colour is picked; shared photos have no colour.
  const ids = [...new Set(p.colors.flatMap(([, , list]) => list))];
  ids.forEach((id, pos) => {
    const owners = p.colors.filter(([, , list]) => list.includes(id)).map(([name]) => name);
    const color = owners.length === 1 ? owners[0] : null;
    const alt = color && p.colors.length > 1 ? `${p.t} in ${color.toLowerCase()}` : p.t;
    out.push(`insert into public.product_images (product_id, url, alt, color, position) values ((select id from public.products where slug = ${q(slug)}), ${q(img(id))}, ${q(alt)}, ${q(color)}, ${pos});`);
  });
  let vpos = 0;
  for (const [color, hex] of p.colors) {
    for (const size of p.sizes) {
      const sku = [brand.code, String(i + 1).padStart(3, "0"), colorCode(color), size].filter(Boolean).join("-");
      out.push(`insert into public.product_variants (product_id, sku, size, color, color_hex, stock_quantity, position) values ((select id from public.products where slug = ${q(slug)}), ${q(sku)}, ${q(size)}, ${q(color)}, ${q(hex)}, ${stockFor(sku)}, ${vpos++});`);
    }
  }
});

out.push("\n-- Collections");
for (const c of collections) {
  out.push(`insert into public.collections (title, slug, description, image_url, banner_url, kind, rules, is_seasonal, season, is_featured, sort_order, is_sample) values (${q(c.title)}, ${q(c.slug)}, ${q(c.description)}, ${q(c.image)}, ${q(c.banner)}, '${c.kind}', ${json(c.rules || { match: "all", conditions: [] })}, ${!!c.seasonal}, ${q(c.season || "")}, ${!!c.featured}, ${c.sort}, true);`);
  (c.products || []).forEach((title, pos) => {
    out.push(`insert into public.collection_products (collection_id, product_id, position) values ((select id from public.collections where slug = ${q(c.slug)}), (select id from public.products where slug = ${q(slugify(title))}), ${pos});`);
  });
}

out.push(`
-- Sample coupons
insert into public.coupons (code, description, kind, value, max_discount, min_subtotal, usage_limit_per_customer, first_order_only, is_sample)
values ('WELCOME10', '10% off your first order over ₹1,999 (up to ₹1,500).', 'percentage', 1000, 150000, 199900, 1, true, true);
insert into public.coupons (code, description, kind, value, min_subtotal, usage_limit, is_sample)
values ('FLAT500', '₹500 off orders over ₹4,999.', 'fixed', 50000, 499900, 500, true);
insert into public.coupons (code, description, kind, value, min_subtotal, is_sample)
values ('FREESHIP', 'Free delivery on any order over ₹999.', 'free_shipping', 0, 99900, true);
insert into public.coupons (code, description, kind, value, applies_to, collection_ids, is_sample)
values ('CRAFT15', '15% off everything handcrafted in India.', 'percentage', 1500, 'collections',
        array[(select id from public.collections where slug = 'handcrafted-in-india')], true);

-- Sample delivery zone: faster delivery to six metro areas (higher priority than the
-- default All India zone created by the migrations).
insert into public.shipping_zones (name, postal_prefixes, priority, is_sample)
values ('Metro cities (sample)', array['11', '40', '56', '60', '70', '50'], 10, true);
insert into public.shipping_rates (zone_id, name, description, price, free_over, min_days, max_days, cod_available, sort_order)
select id, 'Standard', 'Tracked delivery', 7900, 299900, 2, 4, true, 1 from public.shipping_zones where name = 'Metro cities (sample)';
insert into public.shipping_rates (zone_id, name, description, price, min_days, max_days, cod_available, sort_order)
select id, 'Express', 'Next-day delivery for orders placed before 2pm', 19900, 1, 2, false, 2 from public.shipping_zones where name = 'Metro cities (sample)';
insert into public.postal_code_rules (postal_code, blocks, note) values ('744101', 'all', 'Sample rule: not serviceable');
insert into public.postal_code_rules (postal_code, blocks, note) values ('110001', 'cod', 'Sample rule: prepaid only');

-- Sample storefront content
update public.store_settings set
  free_shipping_threshold = 299900,
  homepage = ${json({
    announcement: "Complimentary delivery on orders over ₹2,999 · Easy 15-day returns",
    hero: [
      {
        sample: true,
        eyebrow: "Just dropped",
        heading: "Y2K, but make it now",
        subheading: "Corsets, minis, low-rise denim and cropped jackets, in small drops that don't come back.",
        cta_label: "Shop Y2K Revival",
        cta_href: "/collections/y2k-revival",
        secondary_label: "New arrivals",
        secondary_href: "/shop?sort=newest",
        image_url: img("1790283727726-f8ba027df653", "4:5"),
        image_alt: "Woman in a white bustier corset top and baggy jeans",
      },
      {
        sample: true,
        eyebrow: "Streetwear Staples",
        heading: "Wide legs, heavy cotton",
        subheading: "Cargos, jorts, boxy tees and track jackets that look better with every wash.",
        cta_label: "Shop streetwear",
        cta_href: "/collections/streetwear-staples",
        image_url: img("1780566759823-6ab515d86760", "4:5"),
        image_alt: "Woman in an oversized white tee and tan parachute cargo pants",
      },
      {
        sample: true,
        eyebrow: "Autumn / Winter '26",
        heading: "The quiet season",
        subheading: "Camel, oat and rust. Trench coats, heavy knits and tailoring made to be worn for years.",
        cta_label: "Shop the collection",
        cta_href: "/collections/autumn-winter-26",
        secondary_label: "New arrivals",
        secondary_href: "/shop?sort=newest",
        image_url: img("1779406165962-7df12de281b1", "4:5"),
        image_alt: "Model in a camel suit and long coat",
      },
    ],
    promos: [
      { sample: true, eyebrow: "Vintage Prep", heading: "Varsity, argyle and pleats", cta_label: "Shop the prep edit", cta_href: "/collections/vintage-prep", image_url: img("1682354163828-d1d56c380431", "4:5"), image_alt: "Woman in a forest-green varsity jacket and a white crop top" },
      { sample: true, eyebrow: "Going out", heading: "Dressed for after dark", cta_label: "Shop occasionwear", cta_href: "/collections/the-occasion-edit", image_url: img("1779400203195-8906eec4b645", "4:5"), image_alt: "Black cut-out halter dress" },
      { sample: true, eyebrow: "Under ₹3,000", heading: "Everyday essentials", cta_label: "Shop now", cta_href: "/collections/under-3000", image_url: img("1562157873-818bc0726f68", "4:5"), image_alt: "Folded cotton t-shirts in six colours" },
    ],
  })},
  og_image_url = ${q(img("1790283727726-f8ba027df653", "1.91:1", "faces"))}
where id = 1;
`);

// --pack <store id>: instead of the seed, prints the SQL that adds the products from
// FIRST_ADDED onwards to one store (a store whose sample catalog was copied before they were
// added, or any clothing store), as the newest arrivals and flagged as samples. It adds the size
// guides, brands and categories they need where the store has none by that name, and skips
// products the store already has. Paste it into Supabase › SQL Editor.
const packAt = process.argv.indexOf("--pack");
if (packAt > -1) {
  const store = process.argv[packAt + 1] ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(store)) {
    console.error("--pack takes a store id, like 6bf8ac76-bb65-4994-b630-e9eda2c7a357");
    process.exit(1);
  }
  const from = products.findIndex((p) => p.t === FIRST_ADDED);
  const added = products.slice(from);
  const needed = new Set(added.map((p) => p.c));
  for (const slug of [...needed]) {
    const parent = categories.find((c) => c.slug === slug)?.parent;
    if (parent) needed.add(parent);
  }
  const cats = categories.filter((c) => needed.has(c.slug));
  const guides = new Set([...cats.map((c) => c.guide), ...added.map((p) => p.guide)].filter(Boolean));
  const guideName = (key) => (key ? q(sizeGuides.find((g) => g.key === key).name) : "null::text");
  const rows = (list) => list.map((r) => `    (${r.join(", ")})`).join(",\n");
  const sql = [
    `-- Adds ${added.length} sample products ("${FIRST_ADDED}" onwards) to store ${store}.`,
    "-- Generated by scripts/generate-seed.mjs --pack. Run once in Supabase › SQL Editor; running it",
    "-- again adds nothing the store already has.",
    "do $pack$",
    "declare",
    `  s uuid := ${q(store)};`,
    "begin",
    "  if not exists (select 1 from public.stores where id = s) then raise exception 'No store %', s; end if;",
    "  perform set_config('app.cross_store', 'on', true);",
    "  insert into public.size_guides (store_id, name, unit, columns, rows, how_to_measure, is_sample)",
    "  select s, g.name, g.unit, g.columns, g.rows, g.how, true from (values",
    rows(sizeGuides.filter((x) => guides.has(x.key)).map((g) => [q(g.name), q(g.unit), arr(g.columns), json(g.rows), q(g.how)])),
    "  ) as g(name, unit, columns, rows, how)",
    "  where not exists (select 1 from public.size_guides x where x.store_id = s and x.name = g.name);",
    "  insert into public.brands (store_id, name, slug, description, banner_url, is_featured, sort_order, is_sample)",
    "  select s, b.name, b.slug, b.description, b.banner, b.featured, b.sort, true from (values",
    rows(brands.filter((x) => added.some((p) => p.b === x.slug)).map((b) => [q(b.name), q(b.slug), q(b.description), q(b.banner), String(b.featured), String(brands.indexOf(b) + 1)])),
    "  ) as b(name, slug, description, banner, featured, sort)",
    "  where not exists (select 1 from public.brands x where x.store_id = s and x.slug = b.slug);",
  ];
  // Departments, then the categories inside them (each finds its parent by its short name).
  for (const level of [cats.filter((c) => !c.parent), cats.filter((c) => c.parent)]) {
    if (!level.length) continue;
    sql.push(
      "  insert into public.categories (store_id, parent_id, name, slug, description, image_url, banner_url, size_guide_id, sort_order, is_sample)",
      "  select s, (select id from public.categories x where x.store_id = s and x.slug = c.parent), c.name, c.slug, c.description, c.image, c.banner,",
      "    (select id from public.size_guides x where x.store_id = s and x.name = c.guide), c.sort, true from (values",
      rows(level.map((c) => [c.parent ? q(c.parent) : "null::text", q(c.name), q(c.slug), q(c.description || ""), c.image ? q(c.image) : "null::text", c.banner ? q(c.banner) : "null::text", guideName(c.guide), String(c.sort)])),
      "  ) as c(parent, name, slug, description, image, banner, guide, sort)",
      "  where not exists (select 1 from public.categories x where x.store_id = s and x.slug = c.slug);",
    );
  }
  const images = [];
  const variants = [];
  sql.push(
    "  -- The newest arrivals, a few hours apart.",
    "  insert into public.products (store_id, title, slug, brand_id, category_id, size_guide_id, description, fabric, fit, care, tags, status, published_at, is_featured, price, compare_at_price, is_returnable, is_sample)",
    "  select s, p.title, p.slug, (select id from public.brands x where x.store_id = s and x.slug = p.brand), (select id from public.categories x where x.store_id = s and x.slug = p.category),",
    "    (select id from public.size_guides x where x.store_id = s and x.name = p.guide), p.description, p.fabric, p.fit, p.care, p.tags, 'active', now() - make_interval(hours => p.age),",
    "    p.featured, p.price, p.compare_at, p.returnable, true from (values",
    rows(added.map((p, k) => {
      const i = from + k;
      const brand = brands.find((b) => b.slug === p.b);
      const slug = slugify(p.t);
      const ids = [...new Set(p.colors.flatMap(([, , list]) => list))];
      ids.forEach((id, pos) => {
        const owners = p.colors.filter(([, , list]) => list.includes(id)).map(([name]) => name);
        const color = owners.length === 1 ? owners[0] : null;
        const alt = color && p.colors.length > 1 ? `${p.t} in ${color.toLowerCase()}` : p.t;
        images.push([q(slug), q(img(id)), q(alt), color ? q(color) : "null::text", String(pos)]);
      });
      let vpos = 0;
      for (const [color, hex] of p.colors) {
        for (const size of p.sizes) {
          const sku = [brand.code, String(i + 1).padStart(3, "0"), colorCode(color), size].filter(Boolean).join("-");
          variants.push([q(slug), q(sku), q(size), q(color), q(hex), String(stockFor(sku)), String(vpos++)]);
        }
      }
      return [q(p.t), q(slug), q(p.b), q(p.c), guideName(p.guide), q(p.d), q(p.fabric), q(p.fit), q(p.care), arr(p.tags), String(k * 5), String(!!p.featured), String(p.p * 100), p.cmp ? String(p.cmp * 100) : "null::int", String(p.returnable !== false)];
    })),
    "  ) as p(title, slug, brand, category, guide, description, fabric, fit, care, tags, age, featured, price, compare_at, returnable)",
    "  where not exists (select 1 from public.products x where x.store_id = s and x.slug = p.slug);",
    "  insert into public.product_images (store_id, product_id, url, alt, color, position)",
    "  select s, p.id, i.url, i.alt, i.color, i.pos from (values",
    rows(images),
    "  ) as i(slug, url, alt, color, pos)",
    "  join public.products p on p.store_id = s and p.slug = i.slug",
    "  where not exists (select 1 from public.product_images x where x.product_id = p.id and x.url = i.url);",
    "  insert into public.product_variants (store_id, product_id, sku, size, color, color_hex, stock_quantity, position)",
    "  select s, p.id, v.sku, v.size, v.color, v.hex, v.stock, v.pos from (values",
    rows(variants),
    "  ) as v(slug, sku, size, color, hex, stock, pos)",
    "  join public.products p on p.store_id = s and p.slug = v.slug",
    "  where not exists (select 1 from public.product_variants x where x.store_id = s and x.sku = v.sku);",
  );
  sql.push("end $pack$;");
  process.stdout.write(sql.join("\n") + "\n");
  process.exit(0);
}

const target = fileURLToPath(new URL("../supabase/seed.sql", import.meta.url));
writeFileSync(target, out.join("\n") + "\n");
console.log(`Wrote ${target}: ${products.length} products, ${brands.length} brands, ${collections.length} collections.`);
