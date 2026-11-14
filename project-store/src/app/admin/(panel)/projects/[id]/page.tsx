import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProjectAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ProjectForm from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/admin";
import { getProject, getSettings } from "@/lib/data";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const [p, s] = await Promise.all([Number.isInteger(id) && id > 0 ? getProject(id) : null, getSettings()]);
  if (!p) notFound();
  return (
    <>
      <div className="stack-sm">
        <Link href="/admin/projects" className="small row" style={{ gap: 6, textDecoration: "none" }}>
          <ArrowLeft size={15} aria-hidden /> All projects
        </Link>
        <div className="row between">
          <h1 style={{ fontSize: 28 }}>Edit project</h1>
          {p.active && (
            <Link href={`/projects/${p.slug}`} target="_blank" className="btn btn-sm">
              <ExternalLink size={15} aria-hidden /> View in store
            </Link>
          )}
        </div>
      </div>
      <ProjectForm project={p} settings={s} />
      <form action={deleteProjectAction} className="card card-pad row between">
        <input type="hidden" name="id" value={p.id} />
        <span className="small muted">Past orders keep their details if you delete this project. To stop selling it for now, untick “Show in the store” instead.</span>
        <ConfirmButton message={`Delete “${p.title}” for good?`}>
          <Trash2 size={15} aria-hidden /> Delete project
        </ConfirmButton>
      </form>
    </>
  );
}
