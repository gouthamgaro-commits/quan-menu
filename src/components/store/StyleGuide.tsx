import Link from "next/link";
import type { ProductCard } from "@/lib/types";
import CatalogImage from "../ui/CatalogImage";
import { cx } from "../ui/controls";
import { ArrowRight } from "../ui/icons";
import Price from "./Price";
import Rise from "./Rise";

export interface StyleChapter {
  slug: string;
  title: string;
  text: string | null;
  image: string | null;
  products: ProductCard[];
}

/**
 * The style guide: the store's collections as the numbered chapters of a guide, each a
 * full-length look photographed beside its title, a few words and the pieces to shop it, the
 * looks alternating sides down the page. Contents at the top jump to each chapter. It takes the
 * store's fonts and colours, so it sits in any design; Library dresses it as a lookbook page.
 */
export default function StyleGuide({ chapters, eyebrow, title, intro }: { chapters: StyleChapter[]; eyebrow: string; title: string; intro?: string }) {
  if (chapters.length < 2) return null;
  return (
    <section aria-labelledby="style-guide-title" className="styleguide container-page mt-20 md:mt-32">
      <div className="sg-head grid gap-8 md:grid-cols-12 md:items-end" data-reveal>
        <div className="md:col-span-7">
          <p className="sg-eyebrow label-caps text-accent">{eyebrow}</p>
          <h2 id="style-guide-title" data-rise className="sg-heading mt-3 font-serif text-4xl leading-[1.02] md:text-6xl">
            <span><Rise text={title} /></span>
          </h2>
          {intro && <p className="sg-intro mt-5 max-w-xl text-sm leading-relaxed text-taupe md:text-base">{intro}</p>}
        </div>
        <nav aria-label={`${title}: chapters`} className="sg-contents md:col-span-4 md:col-start-9">
          <ol className="grid gap-1 border-t border-line pt-3">
            {chapters.map((c, i) => (
              <li key={c.slug}>
                <a href={`#style-${c.slug}`} className="sg-contents-link group flex items-baseline gap-3 border-b border-line py-2 text-sm">
                  <span className="sg-contents-num w-6 shrink-0 font-serif text-taupe tabular-nums">{i + 1}.</span>
                  <span className="flex-1 group-hover:underline">{c.title}</span>
                  <ArrowRight size={14} className="shrink-0 text-taupe transition group-hover:translate-x-0.5" />
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <ol className="sg-chapters mt-14 grid gap-20 md:mt-20 md:gap-28">
        {chapters.map((c, i) => {
          const flip = i % 2 === 1;
          return (
            <li key={c.slug} id={`style-${c.slug}`} className={cx("sg-chapter scroll-mt-24 md:grid md:grid-cols-12 md:items-center md:gap-8", flip && "sg-flip")}>
              {/* The photograph repeats the chapter's own link for the mouse; keyboards use the one below. */}
              <Link
                href={`/collections/${c.slug}`}
                tabIndex={-1}
                aria-hidden
                className={cx("sg-look group relative block md:row-start-1", flip ? "md:col-span-5 md:col-start-8" : "md:col-span-5 md:col-start-1")}
              >
                <span className="sg-page block">
                  <span className="block aspect-[4/5] md:aspect-[3/4]" data-reveal="wipe">
                    <span className="sg-photo relative block size-full overflow-hidden rounded-img bg-bone">
                      {c.image && (
                        <CatalogImage src={c.image} alt="" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover transition duration-[1.4s] ease-out group-hover:scale-[1.03]" />
                      )}
                    </span>
                  </span>
                  <span className="sg-caption mt-3 block text-[10px] tracking-[0.28em] text-taupe uppercase">
                    Look {String(i + 1).padStart(2, "0")} · {c.title}
                  </span>
                </span>
              </Link>
              <div className={cx("sg-body mt-8 md:row-start-1 md:mt-0", flip ? "md:col-span-6 md:col-start-1" : "md:col-span-6 md:col-start-7")}>
                <p className="sg-num font-serif text-6xl leading-none text-accent md:text-8xl" aria-hidden data-reveal>
                  {i + 1}.
                </p>
                <h3 className="sg-title mt-3 font-serif text-4xl leading-[1.02] md:text-6xl" data-reveal>
                  <span className="sr-only">Chapter {i + 1}: </span>
                  {c.title}
                </h3>
                {c.text && <p className="sg-text mt-5 max-w-md text-sm leading-relaxed text-taupe md:text-base" data-reveal>{c.text}</p>}
                {c.products.length > 0 && (
                  <div className="mt-8" data-reveal>
                    <p className="sg-label text-[10px] tracking-[0.28em] text-taupe uppercase">Shop the look</p>
                    <ul className="sg-pieces mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {c.products.slice(0, 4).map((p) => (
                        <li key={p.id}>
                          <Link href={`/products/${p.slug}`} className="sg-piece group block">
                            <span className="relative block aspect-[4/5] overflow-hidden rounded-img bg-bone">
                              <CatalogImage src={p.image_url} alt={p.image_alt || p.title} fill sizes="(min-width: 768px) 10vw, 45vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />
                            </span>
                            <span className="sg-piece-name mt-2 block text-xs leading-snug group-hover:underline">{p.title}</span>
                            <Price price={p.price} compareAt={p.compare_at_price} maxPrice={p.max_price} className="mt-0.5 text-xs" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  href={`/collections/${c.slug}`}
                  className="sg-cta mt-8 inline-flex items-center gap-2 border-b border-ink pb-0.5 text-[12px] tracking-[0.18em] uppercase"
                  data-reveal
                >
                  Shop {c.title} <ArrowRight size={14} />
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
