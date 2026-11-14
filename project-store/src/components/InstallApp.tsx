"use client";
import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install the app" button. Android/desktop Chrome get the real install prompt; iPhones get
 * the two taps that add the site to the home screen. Hidden once the site runs as an app.
 */
export default function InstallApp({ className = "btn btn-sm" }: { className?: string }) {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;

  return (
    <span className="stack-xs">
      <button
        type="button"
        className={className}
        onClick={async () => {
          if (evt) {
            await evt.prompt();
            setEvt(null);
          } else setHelp((h) => !h);
        }}
      >
        <Smartphone size={16} aria-hidden /> Install the app
      </button>
      {help && (
        <span className="tiny muted">
          In Safari, tap the Share button, then <b>Add to Home Screen</b>.
        </span>
      )}
    </span>
  );
}
