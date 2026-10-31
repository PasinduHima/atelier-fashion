/**
 * Seeds the catalog with the storefront's sample data. Safe to rerun: every
 * row is upserted by slug. Run with `npm run db:seed`.
 * Photography is from Unsplash (https://unsplash.com).
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { unsplash } from "../lib/content";

config({ path: [".env.local", ".env"] });

type SeedCategory = { slug: string; name: string; image: string; alt: string };

type SeedProduct = {
  slug: string;
  name: string;
  category: string; // category slug
  price: number; // whole USD
  image: string;
  badge?: string;
  stock: number;
  description: string;
  details: string[];
};

const categories: SeedCategory[] = [
  { slug: "bags", name: "Handbags", image: unsplash("1590874103328-eac38a683ce7"), alt: "An orange woven handbag" },
  { slug: "shoes", name: "Shoes", image: unsplash("1543163521-1bf539c55dd2"), alt: "A pair of printed stiletto pumps" },
  { slug: "ready-to-wear", name: "Ready-to-wear", image: unsplash("1558769132-cb1aea458c5e"), alt: "Neutral knitwear hanging on a rail" },
  { slug: "jewelry", name: "Jewelry", image: unsplash("1535632066927-ab7c9ab60908"), alt: "Sapphire drop earrings on a leaf" },
  { slug: "eyewear", name: "Eyewear", image: unsplash("1511499767150-a48a237f0083"), alt: "Round sunglasses on a white surface" },
];

/** Newest first: these become the home page's "New arrivals". */
const newArrivals: SeedProduct[] = [
  {
    slug: "maren-top-handle-bag",
    name: "Maren top handle bag",
    category: "bags",
    price: 2450,
    image: unsplash("1584917865442-de89df76afd3"),
    stock: 6,
    description: "A structured top handle bag in smooth calfskin, finished with a hand-painted edge and a single brass turn-lock.",
    details: ["Calfskin leather, lambskin lining", "28 x 20 x 11 cm", "Detachable shoulder strap", "Made in Italy"],
    badge: "New",
  },
  {
    slug: "ondine-stiletto-pump",
    name: "Ondine printed stiletto pump",
    category: "shoes",
    price: 890,
    image: unsplash("1543163521-1bf539c55dd2"),
    stock: 2,
    description: "A pointed stiletto pump in printed silk satin, set on a slender 95 mm heel and lined in soft leather.",
    details: ["Silk satin upper, leather lining and sole", "95 mm heel", "Fits true to size", "Made in Italy"],
  },
  {
    slug: "carro-leather-biker",
    name: "Carro leather biker jacket",
    category: "ready-to-wear",
    price: 3900,
    image: unsplash("1551028719-00167b16eac5"),
    stock: 8,
    description: "A biker jacket cut from supple lambskin, with an asymmetric zip, notched lapels and a belted waist.",
    details: ["100% lambskin, cupro lining", "Regular fit, hip length", "Specialist leather clean only", "Made in Italy"],
    badge: "New",
  },
  {
    slug: "lune-round-sunglasses",
    name: "Lune round sunglasses",
    category: "eyewear",
    price: 420,
    image: unsplash("1511499767150-a48a237f0083"),
    stock: 14,
    description: "Round acetate sunglasses with keyhole bridges and tinted lenses that block all UVA and UVB light.",
    details: ["Hand-polished acetate frame", "Category 3 lenses, 100% UV protection", "Includes leather case", "Made in Italy"],
  },
  {
    slug: "paloma-shoulder-bag",
    name: "Paloma chevron shoulder bag",
    category: "bags",
    price: 1980,
    image: unsplash("1566150905458-1bf1fc113f0d"),
    stock: 0,
    description: "A soft shoulder bag in chevron-quilted nappa leather, with a sliding chain strap and magnetic flap.",
    details: ["Nappa leather, suede lining", "25 x 15 x 7 cm", "Adjustable chain strap", "Made in Italy"],
  },
  {
    slug: "verde-suede-brogue",
    name: "Verde suede brogue",
    category: "shoes",
    price: 760,
    image: unsplash("1560343090-f0409e92791a"),
    stock: 3,
    description: "A classic wingtip brogue in brushed suede, Goodyear welted on a leather sole so it can be resoled for years.",
    details: ["Suede upper, leather lining", "Goodyear-welted leather sole", "Fits large; consider half a size down", "Made in England"],
    badge: "Exclusive",
  },
  {
    slug: "sable-bomber-jacket",
    name: "Sable silk bomber jacket",
    category: "ready-to-wear",
    price: 2600,
    image: unsplash("1591047139829-d91aecb6caea"),
    stock: 5,
    description: "A lightweight bomber in washed silk twill with ribbed knit trims and a two-way zip.",
    details: ["100% silk, viscose lining", "Relaxed fit", "Dry clean only", "Made in Italy"],
  },
  {
    slug: "fringe-knit-poncho",
    name: "Fringe knit poncho",
    category: "ready-to-wear",
    price: 1150,
    image: unsplash("1434389677669-e08b4cac3105"),
    stock: 11,
    description: "A wide poncho knitted from brushed alpaca and wool, finished with hand-knotted fringe at the hem.",
    details: ["60% alpaca, 40% wool", "One size", "Hand wash cold", "Made in Peru"],
  },
];

