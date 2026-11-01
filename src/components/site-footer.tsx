import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";

const columns = [
  {
    title: "Client services",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "Track an order", href: "/orders" },
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns & exchanges", href: "/help/returns" },
      { label: "FAQ", href: "/help" },
    ],
  },
  {
    title: "The house",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Craftsmanship", href: "/about/craft" },
      { label: "Sustainability", href: "/about/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Store services",
    links: [
      { label: "Store locator", href: "/stores" },
      { label: "Book an appointment", href: "/appointments" },
      { label: "Repairs & care", href: "/help/care" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="surface-dark bg-ink text-paper">
      <div className="container-site grid gap-12 py-16 lg:grid-cols-12 lg:gap-8 lg:py-24">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <h2 className="type-label">Sign up for updates</h2>
          <p className="type-body max-w-md text-subtle">
            Be the first to hear about new collections, private events and the stories behind them.
          </p>
          {/* Inverted field colors for the dark footer */}
          <div className="max-w-md [&_.btn-primary]:border-paper [&_.btn-primary]:bg-paper [&_.btn-primary]:text-ink [&_.field]:border-paper/30 [&_.field]:text-paper [&_.field:focus]:border-paper">
            <NewsletterForm />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-4">
              <h2 className="type-label">{column.title}</h2>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="type-meta link text-subtle hover:text-paper">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="container-site">
        <div className="flex flex-col gap-4 border-t border-paper/20 py-8 md:flex-row md:items-center md:justify-between">
          <p className="type-caption text-subtle">© Atelier. Sample storefront.</p>
          <div className="flex gap-6">
            <Link href="/legal/privacy" className="type-caption link text-subtle">
              Privacy
            </Link>
            <Link href="/legal/terms" className="type-caption link text-subtle">
              Terms
            </Link>
            <Link href="/legal/cookies" className="type-caption link text-subtle">
              Cookies
            </Link>
          </div>
        </div>
      </div>

      <p
        aria-hidden
        className="wordmark overflow-hidden pb-6 text-center text-[18vw] leading-none font-thin tracking-[0.15em]"
      >
        Atelier
      </p>
    </footer>
  );
}
