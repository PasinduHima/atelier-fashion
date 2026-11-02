import Link from "next/link";
import { Suspense } from "react";
import { BagLink, BagLinkView } from "@/components/bag-link";
import { MobileMenu } from "@/components/mobile-menu";

const navigation = [
  { label: "New In", href: "/collections/new-in" },
  { label: "Women", href: "/collections/women" },
  { label: "Men", href: "/collections/men" },
  { label: "Leather Goods", href: "/collections/leather-goods" },
  { label: "Gifts", href: "/collections/gifts" },
  { label: "Stories", href: "/stories" },
];

/**
 * Announcement bar plus a sticky white header: shop links on the left, the
 * serif wordmark centred, and Search / Account / Bag on the right. Below
 * 1440px the shop links move into a slide-out drawer (MobileMenu, the only
 * client component here).
 */
export function SiteHeader() {
  return (
    <>
      <div className="hairline-b flex h-8 items-center justify-center bg-paper px-gutter text-center text-ink">
        <p className="type-eyebrow truncate">Complimentary delivery on orders over $500</p>
      </div>

      <header className="hairline-b sticky top-0 z-40 h-header bg-paper text-ink">
        <div className="container-site grid h-full grid-cols-[1fr_auto_1fr] items-center gap-6">
          {/* Left: shop links on desktop, menu toggle below */}
          <div className="flex items-center">
            <nav aria-label="Shop" className="hidden items-center gap-6 xl:flex 2xl:gap-8">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="type-eyebrow transition-opacity duration-(--duration-base) hover:opacity-60">
                  {item.label}
                </Link>
              ))}
            </nav>
            <MobileMenu navigation={navigation} />
          </div>

          <Link href="/" className="wordmark" aria-label="Atelier home">
            Atelier
          </Link>

          {/* Right: utility links */}
          <nav aria-label="Account" className="flex items-center justify-end gap-6">
            <button type="button" className="type-eyebrow hidden cursor-pointer transition-opacity duration-(--duration-base) hover:opacity-60 md:inline">
              Search
            </button>
            <Link href="/account" className="type-eyebrow hidden transition-opacity duration-(--duration-base) hover:opacity-60 md:inline">
              Account
            </Link>
            <Suspense fallback={<BagLinkView count={null} />}>
              <BagLink />
            </Suspense>
          </nav>
        </div>
      </header>
    </>
  );
}
