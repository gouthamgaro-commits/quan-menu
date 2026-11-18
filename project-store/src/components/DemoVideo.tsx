"use client";
import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { parseVideo } from "@/lib/video";

/**
 * The project's demo video. YouTube shows its thumbnail first and only loads the player when
 * tapped (faster pages, and nothing from YouTube loads until then). Other hosts load lazily.
 */
export default function DemoVideo({ url, title }: { url: string; title: string }) {
  const v = parseVideo(url);
  const [playing, setPlaying] = useState(false);
  if (!v) return null;

  if (v.kind === "link") {
    return (
      <a href={v.href} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
        <Play size={17} aria-hidden /> watch the demo <span className="small">({v.host})</span> <ExternalLink size={15} aria-hidden />
      </a>
    );
  }
  if (v.kind === "file") {
    return (
      <div className="video-frame">
        <video src={v.src} controls preload="metadata" playsInline aria-label={`Demo of ${title}`} />
      </div>
    );
  }
  if (v.kind === "youtube" && !playing) {
    return (
      <button type="button" className={`video-frame video-facade${v.vertical ? " vertical" : ""}`} onClick={() => setPlaying(true)} aria-label={`Play the demo of ${title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.thumb} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />
        <span className="play-btn" aria-hidden>
          <Play size={30} fill="currentColor" />
        </span>
      </button>
    );
  }
  return (
    <div className={`video-frame${v.vertical ? " vertical" : ""}`}>
      <iframe
        src={v.embed}
        title={`Demo of ${title}`}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
