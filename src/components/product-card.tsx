import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalog";

type ProductCardProps = {
  product: Product;
  /** Responsive `sizes` hint for the image; defaults to the 2/3/4-column grid. */
  sizes?: string;
  priority?: boolean;
};

export function ProductCard({
  product,
  sizes = "(width >= 64rem) 25vw, (width >= 48rem) 33vw, 50vw",
  priority = false,
}: ProductCardProps) {
  const soldOut = product.stock <= 0;
  const badge = soldOut ? "Sold out" : product.badge;

  return (
    <Link href={`/products/${product.slug}`} className="group block bg-paper">
      <div className="media-product">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          // Sample photos are full-bleed shots, not cut-outs, so crop rather than contain.
          style={{ objectFit: "cover" }}
        />
        {badge ? (
          <span className="type-caption absolute top-3 left-3 uppercase md:top-4 md:left-4">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-3 pt-3 pb-6 md:px-4 md:pt-4 md:pb-8">
        <h3 className="type-meta">{product.name}</h3>
        <p className="type-meta text-muted">
          {formatPrice(product.priceCents)}
          {soldOut ? " · Sold out" : null}
        </p>
      </div>
    </Link>
  );
}
