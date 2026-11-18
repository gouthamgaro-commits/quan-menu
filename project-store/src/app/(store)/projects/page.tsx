import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import SortSelect from "@/components/SortSelect";
import { Meter, ProjectCard } from "@/components/Ui";
import { BRANCHES, BUDGETS, CATEGORIES, DIFFICULTIES, LEVELS, branchName, categoryEmoji, categoryName } from "@/lib/catalog";
import { getSettings, listProjects, SORTS } from "@/lib/data";
import { getFx } from "@/lib/fx";

type SP = Promise<Record<string, string | string[] | undefined>>;

function readFilters(sp: Record<string, string | string[] | undefined>) {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const branch = BRANCHES.some((b) => b.id === get("branch")) ? get("branch") : "";
  const category = CATEGORIES.some((c) => c.id === get("category")) ? get("category") : "";
  const d = Number(get("difficulty"));
  const difficulty = d >= 1 && d <= 4 ? String(d) : "";
  const level = LEVELS.some((l) => l.id === get("level")) ? get("level") : "";
  const budget = BUDGETS.some((b) => b.id === get("budget")) ? get("budget") : "";
  const sort = SORTS.some((s) => s.id === get("sort")) ? get("sort") : "popular";
  const q = get("q").slice(0, 80);
  return { q, category, branch, difficulty, level, budget, sort };
}
type Filters = ReturnType<typeof readFilters>;

