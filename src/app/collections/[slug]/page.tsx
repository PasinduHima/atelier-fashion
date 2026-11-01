import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductListing, ProductListingSkeleton } from "@/components/product-listing";
import {
  getCategories,
  getCategoryBySlug,
  getCollectionBySlug,
  getCollections,
  getProductsByCategory,
  getProductsByCollection,
} from "@/lib/products";

/**
 * /collections/[slug] serves both merchandising collections (women, gifts,
 * new-in…) and product categories (bags, shoes…). A collection wins if a slug
 * exists as both.
 */
async function resolveListing(slug: string) {
  const collection = await getCollectionBySlug(slug);
  if (collection) {
    return {
      title: collection.name,
      description: collection.description,
      intro: collection.description,
      getProducts: () => getProductsByCollection(slug),
    };
  }
  const category = await getCategoryBySlug(slug);
  if (category) {
    return {
      title: category.name,
      description: `Shop ${category.name.toLowerCase()} at Atelier.`,
      intro: undefined,
      getProducts: () => getProductsByCategory(slug),
    };
  }
  return null;
}

/** Prerender every collection and category. Cache Components needs at least one param. */
export async function generateStaticParams() {
  const [collections, categories] = await Promise.all([getCollections(), getCategories()]);
  const slugs = new Set([...collections, ...categories].map((item) => item.slug));
  if (slugs.size === 0) {
    throw new Error("No collections or categories in the database. Run `npm run db:seed` before building.");
  }
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await resolveListing(slug);
  if (!listing) return {};
  return { title: listing.title, description: listing.description };
}

/**
 * The page shell renders immediately; params are read inside the Suspense
 * boundary so Cache Components can serve the skeleton for unlisted slugs.
 */
export default function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <CollectionView params={params} />
    </Suspense>
  );
}

async function CollectionView({ params }: Pick<PageProps<"/collections/[slug]">, "params">) {
  const { slug } = await params;
  const listing = await resolveListing(slug);
  if (!listing) notFound();

  const products = await listing.getProducts();
  return <ProductListing title={listing.title} intro={listing.intro} products={products} />;
}
