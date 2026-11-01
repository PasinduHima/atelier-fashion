/**
 * Seeds the catalog with the storefront's sample data. Safe to rerun: rows are
 * upserted by slug (categories, products, collections) or SKU (variants), and
 * collection memberships are rewritten. Run with `npm run db:seed`.
 * Photography is from Unsplash (https://unsplash.com).
 */
import { config } from "dotenv";
import { and, inArray, notInArray, sql } from "drizzle-orm";
import { unsplash } from "../lib/content";

config({ path: [".env.local", ".env"] });

type SeedCategory = { slug: string; name: string; image: string; alt: string };

/** apparel: XS–XL; shoes: EU 36–45; one-size: a single "One size" variant. */
type Sizing = "apparel" | "shoes" | "one-size";

type SeedProduct = {
  slug: string;
  name: string;
  category: string; // category slug
  price: number; // whole USD
  image: string;
  badge?: string;
  sizing: Sizing;
  color?: string;
  /**
   * Units per size, in grid order. A single number is spread across the grid
   * (deeper in the middle sizes); 0 sells every size out.
   */
  stock: number | number[];
  /** Whole-USD price overrides keyed by size. */
  priceOverrides?: Record<string, number>;
  description: string;
  details: string[];
};

type SeedCollection = { slug: string; name: string; description: string; products: string[] };

const SIZE_GRIDS: Record<Sizing, string[]> = {
  apparel: ["XS", "S", "M", "L", "XL"],
  shoes: ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45"],
  "one-size": ["One size"],
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
    sizing: "one-size",
    color: "Black",
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
    sizing: "shoes",
    color: "Printed silk",
    // Low stock, with the larger sizes sold out.
    stock: [1, 2, 3, 2, 1, 1, 0, 0, 0, 0],
    description: "A pointed stiletto pump in printed silk satin, set on a slender 95 mm heel and lined in soft leather.",
    details: ["Silk satin upper, leather lining and sole", "95 mm heel", "Fits true to size", "Made in Italy"],
  },
  {
    slug: "carro-leather-biker",
    name: "Carro leather biker jacket",
    category: "ready-to-wear",
    price: 3900,
    image: unsplash("1551028719-00167b16eac5"),
    sizing: "apparel",
    color: "Black",
    // XS sold out, L low.
    stock: [0, 3, 5, 2, 4],
    priceOverrides: { XL: 4100 },
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
    sizing: "one-size",
    color: "Tortoiseshell",
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
    sizing: "one-size",
    color: "Ivory",
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
    sizing: "shoes",
    color: "Forest suede",
    stock: [0, 0, 1, 2, 3, 4, 4, 3, 2, 1],
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
    sizing: "apparel",
    color: "Sable",
    stock: [1, 2, 3, 2, 1],
    description: "A lightweight bomber in washed silk twill with ribbed knit trims and a two-way zip.",
    details: ["100% silk, viscose lining", "Relaxed fit", "Dry clean only", "Made in Italy"],
  },
  {
    slug: "fringe-knit-poncho",
    name: "Fringe knit poncho",
    category: "ready-to-wear",
    price: 1150,
    image: unsplash("1434389677669-e08b4cac3105"),
    sizing: "one-size",
    color: "Oatmeal",
    stock: 11,
    description: "A wide poncho knitted from brushed alpaca and wool, finished with hand-knotted fringe at the hem.",
    details: ["60% alpaca, 40% wool", "One size", "Hand wash cold", "Made in Peru"],
  },
];

/** The gift edit; dated before the new arrivals. */
const giftEdit: SeedProduct[] = [
  {
    slug: "aurore-halo-ring",
    name: "Aurore halo ring",
    category: "jewelry",
    price: 3200,
    image: unsplash("1605100804763-247f67b3557e"),
    sizing: "one-size",
    color: "Yellow gold",
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
    sizing: "one-size",
    color: "White gold",
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
    sizing: "one-size",
    color: "Gold vermeil",
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
    sizing: "one-size",
    color: "Natural raffia",
    stock: 9,
    description: "A top handle bag hand-woven from dyed raffia, with leather trims and a canvas-lined interior.",
    details: ["Raffia, leather trims, cotton lining", "32 x 24 x 12 cm", "Spot clean only", "Handmade in Spain"],
  },
];

const collections: SeedCollection[] = [
  {
    slug: "new-in",
    name: "New arrivals",
    description: "The latest pieces from the atelier, newest first.",
    products: newArrivals.map((p) => p.slug),
  },
  {
    slug: "women",
    name: "Women",
    description: "Ready-to-wear, shoes, bags and jewelry for her.",
    products: [
      "ondine-stiletto-pump",
      "fringe-knit-poncho",
      "sable-bomber-jacket",
      "maren-top-handle-bag",
      "paloma-shoulder-bag",
      "cesta-woven-bag",
      "aurore-halo-ring",
      "riva-drop-earrings",
      "conch-gold-earrings",
    ],
  },
  {
    slug: "men",
    name: "Men",
    description: "Outerwear, shoes and accessories for him.",
    products: ["carro-leather-biker", "verde-suede-brogue", "lune-round-sunglasses", "sable-bomber-jacket"],
  },
  {
    slug: "gifts",
    name: "Gifts",
    description: "Considered gifts, from fine jewelry to everyday leather.",
    products: giftEdit.map((p) => p.slug),
  },
  {
    slug: "leather-goods",
    name: "Leather goods",
    description: "Calfskin, nappa and suede, cut and finished by hand.",
    products: ["maren-top-handle-bag", "paloma-shoulder-bag", "carro-leather-biker", "verde-suede-brogue"],
  },
  {
    slug: "travel",
    name: "Travel",
    description: "Pieces that pack light and travel well.",
    products: ["lune-round-sunglasses", "cesta-woven-bag", "fringe-knit-poncho", "sable-bomber-jacket"],
  },
  {
    slug: "autumn-winter",
    name: "Autumn–Winter",
    description: "Leather, suede and brushed alpaca for the colder months.",
    products: ["carro-leather-biker", "fringe-knit-poncho", "verde-suede-brogue", "sable-bomber-jacket"],
  },
];

