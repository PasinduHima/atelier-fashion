import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SectionHeading } from "@/components/home/section-heading";
import { AddToBag } from "@/components/product/add-to-bag";
import { StockStatus } from "@/components/product/stock-status";
import { ProductCard } from "@/components/product-card";
import { categoryHref, formatPrice, getStockState } from "@/lib/catalog";
import { services } from "@/lib/content";
import { getAllProductSlugs, getProductBySlug, getRelatedProducts } from "@/lib/products";

/** Prerender every active product. Cache Components needs at least one param. */
export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  if (slugs.length === 0) {
    throw new Error("No products in the database. Run `npm run db:seed` before building.");
  }
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.image] },
  };
}

/**
 * The page shell renders immediately; params are read inside the Suspense
 * boundary so Cache Components can serve the skeleton for unlisted slugs.
 */
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductView params={params} />
    </Suspense>
  );
}

async function ProductView({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const stock = getStockState(product.stock);
  const related = await getRelatedProducts(product.id, product.category.slug);
  const [delivery, , returns] = services;

  return (
    <>
      <article className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Imagery */}
        <div className="media-product aspect-editorial bg-surface lg:aspect-auto lg:h-[calc(100svh-var(--header-h))] lg:min-h-[40rem]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            sizes="(width >= 64rem) 58vw, 100vw"
            style={{ objectFit: "cover" }}
          />
          {product.badge && stock.status !== "sold-out" ? (
            <span className="type-eyebrow absolute top-4 left-4 bg-paper px-2 py-1 md:top-6 md:left-6">
              {product.badge}
            </span>
          ) : null}
        </div>

        {/* Information */}
        <div className="px-gutter py-10 md:py-14 lg:py-0">
          <div className="mx-auto flex max-w-md flex-col lg:sticky lg:top-header lg:min-h-[calc(100svh-var(--header-h))] lg:justify-center lg:py-16">
            <nav aria-label="Breadcrumb">
              <ol className="type-eyebrow flex items-center gap-2 text-muted">
                <li>
                  <Link href="/" className="transition-colors duration-(--duration-base) hover:text-ink">
                    Home
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={categoryHref(product.category.slug)}
                    className="transition-colors duration-(--duration-base) hover:text-ink"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </ol>
            </nav>

            <h1 className="mt-6 font-serif text-4xl leading-[1.05] font-normal tracking-[-0.01em] md:text-5xl">
              {product.name}
            </h1>

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="type-body">{formatPrice(product.priceCents)}</p>
              <StockStatus state={stock} />
            </div>

            <div className="mt-8">
              <AddToBag productName={product.name} soldOut={stock.status === "sold-out"} />
            </div>

            <p className="mt-8 font-serif text-lg leading-relaxed tracking-normal">{product.description}</p>

            <div className="hairline-b mt-10">
              <Disclosure title="Details & care" open>
                <ul className="flex flex-col gap-2">
                  {product.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </Disclosure>
              <Disclosure title="Delivery & returns">
                <p>{delivery.body}</p>
                <p className="mt-2">{returns.body}</p>
              </Disclosure>
            </div>
          </div>
        </div>
      </article>

      <section aria-labelledby="related-title" className="section hairline-t">
        <SectionHeading id="related-title" kicker="Complete the look" title="You may also like" />
        <div className="product-grid bg-line hairline-t hairline-b md:max-lg:[&>*:nth-child(n+4)]:hidden">
          {related.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </div>
      </section>
    </>
  );
}

/** Accordion row built on <details>, so it works without JavaScript. */
function Disclosure({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group hairline-t">
      <summary className="type-eyebrow flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="text-base leading-none font-light transition-transform duration-(--duration-base) group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="type-meta pb-6 text-muted">{children}</div>
    </details>
  );
}

function ProductSkeleton() {
  return (
    <div aria-busy className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="aspect-editorial animate-pulse bg-surface-2 lg:aspect-auto lg:h-[calc(100svh-var(--header-h))] lg:min-h-[40rem]" />
      <div className="px-gutter py-10 lg:py-0">
        <div className="mx-auto flex max-w-md flex-col gap-6 lg:min-h-[calc(100svh-var(--header-h))] lg:justify-center">
          <div className="h-3 w-32 bg-surface-2" />
          <div className="h-12 w-4/5 bg-surface-2" />
          <div className="h-4 w-24 bg-surface-2" />
          <div className="h-12 w-full bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
