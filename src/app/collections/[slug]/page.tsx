import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductListing, ProductListingSkeleton } from "@/components/product-listing";
import { getCategories, getCategoryBySlug, getProductsByCategory } from "@/lib/products";

/** Prerender every category. Cache Components needs at least one param. */
export async function generateStaticParams() {
  const categories = await getCategories();
  if (categories.length === 0) {
    throw new Error("No categories in the database. Run `npm run db:seed` before building.");
  }
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `Shop ${category.name.toLowerCase()} at Atelier.`,
  };
}

/**
 * The page shell renders immediately; params are read inside the Suspense
 * boundary so Cache Components can serve the skeleton for unlisted slugs.
 */
export default function CategoryPage({ params }: PageProps<"/collections/[slug]">) {
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <CategoryView params={params} />
    </Suspense>
  );
}

async function CategoryView({ params }: Pick<PageProps<"/collections/[slug]">, "params">) {
  const { slug } = await params;
  const [category, products] = await Promise.all([getCategoryBySlug(slug), getProductsByCategory(slug)]);
  if (!category) notFound();

  return <ProductListing title={category.name} products={products} />;
}