/** "EU 38" -> "EU38", "One size" -> "OS". */
const sizeCode = (size: string) => (size === "One size" ? "OS" : size.replace(/\s+/g, ""));

/** Splits a total across a size grid, weighting the middle sizes. */
function spreadStock(total: number, sizes: number): number[] {
  if (sizes === 1) return [total];
  const mid = (sizes - 1) / 2;
  const weights = Array.from({ length: sizes }, (_, i) => mid + 1 - Math.abs(i - mid));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((total * w) / sum));
}

function variantsFor(product: SeedProduct) {
  const sizes = SIZE_GRIDS[product.sizing];
  const stock = Array.isArray(product.stock) ? product.stock : spreadStock(product.stock, sizes.length);
  if (stock.length !== sizes.length) {
    throw new Error(`${product.slug}: ${stock.length} stock values for ${sizes.length} sizes`);
  }
  return sizes.map((size, i) => {
    const override = product.priceOverrides?.[size];
    return {
      size,
      color: product.color ?? null,
      sku: `${product.slug.toUpperCase()}-${sizeCode(size)}`,
      priceCents: override === undefined ? null : override * 100,
      stock: stock[i],
      sortOrder: i,
    };
  });
}

async function main() {
  // Sample data only: a rerun resets stock, reactivates variants and deletes
  // variants it doesn't define (cascading to bag lines). Never run it in production.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed with NODE_ENV=production.");
  }

  // Imported after dotenv runs: `db` throws at import time without DATABASE_URL.
  const { db } = await import("./index");
  const schema = await import("./catalog-schema");
  const { products, productVariants, collectionProducts } = schema;

  const categoryRows = await db
    .insert(schema.categories)
    .values(categories.map((c, i) => ({ slug: c.slug, name: c.name, imageUrl: c.image, imageAlt: c.alt, sortOrder: i })))
    .onConflictDoUpdate({
      target: schema.categories.slug,
      set: {
        name: sql`excluded.name`,
        imageUrl: sql`excluded.image_url`,
        imageAlt: sql`excluded.image_alt`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: schema.categories.id, slug: schema.categories.slug });
  const categoryId = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // One minute apart, newest first, so `created_at desc` reproduces this order.
  const now = Date.now();
  const all = [...newArrivals, ...giftEdit];
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
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: products.id, slug: products.slug });
  const productId = new Map(productRows.map((row) => [row.slug, row.id]));

  const variantRows = all.flatMap((p) => variantsFor(p).map((v) => ({ ...v, productId: productId.get(p.slug)! })));
  await db
    .insert(productVariants)
    .values(variantRows)
    .onConflictDoUpdate({
      target: productVariants.sku,
      set: {
        productId: sql`excluded.product_id`,
        size: sql`excluded.size`,
        color: sql`excluded.color`,
        priceCents: sql`excluded.price_cents`,
        stock: sql`excluded.stock`,
        sortOrder: sql`excluded.sort_order`,
        isActive: sql`true`,
        updatedAt: sql`now()`,
      },
    });
  // Remove variants of seeded products that the seed no longer defines, such as
  // the "One size" placeholders the 0003 migration created for sized products.
  await db.delete(productVariants).where(
    and(
      inArray(productVariants.productId, [...productId.values()]),
      notInArray(
        productVariants.sku,
        variantRows.map((v) => v.sku),
      ),
    ),
  );

  const collectionRows = await db
    .insert(schema.collections)
    .values(collections.map((c, i) => ({ slug: c.slug, name: c.name, description: c.description, sortOrder: i })))
    .onConflictDoUpdate({
      target: schema.collections.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: schema.collections.id, slug: schema.collections.slug });
  const collectionId = new Map(collectionRows.map((row) => [row.slug, row.id]));

  const memberships = collections.flatMap((c) =>
    c.products.map((slug, i) => {
      const pid = productId.get(slug);
      if (pid === undefined) throw new Error(`Unknown product "${slug}" in collection ${c.slug}`);
      return { collectionId: collectionId.get(c.slug)!, productId: pid, sortOrder: i };
    }),
  );
  // Rewrite memberships of the seeded collections in one atomic batch.
  await db.batch([
    db.delete(collectionProducts).where(inArray(collectionProducts.collectionId, [...collectionId.values()])),
    db.insert(collectionProducts).values(memberships),
  ]);

  console.log(
    `Seeded ${categoryRows.length} categories, ${productRows.length} products, ${variantRows.length} variants, ` +
      `${collectionRows.length} collections and ${memberships.length} memberships.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
