import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/home/section-heading";
import { categoryHref } from "@/lib/catalog";
import { campaign, services, story } from "@/lib/content";
import { getCategories } from "@/lib/products";

/** Full-bleed campaign band with copy over the image. */
export function Campaign() {
  return (
    <section aria-labelledby="campaign-title" className="media-cover scrim relative h-[85svh] min-h-[32rem] bg-ink">
      <Image src={campaign.image} alt={campaign.alt} fill sizes="100vw" className="object-[50%_30%]" />
      <div className="absolute inset-0 z-10 flex items-end text-paper">
        <div className="container-site flex flex-col items-start gap-4 pb-12 md:pb-16 lg:pb-20">
          <p className="type-label">{campaign.kicker}</p>
          <h2 id="campaign-title" className="type-display">
            {campaign.title}
          </h2>
          <p className="type-body max-w-md">{campaign.body}</p>
          <Link href={campaign.cta.href} className="btn btn-light mt-4">
            {campaign.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Shop-by-category tiles: a scroll rail on small screens, a five-up row on desktop. */
export async function CategoryRail() {
  const categories = await getCategories();

  return (
    <section aria-labelledby="categories" className="section">
      <SectionHeading id="categories" kicker="Explore" title="Shop by category" />
      <div className="container-site">
        <ul className="-mx-gutter flex snap-x snap-mandatory gap-4 overflow-x-auto px-gutter [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {categories.map((category) => (
            <li key={category.slug} className="w-[60%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
              <Link href={categoryHref(category.slug)} className="group flex flex-col gap-4">
                <div className="media-cover relative aspect-portrait bg-surface-2">
                  <Image
                    src={category.image}
                    alt={category.alt}
                    fill
                    sizes="(width >= 64rem) 20vw, (width >= 40rem) 40vw, 60vw"
                    className="transition-transform duration-(--duration-slow) ease-luxe group-hover:scale-[1.03]"
                  />
                </div>
                <span className="type-label link self-start">{category.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Image + text split telling the brand story. */
export function Story() {
  return (
    <section aria-labelledby="story-title" className="split bg-surface">
      <div className="media-cover relative aspect-editorial md:aspect-auto md:min-h-[40rem]">
        <Image src={story.image} alt={story.alt} fill sizes="(width >= 48rem) 50vw, 100vw" />
      </div>
      <div className="flex items-center">
        <div className="container-prose flex flex-col items-start gap-5 py-16 md:px-12 lg:px-20">
          <p className="type-label text-muted">{story.kicker}</p>
          <h2 id="story-title" className="type-display">
            {story.title}
          </h2>
          <p className="type-body text-muted">{story.body}</p>
          <Link href={story.cta.href} className="btn btn-secondary mt-4">
            {story.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Three client-service promises separated by hairlines. */
export function Services() {
  return (
    <section aria-label="Client services" className="hairline-t">
      <ul className="container-site grid md:grid-cols-3">
        {services.map((service, index) => (
          <li
            key={service.title}
            className={`flex flex-col gap-3 py-10 text-center md:px-8 md:py-14 ${
              index > 0 ? "border-t border-line md:border-t-0 md:border-l" : ""
            }`}
          >
            <h2 className="type-label">{service.title}</h2>
            <p className="type-meta mx-auto max-w-xs text-muted">{service.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
