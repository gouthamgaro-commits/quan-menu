import Link from "next/link";
import type { Brand, Collection } from "@/lib/catalog";
import { buttonClass } from "../ui/controls";

/**
 * The lineup (Festival): the store's featured collections billed like the acts on a festival
 * poster, the first as the headliner, the next three in big type and the rest below them, with
 * the featured brands as the supporting acts. Every name is a way into the shop.
 */
export default function Lineup({
  storeName,
  collections,
  brands,
}: {
  storeName: string;
  collections: Pick<Collection, "slug" | "title">[];
  brands: Pick<Brand, "slug" | "name">[];
}) {
  if (collections.length < 2) return null;
  const [headliner, ...rest] = collections;
  const tiers = [rest.slice(0, 3), rest.slice(3, 9)].filter((t) => t.length);
  return (
    <section aria-labelledby="lineup-title" className="container-page mt-16 md:mt-24">
      <div className="fest-lineup relative overflow-hidden rounded-[28px] px-5 py-12 text-center sm:px-10 md:py-16" data-reveal>
        <span aria-hidden className="fest-confetti" />
        <p className="relative text-[11px] font-bold tracking-[0.32em] uppercase">{storeName} presents</p>
        <h2 id="lineup-title" className="relative mt-3 font-serif text-2xl uppercase md:text-3xl">The lineup</h2>
        <ul className="relative mt-8 grid gap-6">
          <li>
            <Link href={`/collections/${headliner.slug}`} className="fest-act fest-headliner font-serif text-[clamp(2.3rem,7.5vw,5.5rem)] leading-[0.95] break-words uppercase">
              {headliner.title}
            </Link>
          </li>
          {tiers.map((tier, t) => (
            <li key={t}>
              <ul className="flex flex-col items-center gap-y-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 md:gap-x-6">
                {tier.map((c, i) => (
                  <li key={c.slug} className="flex items-center gap-x-4 md:gap-x-6">
                    {i > 0 && <span aria-hidden className="hidden text-accent sm:inline">★</span>}
                    <Link
                      href={`/collections/${c.slug}`}
                      className={t === 0 ? "fest-act font-serif text-[clamp(1.35rem,3.4vw,2.5rem)] leading-none uppercase" : "fest-act text-base font-bold tracking-[0.12em] uppercase md:text-lg"}
                    >
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {brands.length > 0 && (
          <p className="relative mx-auto mt-9 max-w-2xl text-sm leading-relaxed">
            <span className="font-bold tracking-[0.2em] uppercase">Also playing: </span>
            {brands.slice(0, 8).map((b, i) => (
              <span key={b.slug}>
                {i > 0 && <span aria-hidden> · </span>}
                <Link href={`/brands/${b.slug}`} className="underline-offset-4 hover:underline">{b.name}</Link>
              </span>
            ))}
          </p>
        )}
        <Link href="/collections" className={buttonClass("primary", "lg", "fest-btn relative mt-10 font-bold")}>
          See the full lineup
        </Link>
      </div>
    </section>
  );
}
