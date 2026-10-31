"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

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
 * 1440px the shop links move into a slide-out drawer.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const bagCount = 0;

  // Lock page scroll and allow Escape to close while the menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <div className="hairline-b flex h-8 items-center justify-center bg-paper px-gutter text-center text-ink">
        <p className="type-eyebrow truncate">Complimentary delivery and returns</p>
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
            <button
              type="button"
              className="btn-icon -ml-3 xl:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>
          </div>

          <Link href="/" className="wordmark text-2xl md:text-[1.75rem]" aria-label="Atelier home">
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
            <Link
              href="/bag"
              className="type-eyebrow transition-opacity duration-(--duration-base) hover:opacity-60"
              aria-label={`Bag, ${bagCount} items`}
            >
              Bag ({bagCount})
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile / tablet menu drawer */}
      <div
        className={`fixed inset-0 z-50 bg-scrim transition-opacity duration-(--duration-base) ease-luxe xl:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden
      />
      <aside
        id="site-menu"
        aria-label="Main menu"
        inert={!menuOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-full flex-col overflow-y-auto bg-paper transition-transform duration-(--duration-slow) ease-luxe md:w-[28rem] xl:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hairline-b flex h-header items-center px-gutter">
          <button type="button" className="btn-icon -ml-3" aria-label="Close menu" onClick={close}>
            <CloseIcon />
          </button>
        </div>
        <nav aria-label="Shop" className="flex flex-col px-gutter py-8">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={close} className="type-title link self-start py-3">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hairline-t mt-auto flex flex-col gap-4 px-gutter py-8">
          <Link href="/account" className="type-eyebrow" onClick={close}>
            My account
          </Link>
          <button type="button" className="type-eyebrow self-start">
            Search
          </button>
        </div>
      </aside>
    </>
  );
}
