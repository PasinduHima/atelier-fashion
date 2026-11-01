import Link from "next/link";
import { getCartCount } from "@/lib/cart";

const className = "type-eyebrow transition-opacity duration-(--duration-base) hover:opacity-60";

/** Header "Bag (n)" link; `count` is null while the live count streams in. */
export function BagLinkView({ count }: { count: number | null }) {
  if (count === null) {
    return (
      <Link href="/bag" className={className}>
        Bag
      </Link>
    );
  }
  return (
    // Visible "Bag (2)"; accessible name "Bag (2 items)", which contains the visible label.
    <Link href="/bag" className={className}>
      Bag ({count}
      <span className="sr-only"> {count === 1 ? "item" : "items"}</span>)
    </Link>
  );
}

/** Reads the viewer's bag count on the server. Render inside <Suspense>. */
export async function BagLink() {
  return <BagLinkView count={await getCartCount()} />;
}
