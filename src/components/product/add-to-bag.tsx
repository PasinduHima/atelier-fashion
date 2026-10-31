"use client";

import { useEffect, useState } from "react";

type AddToBagProps = {
  productName: string;
  soldOut: boolean;
};

/**
 * Primary purchase button. There is no cart yet, so this only confirms the
 * click; wire it to a server action once the bag exists.
 */
export function AddToBag({ productName, soldOut }: AddToBagProps) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2500);
    return () => clearTimeout(timer);
  }, [added]);

  if (soldOut) {
    return (
      <button type="button" className="btn btn-primary w-full tracking-[0.14em]" disabled>
        Sold out
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary w-full tracking-[0.14em]"
        onClick={() => setAdded(true)}
      >
        {added ? "Added to bag" : "Add to bag"}
      </button>
      <p aria-live="polite" className="sr-only">
        {added ? `${productName} added to bag` : ""}
      </p>
    </>
  );
}
