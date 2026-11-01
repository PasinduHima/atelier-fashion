import Image from "next/image";
import Link from "next/link";
import { featuredCollections } from "@/lib/content";

/**
 * Two portrait images side by side (stacked on mobile), each linking to a collection.
 * The tiles run edge to edge, so an outer focus ring would fall on white or under the
 * next tile. The ring is drawn inside instead; `isolate` plus `-z-10` on the image keep
 * it painted above the photo.
 */
export function CollectionSplit() {
  return (
    <section aria-label="Featured collections" className="split gap-px">
      {featuredCollections.map((collection) => (
        <Link
          key={collection.slug}
          href={`/collections/${collection.slug}`}
          className="group media-cover scrim surface-dark relative isolate block aspect-portrait bg-surface-2 focus-visible:-outline-offset-8 md:aspect-editorial lg:aspect-auto lg:h-[min(95svh,64rem)]"
        >
          <Image
            src={collection.image}
            alt={collection.alt}
            fill
            sizes="(width >= 48rem) 50vw, 100vw"
            className="-z-10 transition-transform duration-(--duration-slow) ease-luxe group-hover:scale-[1.02]"
          />
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 pb-10 text-center text-paper md:pb-14">
            <p className="type-label">{collection.kicker}</p>
            <h2 className="type-heading">{collection.title}</h2>
            <span className="type-label link-underline mt-2">Shop now</span>
          </div>
        </Link>
      ))}
    </section>
  );
}
