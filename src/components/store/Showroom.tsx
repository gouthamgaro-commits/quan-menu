import Link from "next/link";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import { cx } from "../ui/controls";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

/**
 * Prism's showroom: the store's featured pieces standing on podiums above a glowing grid floor
 * that runs toward the horizon, the middle one raised (`.showroom-*`, `.podium` and `.grid-floor`
 * in globals.css). Each piece leans toward the pointer (data-tilt, Tilt.tsx).
 */
export default function Showroom({ products, title = "The showroom" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 5);
  if (items.length < 3) return null;
  const middle = Math.floor(items.length / 2);

  return (
    <section aria-label={title} className="showroom relative mt-16 overflow-hidden pt-4 pb-16 md:mt-24 md:pb-24">
      <span aria-hidden className="grid-floor" />
      <div className="container-page relative">
        <SectionHeader eyebrow="On display" title={title} href="/shop" linkLabel="Shop everything" />
        <ul className={cx("grid grid-cols-2 items-end gap-x-4 gap-y-12 sm:grid-cols-3 md:gap-x-8", items.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
          {items.map((p, i) => (
            <li key={p.id} data-reveal className={cx("showroom-spot", i === middle && "is-center", i >= 4 && "hidden lg:block")}>
              <Link href={`/products/${p.slug}`} data-tilt="10" className="group block text-center">
                <span className="showroom-piece relative mx-auto block aspect-[4/5] w-[86%] overflow-hidden rounded-card bg-bone">
                  <CatalogImage src={p.image_url} alt={p.image_alt || p.title} fill sizes="(min-width: 1024px) 17vw, 42vw" className="object-cover transition duration-700 group-hover:scale-105" />
                </span>
                <span aria-hidden className="podium podium-sm">
                  <span className="podium-top" />
                  <span className="podium-body" />
                </span>
                <span className="mt-5 block truncate px-1 text-sm font-semibold">{p.title}</span>
                <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-1 justify-center" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
