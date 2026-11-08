import Link from "next/link";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

const PLACES = ["1st", "2nd", "3rd", "4th", "5th"];

/**
 * Arcade's high scores: the store's best sellers ranked like an arcade's high-score table, in
 * pixel letters on a bordered board (`.scoreboard` in globals.css), the leader on a gold row.
 */
export default function Leaderboard({ products, title = "High scores" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 5);
  if (items.length < 3) return null;

  return (
    <section aria-label={title} className="container-page mt-16 md:mt-24">
      <SectionHeader eyebrow="Best sellers" title={title} href="/shop?sort=popular" />
      <ol className="scoreboard" data-reveal>
        {items.map((p, i) => (
          <li key={p.id}>
            <Link href={`/products/${p.slug}`} className="score-row group grid grid-cols-[3rem_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:gap-5 sm:px-5">
              <span className="font-pixel text-[13px] text-accent uppercase">{PLACES[i]}</span>
              <span className="relative block size-14 overflow-hidden rounded-[6px] bg-bone">
                <CatalogImage src={p.image_url} alt="" fill sizes="3.5rem" className="object-cover transition group-hover:scale-110" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-pixel text-[12px] uppercase">{p.title}</span>
                {p.brand_name && <span className="mt-0.5 block truncate text-[12px] text-taupe">{p.brand_name}</span>}
              </span>
              <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="justify-end font-pixel text-[12px]" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