/** Link to the catalogue with one filter changed (or removed when it is already chosen). */
function hrefWith(f: Filters, key: keyof Filters, value: string) {
  const next = { ...f, [key]: f[key] === value ? "" : value };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v && !(k === "sort" && v === "popular")) p.set(k, v);
  const qs = p.toString();
  return "/projects" + (qs ? "?" + qs : "");
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const [f, s] = [readFilters(await searchParams), await getSettings()];
  const what = f.category ? `${categoryName(f.category)} projects` : f.branch ? `${branchName(f.branch)} projects` : "Coding & engineering projects";
  return {
    title: `${what} with source code · ${s.brandName}`,
    description: `${what} for students, bootcamps and self-taught devs: source code, docs, demo and a walkthrough. Filter by track, difficulty and budget.`,
    alternates: { canonical: f.category ? `/projects?category=${f.category}` : f.branch ? `/projects?branch=${f.branch}` : "/projects" },
  };
}

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const f = readFilters(await searchParams);
  const s = await getSettings();
  const [projects, fx] = await Promise.all([
    listProjects({
      q: f.q,
      branch: f.branch,
      category: f.category,
      difficulty: f.difficulty ? Number(f.difficulty) : undefined,
      level: f.level,
      budget: f.budget,
      sort: f.sort,
    }),
    getFx(s.localCurrency),
  ]);
  const query = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && !(k === "sort" && v === "popular"))).toString();

  const active: { key: keyof Filters; label: string }[] = [];
  if (f.q) active.push({ key: "q", label: `“${f.q}”` });
  if (f.branch) active.push({ key: "branch", label: branchName(f.branch) });
  if (f.difficulty) active.push({ key: "difficulty", label: DIFFICULTIES[Number(f.difficulty) - 1].name });
  if (f.budget) active.push({ key: "budget", label: BUDGETS.find((b) => b.id === f.budget)!.name });
  if (f.level) active.push({ key: "level", label: LEVELS.find((l) => l.id === f.level)!.name });

  return (
    <main className="container page stack-lg">
      <div className="page-hero stack">
        <span className="deco-emoji" aria-hidden>
          {f.category ? categoryEmoji(f.category) : "🔍"}
        </span>
        <div className="stack-sm">
          <span className="sticker white">
            {projects.length} {projects.length === 1 ? "project" : "projects"} {f.category ? `in ${categoryName(f.category, true)}` : "for every stack"}
          </span>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 56px)" }}>
            {f.category ? (
              <>
                <span className="hl">{categoryName(f.category).toLowerCase()}</span> projects
              </>
            ) : (
              <>
                find your next <span className="hl pink">project</span>
              </>
            )}
          </h1>
          <p style={{ fontWeight: 600 }}>
            Code + docs + demo with every project.{s.negotiable ? " Like one but not the price? Make an offer 🤝" : ""}
          </p>
        </div>
        <form className="searchbar" action="/projects" role="search">
          {Object.entries(f).map(([k, v]) =>
            k !== "q" && v && !(k === "sort" && v === "popular") ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
          <div className="search-wrap">
            <Search size={18} aria-hidden strokeWidth={2.6} />
            <input className="input" type="search" name="q" defaultValue={f.q} placeholder="try: discord bot, react, arduino…" aria-label="Search projects" />
          </div>
          <button className="btn btn-primary" type="submit">
            search
          </button>
        </form>
        <div className="hscroll" aria-label="Track">
          <Link className="fpill" href={hrefWith(f, "category", f.category)} aria-current={!f.category ? "true" : undefined}>
            ✨ all
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} className="fpill" href={hrefWith(f, "category", c.id)} aria-current={f.category === c.id ? "true" : undefined}>
              {c.emoji} {c.short}
            </Link>
          ))}
        </div>
      </div>

      <div className="catalog">
        <div className="filter-toggle">
          <input type="checkbox" id="show-filters" className="sr-only ft-check" />
          <label htmlFor="show-filters" className="btn btn-block ft-label">
            <SlidersHorizontal size={16} aria-hidden /> filters{active.length ? ` (${active.length})` : ""}
          </label>
          <div className="card filters-box filters">
            <div className="filter-group">
              <h4>difficulty</h4>
              {DIFFICULTIES.map((d) => (
                <Link key={d.level} className="filter-opt" href={hrefWith(f, "difficulty", String(d.level))} aria-current={f.difficulty === String(d.level) ? "true" : undefined}>
                  <Meter level={d.level} />
                </Link>
              ))}
            </div>
            <div className="filter-group">
              <h4>budget</h4>
              {BUDGETS.map((b) => (
                <Link key={b.id} className="filter-opt" href={hrefWith(f, "budget", b.id)} aria-current={f.budget === b.id ? "true" : undefined}>
                  {b.name}
                </Link>
              ))}
            </div>
            <div className="filter-group">
              <h4>what&apos;s it for</h4>
              {LEVELS.map((l) => (
                <Link key={l.id} className="filter-opt" href={hrefWith(f, "level", l.id)} aria-current={f.level === l.id ? "true" : undefined}>
                  {l.name}
                </Link>
              ))}
            </div>
            <div className="filter-group">
              <h4>your field</h4>
              {BRANCHES.map((b) => (
                <Link key={b.id} className="filter-opt" href={hrefWith(f, "branch", b.id)} aria-current={f.branch === b.id ? "true" : undefined}>
                  {b.name}
                </Link>
              ))}
            </div>
            {(active.length > 0 || f.category) && (
              <Link href="/projects" className="btn btn-sm">
                clear all filters
              </Link>
            )}
          </div>
        </div>

        <section className="stack" aria-label="Results">
          <div className="results-head">
            <b style={{ fontSize: 17 }}>
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </b>
            <SortSelect value={f.sort} query={query} options={[...SORTS]} />
          </div>
          {active.length > 0 && (
            <div className="row" style={{ gap: 8 }}>
              {active.map((a) => (
                <Link key={a.key} className="fpill" href={hrefWith(f, a.key, f[a.key])}>
                  {a.label} <X size={14} className="x" aria-label="Remove" />
                </Link>
              ))}
            </div>
          )}
          {projects.length ? (
            <div className="pgrid three">
              {projects.map((p) => (
                <ProjectCard key={p.id} p={p} negotiable={s.negotiable} fx={fx} />
              ))}
            </div>
          ) : (
            <div className="card empty">
              <span style={{ fontSize: 44 }} aria-hidden>
                🫠
              </span>
              <h3>nothing matches that (yet)</h3>
              <p className="muted">Try fewer filters, or pitch exactly what you need. We build custom projects too.</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <Link href="/projects" className="btn">
                  clear filters
                </Link>
                <Link href="/custom" className="btn btn-offer">
                  pitch my idea <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
