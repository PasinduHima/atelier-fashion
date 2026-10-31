import Link from "next/link";

type SectionHeadingProps = {
  id: string;
  kicker?: string;
  title: string;
  link?: { label: string; href: string };
};

/** Centered section title with an optional "view all" link underneath. */
export function SectionHeading({ id, kicker, title, link }: SectionHeadingProps) {
  return (
    <div className="container-site mb-10 flex flex-col items-center gap-3 text-center md:mb-14">
      {kicker ? <p className="type-label text-muted">{kicker}</p> : null}
      <h2 id={id} className="type-heading">
        {title}
      </h2>
      {link ? (
        <Link href={link.href} className="type-label link-underline mt-1">
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}
