import Image from "next/image";
import Link from "next/link";
import { hero } from "@/lib/content";

/**
 * Black-and-white campaign image that fills the rest of the first screen
 * (below the header and the two 2rem bars above it: demo notice and
 * announcement), with a serif headline and two calls to action anchored
 * bottom-left.
 */
export function Hero() {
  const [primary, secondary] = hero.ctas;

  return (
    <section
      aria-labelledby="hero-title"
      className="media-cover surface-dark relative h-[calc(100svh-var(--header-h)-4rem)] min-h-[36rem] bg-ink"
    >
      <Image
        src={hero.image}
        alt={hero.alt}
        fill
        priority
        sizes="100vw"
        className="object-[50%_20%] grayscale"
      />
      {/* Left-weighted scrim keeps the white copy legible over the photo. */}
      <div aria-hidden className="absolute inset-0 bg-linear-to-r from-black/45 via-black/15 to-transparent" />

      <div className="absolute inset-0 z-10 flex items-end pb-12 text-paper md:pb-16 lg:pb-20">
        <div className="container-site">
          <div className="max-w-xl">
            <p className="type-eyebrow">{hero.kicker}</p>
            <h1
              id="hero-title"
              className="type-hero mt-4"
            >
              {hero.title}
            </h1>
            <p className="type-lede mt-6 max-w-sm">
              {hero.body}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primary.href} className="btn btn-light min-w-56">
                {primary.label}
              </Link>
              <Link href={secondary.href} className="btn btn-outline-light min-w-48">
                {secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
