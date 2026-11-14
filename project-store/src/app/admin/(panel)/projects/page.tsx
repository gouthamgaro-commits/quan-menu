import { CircleCheck, Eye, EyeOff, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { toggleProjectAction } from "@/app/admin/actions";
import { CategoryIcon } from "@/components/Icons";
import { Meter } from "@/components/Ui";
import { requireAdmin } from "@/lib/admin";
import { branchName } from "@/lib/catalog";
import { listProjects } from "@/lib/data";
import { inr } from "@/lib/format";

export default async function AdminProjects({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const show = sp.show === "live" || sp.show === "hidden" ? sp.show : "all";
  const saved = typeof sp.saved === "string" ? sp.saved : "";
  const all = await listProjects({ q, includeHidden: true, sort: "new", limit: 500 });
  const projects = all.filter((p) => (show === "live" ? p.active : show === "hidden" ? !p.active : true));

  return (
    <>
      <div className="row between">
        <div className="stack-xs">
          <h1 style={{ fontSize: 28 }}>Projects</h1>
          <p className="muted small">
            {all.filter((p) => p.active).length} in the store · {all.filter((p) => !p.active).length} hidden
          </p>
        </div>
        <Link href="/admin/projects/new" className="btn btn-primary">
          <Plus size={17} aria-hidden /> New project
        </Link>
      </div>
      {saved && (
        <p className="notice ok" role="status">
          <CircleCheck size={18} aria-hidden /> Saved “{saved}”.
        </p>
      )}
      <div className="row">
        <form className="searchbar" action="/admin/projects" role="search" style={{ flex: "1 1 260px", maxWidth: 420 }}>
          <input type="hidden" name="show" value={show} />
          <div className="search-wrap">
            <Search size={17} aria-hidden />
            <input className="input" type="search" name="q" defaultValue={q} placeholder="Search projects" aria-label="Search projects" />
          </div>
        </form>
        <nav className="tabs" style={{ margin: 0, padding: 0 }}>
          {(["all", "live", "hidden"] as const).map((v) => (
            <Link key={v} className="tab" href={`/admin/projects?show=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={show === v ? "true" : undefined}>
              {v === "all" ? "All" : v === "live" ? "In store" : "Hidden"}
            </Link>
          ))}
        </nav>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Branches</th>
              <th>Difficulty</th>
              <th>Price</th>
              <th>Orders</th>
              <th>In store</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} style={p.active ? undefined : { opacity: 0.6 }}>
                <td>
                  <div className={`row cat-${p.category}`} style={{ gap: 10, flexWrap: "nowrap" }}>
                    <span className="cat-icon" style={{ width: 32, height: 32, borderRadius: 9 }}>
                      <CategoryIcon category={p.category} size={16} />
                    </span>
                    <span className="stack-xs">
                      <Link className="rowlink" href={`/admin/projects/${p.id}`}>
                        {p.title}
                      </Link>
                      <span className="tiny muted">
                        {p.featured && (
                          <>
                            <Star size={11} aria-hidden /> Featured ·{" "}
                          </>
                        )}
                        {p.deliveryDays} days
                      </span>
                    </span>
                  </div>
                </td>
                <td className="small">{p.branches.map((b) => branchName(b, true)).join(", ")}</td>
                <td>
                  <Meter level={p.difficulty} />
                </td>
                <td className="nowrap strong">{inr(p.price)}</td>
                <td>{p.ordersCount}</td>
                <td>
                  <form action={toggleProjectAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={p.active ? "0" : "1"} />
                    <button className="btn btn-sm" type="submit" title={p.active ? "Hide from the store" : "Show in the store"}>
                      {p.active ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
                      {p.active ? "Shown" : "Hidden"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!projects.length && (
              <tr>
                <td colSpan={6} className="center muted">
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
