import Link from "next/link";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import { buttonClass, cx } from "../ui/controls";
import Price from "./Price";

// Where the three photographs sit on the page on wide screens, and how they lean.
const SPOTS = ["md:top-0 md:left-[2%] md:w-[52%] -rotate-3", "md:top-[12%] md:right-[2%] md:w-[44%] rotate-[4deg]", "md:bottom-0 md:left-[24%] md:w-[42%] -rotate-1"];

/**
 * The scrapbook: the newest pieces cut out and taped onto a page, each with a handwritten caption
 * and its price, beside a typed price list of everything on the page.
 */
export default function Scrapbook({ products, title = "This week's crushes" }: { products: ProductCard[]; title?: string }) {
  const items = products.slice(0, 6);
  if (items.length < 3) return null;

  return (
    <section aria-label={title} className="container-page mt-16 md:mt-24">
      <div className="paper-page grid gap-10 p-5 md:p-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <ul className="grid grid-cols-3 gap-3 md:relative md:block md:min-h-[34rem]">
          {items.slice(0, 3).map((p, i) => (
            <li key={p.id} className={cx("md:absolute", SPOTS[i])} data-reveal>
              <Link href={`/products/${p.slug}`} className="polaroid group block transition-transform duration-300 hover:-translate-y-1 hover:rotate-0">
                <span className="relative block aspect-[4/5] overflow-hidden bg-bone">
                  <CatalogImage src={p.image_url} alt="" fill sizes="(min-width: 768px) 22vw, 30vw" className="object-cover" />
                </span>
                <span className="mt-2 block truncate font-hand text-lg leading-none md:text-2xl">{p.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="self-center">
          <p className="inline-block -rotate-2 font-hand text-2xl text-accent">the price list ↓</p>
          <h2 className="ransom mt-3 font-serif text-[clamp(2.2rem,4.5vw,3.5rem)] leading-[1.2]">
            {title.split(/\s+/).map((w, i) => (
              <span key={i} className="ransom-word">{w}</span>
            ))}
          </h2>
          <ol className="mt-8 font-mono text-[13px]">
            {items.map((p, i) => (
              <li key={p.id} className="border-b border-dashed border-taupe/40">
                <Link href={`/products/${p.slug}`} className="flex items-baseline gap-3 py-2.5 transition-colors hover:text-accent">
                  <span className="text-taupe">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 truncate">{p.title}</span>
                  <span aria-hidden className="min-w-6 flex-1 border-b border-dotted border-current opacity-40" />
                  <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} showPercent={false} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ol>
          <Link href="/shop?sort=newest" className={buttonClass("secondary", "lg", "mt-8")}>See everything new</Link>
        </div>
      </div>
    </section>
  );
}
