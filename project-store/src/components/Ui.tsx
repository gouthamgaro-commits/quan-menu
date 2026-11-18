import { Clock } from "lucide-react";
import Link from "next/link";
import { branchName, categoryEmoji, categoryName, difficultyName, levelName, STATUSES, type Status } from "@/lib/catalog";
import { approx, inr } from "@/lib/format";
import type { Project } from "@/lib/types";
import CoverArt from "./CoverArt";

export function Meter({ level, label = true }: { level: number; label?: boolean }) {
  return (
    <span className="meter" data-level={level} title={`Difficulty: ${difficultyName(level)}`}>
      <span className="bars" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      {label ? difficultyName(level) : <span className="sr-only">{difficultyName(level)}</span>}
    </span>
  );
}

export function StatusBadge({ status, student = false }: { status: Status; student?: boolean }) {
  const s = STATUSES[status];
  return <span className={`badge tone-${s.tone}`}>{student && status !== "delivered" && status !== "cancelled" ? s.student : s.name}</span>;
}

export function ProjectCard({
  p,
  negotiable = true,
  className = "",
  fx = null,
}: {
  p: Project;
  negotiable?: boolean;
  className?: string;
  fx?: { code: string; rate: number } | null;
}) {
  return (
    <Link href={`/projects/${p.slug}`} className={`pcard cat-${p.category} ${className}`}>
      <CoverArt category={p.category} seed={p.slug}>
        <span className="cover-tags">
          <span className="glass-chip">{levelName(p.level, true)}</span>
          <span className="glass-chip">
            <Meter level={p.difficulty} />
          </span>
        </span>
      </CoverArt>
      <div className="pcard-body">
        <span className="pcard-cat">
          {categoryEmoji(p.category)} {categoryName(p.category, true)}
        </span>
        <h3>{p.title}</h3>
        <p>{p.summary}</p>
        <div className="chips">
          {p.branches.slice(0, 3).map((b) => (
            <span key={b} className="chip">
              {branchName(b, true)}
            </span>
          ))}
        </div>
      </div>
      <div className="pcard-foot">
        <span className="stack-xs">
          <span className="price">{inr(p.price)}</span>
          {fx && <span className="approx">{approx(p.price, fx)}</span>}
          {negotiable && <span className="neg">negotiable 🤝</span>}
        </span>
        <span className="days">
          <Clock size={14} aria-hidden /> {p.deliveryDays} days
        </span>
      </div>
    </Link>
  );
}

/** Renders the owner's plain-text policies: "## " headings, "- " bullets, blank-line paragraphs. */
export function PlainText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        const out: React.ReactNode[] = [];
        let bullets: string[] = [];
        const flush = (k: string) => {
          if (bullets.length) out.push(<ul key={k}>{bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>);
          bullets = [];
        };
        lines.forEach((l, j) => {
          const t = l.trim();
          if (t.startsWith("## ")) {
            flush(`u${j}`);
            out.push(<h2 key={j}>{t.slice(3)}</h2>);
          } else if (/^[-•*] /.test(t)) {
            bullets.push(t.slice(2));
          } else {
            flush(`u${j}`);
            out.push(<p key={j}>{t}</p>);
          }
        });
        flush("end");
        return <div key={i} className="stack-sm">{out}</div>;
      })}
    </div>
  );
}
