import type { Metadata } from "next";
import { ProductListing } from "@/components/product-listing";
import { getNewArrivals } from "@/lib/products";

/** Most products shown on the page; newest first. */
const LIMIT = 24;

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The latest ready-to-wear, bags, shoes and accessories to arrive at Atelier.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(LIMIT);

  return (
    <ProductListing
      title="New arrivals"
      intro="The latest pieces from the atelier, newest first."
      products={products}
    />
  );
}
