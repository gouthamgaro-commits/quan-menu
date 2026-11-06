import Link from "next/link";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import { buttonClass, cx } from "../ui/controls";
import Price from "./Price";

const LOW = 5;
const mono = "font-mono uppercase tracking-[0.06em]";

/**
 * The drop: the newest pieces laid out like a release sheet, numbered 001 onwards in a ruled grid,
 * with when they landed, how many there are and how many are running low, and each piece's stock
 * on its own row.
 */
export default function Drop({ products, title = "The latest drop" }: { products: ProductCard[]; title?: string }) {
  const items = products.slice(0, 8);
  if (items.length < 3) return null;
  const landed = Math.max(...items.map((p) => new Date(p.published_at).getTime()));
  const days = Math.max(0, Math.floor((Date.now() - landed) / 86_400_000));
  const when = days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
  const low = items.filter((p) => p.available_stock > 0 && p.available_stock <= LOW).length;

  return (
    <section aria-label={title} className="container-page mt-14 md:mt-20">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-5" data-reveal>
        <div>
          <p className={cx("flex items-center gap-2 text-[11px] text-accent", mono)}>
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent" /> Live now
          </p>
          <h2 className="mt-2 font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-none uppercase">{title}</h2>
        </div>
        <dl className={cx("grid grid-cols-3 gap-6 text-[11px] sm:gap-10", mono)}>
          <div>
            <dt className="text-taupe">Pieces</dt>
            <dd className="mt-1 text-lg">{String(items.length).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt className="text-taupe">Landed</dt>
            <dd className="mt-1 text-lg">{when}</dd>
          </div>
          <div>
            <dt className="text-taupe">Running low</dt>
            <dd className="mt-1 text-lg">{String(low).padStart(2, "0")}</dd>
          </div>
        </dl>
      </div>
      <ol className="grid grid-cols-2 border-l border-ink md:grid-cols-4">
        {items.map((p, i) => {
          const stock = p.available_stock <= 0 ? "Sold out" : p.available_stock <= LOW ? `${p.available_stock} left` : "In stock";
          return (
            <li key={p.id} className="border-r border-b border-ink" data-reveal>
              <Link href={`/products/${p.slug}`} className="group block p-3 transition-colors hover:bg-bone md:p-4">
                <span className={cx("flex justify-between gap-2 text-[10px]", mono)}>
                  <span>{String(i + 1).padStart(3, "0")}</span>
                  <span className={p.available_stock <= LOW ? "text-sale" : "text-taupe"}>{stock}</span>
                </span>
                <span className="relative mt-3 block aspect-[4/5] overflow-hidden bg-bone">
                  <CatalogImage
                    src={p.image_url}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 24vw, 48vw"
                    className={cx("object-cover transition duration-500 group-hover:scale-[1.03]", p.available_stock <= 0 && "opacity-60 grayscale")}
                  />
                </span>
                <span className={cx("mt-3 block truncate text-[12px]", mono)}>{p.title}</span>
                <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="mt-1 font-mono text-[12px]" />
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex justify-end">
        <Link href="/shop?sort=newest" className={buttonClass("primary", "lg", mono)}>Shop the drop</Link>
      </div>
    </section>
  );
}
