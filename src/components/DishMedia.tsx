"use client";
import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MAX_MEDIA, MEDIA_BUCKET, type Media } from "@/lib/types";

const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const MAX_VIDEO_MB = 25;

/** Phone photos are several MB; customers on mobile data only need ~1280px. */
async function shrinkPhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("encode"))), "image/jpeg", 0.82));
}

interface Props {
  media: Media[];
  demo: boolean;
  onAdd: (added: Media[]) => void;
  onRemove: (url: string) => void;
}

/**
 * Photos and videos for one dish. Files upload straight to Supabase Storage into the
 * vendor's own folder (storage policies in supabase/schema.sql enforce that); the dish
 * keeps only their public URLs, which are saved with the menu.
 */
export default function DishMedia({ media, demo, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>({ text: "" });

  if (demo) {
    return <p className="status">Dish photos and videos are saved to your account, so they work once logins (Supabase) are set up.</p>;
  }

  async function add(list: FileList | null) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    const room = MAX_MEDIA - media.length;
    if (room <= 0) return setMsg({ text: `Up to ${MAX_MEDIA} photos or videos per dish. Remove one first.`, err: true });

    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    if (!data.user) return setMsg({ text: "Your login expired. Sign in again.", err: true });

    const added: Media[] = [];
    const problems: string[] = [];
    const todo = files.slice(0, room);
    for (let k = 0; k < todo.length; k++) {
      const f = todo[k];
      setBusy(todo.length > 1 ? `Uploading ${k + 1} of ${todo.length}…` : "Uploading…");
      try {
        let body: Blob, type: Media["type"], contentType: string, ext: string;
        if (f.type.startsWith("video/")) {
          ext = VIDEO_TYPES[f.type];
          if (!ext) throw new Error(`${f.name}: use an MP4 or MOV video.`);
          if (f.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`${f.name}: videos must be under ${MAX_VIDEO_MB} MB (about 30 seconds).`);
          body = f; type = "video"; contentType = f.type;
        } else {
          body = await shrinkPhoto(f).catch(() => { throw new Error(`${f.name}: couldn't open that photo. Try a JPG or PNG.`); });
          type = "image"; contentType = "image/jpeg"; ext = "jpg";
        }
        const path = `${data.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, body, { contentType, cacheControl: "31536000", upsert: false });
        if (error) {
          console.error("[media] upload failed:", error.message);
          throw new Error(/bucket not found/i.test(error.message)
            ? "Photo storage isn't set up yet: run the latest supabase/schema.sql in Supabase."
            : `${f.name}: upload failed. Check your connection and try again.`);
        }
        added.push({ type, url: sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl });
      } catch (e) {
        problems.push((e as Error).message);
      }
    }
    setBusy("");
    if (added.length) onAdd(added);
    const skipped = files.length - todo.length;
    if (problems.length || skipped) {
      setMsg({ text: [...problems, skipped ? `${skipped} not added: up to ${MAX_MEDIA} per dish.` : ""].filter(Boolean).join(" "), err: true });
    } else {
      setMsg({ text: `Added ${added.length}. Save the menu to show ${added.length > 1 ? "them" : "it"} to customers.` });
    }
  }

  return (
    <div className="media-edit">
      {media.length > 0 && (
        <div className="media-grid">
          {media.map((m) => (
            <div key={m.url} className="media-item">
              {m.type === "video" ? (
                <video src={m.url + "#t=0.1"} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" />
              )}
              {m.type === "video" && <span className="media-play" aria-hidden>▶</span>}
              <button className="media-del" aria-label="Remove" onClick={() => { onRemove(m.url); setMsg({ text: "Removed. Save the menu to update it for customers." }); }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn" disabled={!!busy || media.length >= MAX_MEDIA} onClick={() => inputRef.current?.click()}>
          {busy || "Add photo or video"}
        </button>
        <small className="status">{media.length}/{MAX_MEDIA} · videos up to {MAX_VIDEO_MB} MB</small>
      </div>
      <input ref={inputRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden
        onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {msg.text && <p className={"status" + (msg.err ? " err" : " good")} aria-live="polite">{msg.text}</p>}
    </div>
  );
}
