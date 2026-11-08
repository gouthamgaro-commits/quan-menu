import Link from "next/link";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import Price from "./Price";
import { SectionHeader } from "./SectionHeader";

/**
 * Liquid's pool: the store's pieces standing in a pool of liquid chrome, each reflected in its
 * surface with a ripple spreading from its foot (`.pool-*` in globals.css). Browsers that can't
 * draw reflections show the pieces on the pool without them.
 */
export default function Pool({ products, title = "Make a splash" }: { products: ProductCard[]; title?: string }) {
  const items = products.filter((p) => p.image_url).slice(0, 4);
  if (items.length < 3) return null;

  return (
    <section aria-label={title} className="pool relative mt-16 overflow-hidden py-14 md:mt-24 md:py-20">
      <span aria-hidden className="pool-surface" />
      <div className="container-page relative">
        <SectionHeader eyebrow="In the pool" title={title} href="/shop" />
        <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-8">
          {items.map((p) => (
            <li key={p.id} data-reveal>
              <Link href={`/products/${p.slug}`} className="group block text-center">
                <span className="pool-spot relative mx-auto block w-[86%]">
                  <span className="relative block">
                    <span className="pool-piece relative block aspect-[4/5] overflow-hidden rounded-[22px] bg-bone">
                      <CatalogImage src={p.image_url} alt={p.image_alt || p.title} fill sizes="(min-width: 768px) 20vw, 40vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    </span>
                    <span aria-hidden className="pool-ripple" />
                  </span>
                </span>
                <span className="mt-4 block truncate text-sm font-semibold">{p.title}</span>
                <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-0.5 justify-center" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
