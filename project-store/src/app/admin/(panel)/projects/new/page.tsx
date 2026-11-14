import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProjectForm from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/data";

export default async function NewProject() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <>
      <div className="stack-sm">
        <Link href="/admin/projects" className="small row" style={{ gap: 6, textDecoration: "none" }}>
          <ArrowLeft size={15} aria-hidden /> All projects
        </Link>
        <h1 style={{ fontSize: 28 }}>New project</h1>
      </div>
      <ProjectForm settings={s} />
    </>
  );
}
