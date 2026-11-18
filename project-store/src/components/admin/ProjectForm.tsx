"use client";
import { startTransition, useActionState, useState } from "react";
import { saveProjectAction } from "@/app/admin/actions";
import { BRANCHES, CATEGORIES, DIFFICULTIES, INCLUDES, LEVELS } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { basePrice } from "@/lib/pricing";
import type { Settings } from "@/lib/settings";
import type { Project } from "@/lib/types";
import { slugify } from "@/lib/validate";
import { Meter } from "../Ui";

const DEFAULT_INCLUDES = ["code", "report", "ppt", "abstract", "video", "setup", "viva"];

export default function ProjectForm({ project, settings }: { project?: Project; settings: Settings }) {
  const [state, dispatch, pending] = useActionState(saveProjectAction, null);
  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!project);
  const [category, setCategory] = useState(project?.category ?? "software");
  const [difficulty, setDifficulty] = useState<number>(project?.difficulty ?? 2);
  const [price, setPrice] = useState(project ? String(project.price) : "");
  const suggested = basePrice(settings, difficulty, category);

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {project && <input type="hidden" name="id" value={project.id} />}
      <section className="card card-pad stack">
        <h2 className="card-title">The project</h2>
        <label className="field">
          <span>Title</span>
          <input
            className="input"
            name="title"
            required
            minLength={3}
            maxLength={160}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label className="field">
          <span>Web address</span>
          <input
            className="input mono"
            name="slug"
            maxLength={90}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
          />
          <span className="hint">/projects/{slugify(slug || title || "your-project")}</span>
        </label>
        <label className="field">
          <span>One-line summary</span>
          <input className="input" name="summary" maxLength={240} defaultValue={project?.summary} placeholder="What it does, in one sentence" />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea className="textarea" name="description" rows={5} maxLength={6000} defaultValue={project?.description} />
        </label>
        <label className="field">
          <span>
            Key features <em>(one per line)</em>
          </span>
          <textarea className="textarea" name="features" rows={5} defaultValue={project?.features.join("\n")} />
        </label>
        <label className="field">
          <span>
            Technology <em>(comma separated)</em>
          </span>
          <input className="input" name="tech" maxLength={600} defaultValue={project?.tech.join(", ")} placeholder="Python, OpenCV, Flask" />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>
              Demo video link <em>(optional)</em>
            </span>
            <input className="input" name="demoUrl" type="url" maxLength={500} defaultValue={project?.demoUrl} placeholder="YouTube, Loom, Google Drive, Instagram…" />
            <span className="hint">Plays right on the project page. Projects with a demo sell much better.</span>
          </label>
          <label className="field">
            <span>
              Live demo link <em>(optional)</em>
            </span>
            <input className="input" name="liveUrl" type="url" maxLength={500} defaultValue={project?.liveUrl} placeholder="https://your-demo.vercel.app" />
            <span className="hint">A working copy students can click around in.</span>
          </label>
        </div>
      </section>

      <section className="card card-pad stack">
        <h2 className="card-title">Who it's for</h2>
        <fieldset>
          <legend className="legend">Branches</legend>
          <div className="pills">
            {BRANCHES.map((b) => (
              <label key={b.id} className="pill-choice">
                <input type="checkbox" name="branches" value={b.id} defaultChecked={project?.branches.includes(b.id)} />
                <span>{b.short}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid-2">
          <label className="field">
            <span>Domain</span>
            <select className="select" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="legend">Type</legend>
            <div className="pills">
              {LEVELS.map((l) => (
                <label key={l.id} className="pill-choice">
                  <input type="radio" name="level" value={l.id} defaultChecked={(project?.level ?? "major") === l.id} />
                  <span>{l.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <fieldset>
          <legend className="legend">Difficulty</legend>
          <div className="choices four">
            {DIFFICULTIES.map((d) => (
              <label key={d.level} className="choice">
                <input type="radio" name="difficulty" value={d.level} checked={difficulty === d.level} onChange={() => setDifficulty(d.level)} />
                <Meter level={d.level} />
                <small>{d.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card card-pad stack">
        <h2 className="card-title">Price & delivery</h2>
        <div className="grid-2">
          <label className="field">
            <span>Price (₹)</span>
            <input className="input" name="price" inputMode="numeric" required value={price} onChange={(e) => setPrice(e.target.value)} />
            <span className="hint row" style={{ gap: 8 }}>
              Your pricing rules suggest {inr(suggested)}.
              <button type="button" className="btn btn-sm btn-soft" onClick={() => setPrice(String(suggested))}>
                Use it
              </button>
            </span>
          </label>
          <label className="field">
            <span>Ready in (days)</span>
            <input className="input" name="days" inputMode="numeric" required defaultValue={project?.deliveryDays ?? 7} />
          </label>
        </div>
        <fieldset>
          <legend className="legend">What the student gets</legend>
          <div className="pills">
            {Object.entries(INCLUDES).map(([id, label]) => (
              <label key={id} className="pill-choice">
                <input type="checkbox" name="includes" value={id} defaultChecked={(project?.includes ?? DEFAULT_INCLUDES).includes(id)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row" style={{ gap: 20 }}>
          <label className="check-plain">
            <input type="checkbox" name="active" value="1" defaultChecked={project?.active ?? true} /> Show in the store
          </label>
          <label className="check-plain">
            <input type="checkbox" name="featured" value="1" defaultChecked={project?.featured} /> Feature on the home page
          </label>
        </div>
      </section>

      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>
          {pending ? "Saving…" : project ? "Save project" : "Add project"}
        </button>
      </div>
    </form>
  );
}
