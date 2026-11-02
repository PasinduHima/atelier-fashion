/**
 * Editorial content for the storefront (hero, campaign, story, services).
 * Product, category and stock data come from the database (see `@/lib/products`).
 * Photography is from Unsplash (https://unsplash.com).
 */

export type Collection = {
  slug: string;
  title: string;
  kicker: string;
  image: string;
  alt: string;
};

/** Unsplash photo URL; the custom image loader adds width and quality per request. */
export const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop`;

export const hero = {
  kicker: "Autumn Winter 2026",
  title: "The Long Coat",
  body: "Twelve pieces cut from Italian wool, made to be worn for a decade rather than a season.",
  ctas: [
    { label: "Shop the collection", href: "/collections/autumn-winter" },
    { label: "See the campaign", href: "/stories/the-long-coat" },
  ],
  image: "/HomePageImg.avif",
  alt: "A model in a long dark textured coat, a fur hat and a white roll-neck",
};

export const featuredCollections: Collection[] = [
  {
    slug: "women",
    title: "Women",
    kicker: "New season",
    image: unsplash("1581044777550-4cfa60707c03"),
    alt: "A model in a pink ruffled dress holding sunglasses in a field",
  },
  {
    slug: "men",
    title: "Men",
    kicker: "Tailoring",
    image: unsplash("1617137968427-85924c800a22"),
    alt: "A man in a navy suit walking past a glass building",
  },
];

export const campaign = {
  kicker: "The journey",
  title: "Cathedral Mornings",
  body: "A pale blue overcoat, a quilted crossbody and a city waking up. The new travel wardrobe, photographed between departures.",
  cta: { label: "Explore the edit", href: "/collections/travel" },
  image: unsplash("1539109136881-3be0616acf4b"),
  alt: "A woman in a pale blue coat in front of a gothic cathedral",
};

export const story = {
  kicker: "The atelier",
  title: "Made slowly, by hand",
  body: "Every piece begins at a cutting table. Our leather goods are stitched by a small team of artisans, using techniques passed between generations and materials chosen to soften with age.",
  cta: { label: "Read our story", href: "/about" },
  image: unsplash("1490481651871-ab68de25d43d"),
  alt: "Cream and brown garments hanging on a minimalist rail",
};

export const services = [
  {
    title: "Complimentary shipping",
    body: "Free delivery on orders over $500 ($25 below), packed in our signature box.",
  },
  {
    title: "Book an appointment",
    body: "Shop in store or online with the help of a client advisor.",
  },
  {
    title: "Returns & exchanges",
    body: "Thirty days to return or exchange, with free collection.",
  },
];
