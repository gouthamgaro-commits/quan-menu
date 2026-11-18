/**
 * Turns a demo-video link the owner pastes (YouTube, Shorts, Vimeo, Loom, Google Drive, Instagram,
 * or a direct .mp4/.webm file) into something the project page can play in place.
 * Anything else is shown as a plain "watch the demo" link.
 */
export type Video =
  | { kind: "youtube"; id: string; embed: string; thumb: string; vertical: boolean }
  | { kind: "iframe"; embed: string; vertical: boolean; host: string }
  | { kind: "file"; src: string }
  | { kind: "link"; href: string; host: string };

export function parseVideo(url: string): Video | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const path = u.pathname;

  // YouTube: watch?v=, youtu.be/, /shorts/, /embed/, /live/
  let yt = "";
  if (host === "youtu.be") yt = path.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    yt = u.searchParams.get("v") ?? "";
    const m = path.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
    if (!yt && m) yt = m[2];
  }
  if (yt && /^[A-Za-z0-9_-]{6,20}$/.test(yt)) {
    return {
      kind: "youtube",
      id: yt,
      embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      vertical: path.startsWith("/shorts/"),
    };
  }

  const vimeo = host === "vimeo.com" ? path.match(/^\/(\d+)/)?.[1] : host === "player.vimeo.com" ? path.match(/^\/video\/(\d+)/)?.[1] : undefined;
  if (vimeo) return { kind: "iframe", embed: `https://player.vimeo.com/video/${vimeo}`, vertical: false, host: "Vimeo" };

  const loom = host === "loom.com" ? path.match(/^\/(share|embed)\/([a-f0-9]{16,})/i)?.[2] : undefined;
  if (loom) return { kind: "iframe", embed: `https://www.loom.com/embed/${loom}`, vertical: false, host: "Loom" };

  const drive = host === "drive.google.com" ? (path.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ?? u.searchParams.get("id")) : null;
  if (drive && /^[A-Za-z0-9_-]{10,}$/.test(drive)) {
    return { kind: "iframe", embed: `https://drive.google.com/file/d/${drive}/preview`, vertical: false, host: "Google Drive" };
  }

  const insta = host === "instagram.com" ? path.match(/^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/) : null;
  if (insta) {
    const type = insta[1] === "reels" ? "reel" : insta[1];
    return { kind: "iframe", embed: `https://www.instagram.com/${type}/${insta[2]}/embed/`, vertical: true, host: "Instagram" };
  }

  if (/\.(mp4|webm|mov|m4v)$/i.test(path)) return { kind: "file", src: u.toString() };
  return { kind: "link", href: u.toString(), host };
}
