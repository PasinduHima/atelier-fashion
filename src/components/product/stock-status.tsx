import type { StockState } from "@/lib/catalog";

const dotClass: Record<StockState["status"], string> = {
  "in-stock": "bg-success",
  "low-stock": "bg-danger",
  "sold-out": "border border-muted bg-transparent",
};

const textClass: Record<StockState["status"], string> = {
  "in-stock": "text-ink",
  "low-stock": "text-danger",
  "sold-out": "text-muted",
};

/** Small dot plus label: "In stock", "Only 2 left" or "Sold out". */
export function StockStatus({ state }: { state: StockState }) {
  return (
    <p className={`type-meta flex items-center gap-2 ${textClass[state.status]}`}>
      <span aria-hidden className={`size-1.5 rounded-pill ${dotClass[state.status]}`} />
      {state.label}
    </p>
  );
}
