import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/home/section-heading";
import { getGiftEdit, getNewArrivals } from "@/lib/products";

/** Edge-to-edge product grid: 2 / 3 / 4 columns with 1px hairline gaps. */
export async function NewArrivals() {
  const newArrivals = await getNewArrivals(8);

  return (
    <section aria-labelledby="new-arrivals" className="section">
      <SectionHeading
        id="new-arrivals"
        kicker="Just landed"
        title="New arrivals"
        link={{ label: "View all", href: "/collections/new-in" }}
      />
      {/* 8 products fill 2- and 4-column rows; at 3 columns show 6 so no row is left ragged. */}
      <div className="product-grid bg-line hairline-t hairline-b md:max-lg:[&>*:nth-child(n+7)]:hidden">
        {newArrivals.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

/** Horizontally scrolling rail of products (snap scrolling on touch). */
export async function GiftEdit() {
  const giftEdit = await getGiftEdit();

  return (
    <section aria-labelledby="gift-edit" className="section">
      <SectionHeading
        id="gift-edit"
        kicker="Gifting"
        title="The gift edit"
        link={{ label: "Shop gifts", href: "/collections/gifts" }}
      />
      <div className="rail bg-line hairline-t hairline-b">
        {giftEdit.map((product) => (
          <ProductCard
            key={product.slug}
            product={product}
            sizes="(width >= 64rem) 25vw, (width >= 48rem) 33vw, 70vw"
          />
        ))}
      </div>
    </section>
  );
}