/** Flagged `is_gift`; dated before the new arrivals. */
const giftEdit: SeedProduct[] = [
  {
    slug: "aurore-halo-ring",
    name: "Aurore halo ring",
    category: "jewelry",
    price: 3200,
    image: unsplash("1605100804763-247f67b3557e"),
    stock: 1,
    description: "A solitaire ring in 18k gold, the centre stone framed by a halo of pavé-set diamonds.",
    details: ["18k yellow gold", "Diamonds, 0.6 ct total weight", "Supplied in a signature box", "Made in France"],
  },
  {
    slug: "riva-drop-earrings",
    name: "Riva sapphire drop earrings",
    category: "jewelry",
    price: 2750,
    image: unsplash("1535632066927-ab7c9ab60908"),
    stock: 4,
    description: "Drop earrings set with pear-cut sapphires, suspended from a fine diamond line.",
    details: ["18k white gold", "Sapphires and diamonds", "4 cm drop, post back", "Made in France"],
  },
  {
    slug: "conch-gold-earrings",
    name: "Conch gold earrings",
    category: "jewelry",
    price: 980,
    image: unsplash("1617038220319-276d3cfab638"),
    stock: 0,
    description: "Sculptural hoop earrings in recycled gold vermeil, shaped after a spiral shell.",
    details: ["Gold vermeil on recycled sterling silver", "2.5 cm diameter", "Hinged closure", "Made in Spain"],
  },
  {
    slug: "cesta-woven-bag",
    name: "Cesta woven handbag",
    category: "bags",
    price: 1650,
    image: unsplash("1590874103328-eac38a683ce7"),
    stock: 9,
    description: "A top handle bag hand-woven from dyed raffia, with leather trims and a canvas-lined interior.",
    details: ["Raffia, leather trims, cotton lining", "32 x 24 x 12 cm", "Spot clean only", "Handmade in Spain"],
  },
];

async function main() {
  // Imported after dotenv runs: `db` throws at import time without DATABASE_URL.
  const { db } = await import("./index");
  const { categories: categoriesTable, products, productStock } = await import("./catalog-schema");

  const categoryRows = await db
    .insert(categoriesTable)
    .values(categories.map((c, i) => ({ slug: c.slug, name: c.name, imageUrl: c.image, imageAlt: c.alt, sortOrder: i })))
    .onConflictDoUpdate({
      target: categoriesTable.slug,
      set: {
        name: sql`excluded.name`,
        imageUrl: sql`excluded.image_url`,
        imageAlt: sql`excluded.image_alt`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: categoriesTable.id, slug: categoriesTable.slug });
  const categoryId = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // One minute apart, newest first, so `created_at desc` reproduces this order.
  const now = Date.now();
  const all = [...newArrivals.map((p) => ({ ...p, isGift: false })), ...giftEdit.map((p) => ({ ...p, isGift: true }))];
  const productRows = await db
    .insert(products)
    .values(
      all.map((p, i) => {
        const id = categoryId.get(p.category);
        if (id === undefined) throw new Error(`Unknown category "${p.category}" for ${p.slug}`);
        return {
          categoryId: id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          details: p.details,
          priceCents: p.price * 100,
          imageUrl: p.image,
          badge: p.badge ?? null,
          isGift: p.isGift,
          createdAt: new Date(now - i * 60_000),
        };
      }),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        categoryId: sql`excluded.category_id`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        details: sql`excluded.details`,
        priceCents: sql`excluded.price_cents`,
        imageUrl: sql`excluded.image_url`,
        badge: sql`excluded.badge`,
        isGift: sql`excluded.is_gift`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: products.id, slug: products.slug });
  const productId = new Map(productRows.map((row) => [row.slug, row.id]));

  await db
    .insert(productStock)
    .values(all.map((p) => ({ productId: productId.get(p.slug)!, quantity: p.stock })))
    .onConflictDoUpdate({
      target: productStock.productId,
      set: { quantity: sql`excluded.quantity`, updatedAt: sql`now()` },
    });

  console.log(`Seeded ${categoryRows.length} categories, ${productRows.length} products and their stock.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
