import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import SortSelect from "@/components/SortSelect";
import { Meter, ProjectCard } from "@/components/Ui";
import { BRANCHES, BUDGETS, CATEGORIES, DIFFICULTIES, LEVELS, branchName } from "@/lib/catalog";
import { getSettings, listProjects, SORTS } from "@/lib/data";

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
  return { q, branch, category, difficulty, level, budget, sort };
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
  const what = f.branch ? `${branchName(f.branch, true)} projects` : "Engineering projects";
  return {
    title: `${what} with source code & report · ${s.brandName}`,
    description: `${what} for final-year and mini projects: source code, report, PPT and viva support. Filter by difficulty and budget.`,
    alternates: { canonical: f.branch ? `/projects?branch=${f.branch}` : "/projects" },
  };
}

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const f = readFilters(await searchParams);
  const projects = await listProjects({
    q: f.q,
    branch: f.branch,
    category: f.category,
    difficulty: f.difficulty ? Number(f.difficulty) : undefined,
    level: f.level,
    budget: f.budget,
    sort: f.sort,
  });
  const query = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && !(k === "sort" && v === "popular"))).toString();

  const active: { key: keyof Filters; label: string }[] = [];
  if (f.q) active.push({ key: "q", label: `“${f.q}”` });
  if (f.difficulty) active.push({ key: "difficulty", label: DIFFICULTIES[Number(f.difficulty) - 1].name });
  if (f.budget) active.push({ key: "budget", label: BUDGETS.find((b) => b.id === f.budget)!.name });
  if (f.category) active.push({ key: "category", label: CATEGORIES.find((c) => c.id === f.category)!.name });
  if (f.level) active.push({ key: "level", label: LEVELS.find((l) => l.id === f.level)!.name });

  return (
    <main className="container page stack-lg">
      <div className="stack">
        <div className="stack-xs">
          <h1>{f.branch ? `${branchName(f.branch)} projects` : "All projects"}</h1>
          <p className="muted">Fixed prices, with source code, report and PPT. Tap a project to see everything included.</p>
        </div>
        <form className="searchbar" action="/projects" role="search">
          {Object.entries(f).map(([k, v]) =>
            k !== "q" && v && !(k === "sort" && v === "popular") ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
          <div className="search-wrap">
            <Search size={18} aria-hidden />
            <input
              className="input"
              type="search"
              name="q"
              defaultValue={f.q}
              placeholder="Search: face recognition, Arduino, ANSYS…"
              aria-label="Search projects"
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
        <div className="hscroll" aria-label="Branch">
          <Link className="fpill" href={hrefWith(f, "branch", f.branch)} aria-current={!f.branch ? "true" : undefined}>
            All branches
          </Link>
          {BRANCHES.map((b) => (
            <Link key={b.id} className="fpill" href={hrefWith(f, "branch", b.id)} aria-current={f.branch === b.id ? "true" : undefined}>
              {b.short}
            </Link>
          ))}
        </div>
      </div>

      <div className="catalog">
        <div className="filter-toggle">
          <input type="checkbox" id="show-filters" className="sr-only ft-check" />
          <label htmlFor="show-filters" className="btn btn-block ft-label">
            <SlidersHorizontal size={16} aria-hidden /> Filters{active.length ? ` (${active.length})` : ""}
          </label>
          <div className="card filters-box filters">
            <div className="filter-group">
              <h4>Difficulty</h4>
              {DIFFICULTIES.map((d) => (
                <Link key={d.level} className="filter-opt" href={hrefWith(f, "difficulty", String(d.level))} aria-current={f.difficulty === String(d.level) ? "true" : undefined}>
                  <Meter level={d.level} />
                </Link>
              ))}
            </div>
            <div className="filter-group">
              <h4>Budget</h4>
              {BUDGETS.map((b) => (
                <Link key={b.id} className="filter-opt" href={hrefWith(f, "budget", b.id)} aria-current={f.budget === b.id ? "true" : undefined}>
                  {b.name}
                </Link>
              ))}
            </div>
            <div className="filter-group">
              <h4>Type</h4>
              {LEVELS.map((l) => (
                <Link key={l.id} className="filter-opt" href={hrefWith(f, "level", l.id)} aria-current={f.level === l.id ? "true" : undefined}>
                  {l.name}
                </Link>
              ))}
            </div>
            <div className="filter-group">
              <h4>Domain</h4>
              {CATEGORIES.map((c) => (
                <Link key={c.id} className="filter-opt" href={hrefWith(f, "category", c.id)} aria-current={f.category === c.id ? "true" : undefined}>
                  {c.name}
                </Link>
              ))}
            </div>
            {(active.length > 0 || f.branch) && (
              <Link href="/projects" className="btn btn-sm">
                Clear all filters
              </Link>
            )}
          </div>
        </div>

        <section className="stack" aria-label="Results">
          <div className="results-head">
            <b>
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </b>
            <SortSelect value={f.sort} query={query} options={[...SORTS]} />
          </div>
          {active.length > 0 && (
            <div className="row" style={{ gap: 6 }}>
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
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="card empty">
              <Search size={32} aria-hidden />
              <h3>No ready project matches that</h3>
              <p className="muted">Try fewer filters, or tell us exactly what you need. We build custom projects too.</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <Link href="/projects" className="btn">
                  Clear filters
                </Link>
                <Link href="/custom" className="btn btn-primary">
                  Price my own idea <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
