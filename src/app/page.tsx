import { CollectionSplit } from "@/components/home/collection-split";
import { Campaign, CategoryRail, Services, Story } from "@/components/home/editorial";
import { Hero } from "@/components/home/hero";
import { GiftEdit, NewArrivals } from "@/components/home/product-sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <NewArrivals />
      <CollectionSplit />
      <CategoryRail />
      <Campaign />
      <GiftEdit />
      <Story />
      <Services />
    </>
  );
}
