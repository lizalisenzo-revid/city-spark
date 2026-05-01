import { useState } from "react";
import { useScrapbook, type SavedCollage } from "@/hooks/useMemories";
import { Download, Share2, Trash2, X, BookOpen, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "collages" | "photos";

export function ScrapbookView({ onBrowse }: { onBrowse: () => void }) {
  const { photos, collages, removeCollage } = useScrapbook();
  const [tab, setTab] = useState<Tab>("collages");
  const [zoom, setZoom] = useState<{ src: string; title?: string } | null>(null);

  const isEmpty = photos.length === 0 && collages.length === 0;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="font-display text-4xl">Your <span className="text-coral">scrapbook</span></h2>
          <p className="text-ink/70 mt-1">Every photo and collage you've ever made — all in one place.</p>
        </div>
        {!isEmpty && (
          <div className="inline-flex items-center p-1 bg-cream border-2 border-ink rounded-full shadow-poster-sm">
            <button
              onClick={() => setTab("collages")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all",
                tab === "collages" ? "bg-coral text-paper border-2 border-ink" : "text-ink/60 hover:text-ink"
              )}
            >
              <BookOpen className="h-4 w-4" /> Collages · {collages.length}
            </button>
            <button
              onClick={() => setTab("photos")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all",
                tab === "photos" ? "bg-lemon border-2 border-ink" : "text-ink/60 hover:text-ink"
              )}
            >
              <ImageIcon className="h-4 w-4" /> Photos · {photos.length}
            </button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-6 border-2 border-dashed border-ink/40 rounded-2xl p-10 text-center bg-cream">
          <div className="text-5xl mb-3">📓</div>
          <p className="font-display text-3xl">Your scrapbook is empty</p>
          <p className="text-ink/70 mt-2 max-w-md mx-auto">
            Save a place, snap photos when you're there, and turn them into collages. They'll all live here as your personal scrapbook.
          </p>
          <button
            onClick={onBrowse}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-ink text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--coral)] hover:translate-y-0.5 transition-transform"
          >
            Discover places
          </button>
        </div>
      ) : tab === "collages" ? (
        collages.length === 0 ? (
          <EmptyTab text="No collages saved yet. Open Memories on a saved place and tap Save to scrapbook." />
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {collages.map((c) => (
              <CollageCard key={c.id} collage={c} onOpen={() => setZoom({ src: c.dataUrl, title: c.eventTitle })} onDelete={() => removeCollage(c.id)} />
            ))}
          </div>
        )
      ) : photos.length === 0 ? (
        <EmptyTab text="No photos yet. Tap a saved place and add some memories." />
      ) : (
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setZoom({ src: p.dataUrl })}
              className="relative aspect-square overflow-hidden border-2 border-ink rounded-lg shadow-poster-sm bg-cream group"
            >
              <img src={p.dataUrl} alt="" className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform" />
            </button>
          ))}
        </div>
      )}

      {zoom && <Lightbox src={zoom.src} title={zoom.title} onClose={() => setZoom(null)} />}
    </section>
  );
}

function EmptyTab({ text }: { text: string }) {
  return (
    <div className="mt-6 border-2 border-dashed border-ink/30 rounded-2xl p-8 text-center text-ink/70">
      {text}
    </div>
  );
}

function CollageCard({ collage, onOpen, onDelete }: { collage: SavedCollage; onOpen: () => void; onDelete: () => void }) {
  const date = new Date(collage.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = collage.dataUrl;
    a.download = `${collage.eventTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${collage.id}.jpg`;
    a.click();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await (await fetch(collage.dataUrl)).blob();
      const file = new File([blob], `${collage.eventTitle}.jpg`, { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: collage.eventTitle, text: `Memories from ${collage.eventTitle} 📸` });
      } else {
        handleDownload(e);
      }
    } catch { handleDownload(e); }
  };

  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        className="block w-full bg-cream border-2 border-ink rounded-xl overflow-hidden shadow-poster-sm hover:-translate-y-0.5 transition-transform"
      >
        <img src={collage.dataUrl} alt={collage.eventTitle} className="w-full h-auto block" />
      </button>
      <div className="mt-2 px-1">
        <p className="font-bold text-sm leading-tight truncate">{collage.eventTitle}</p>
        <p className="text-xs text-ink/60">{collage.eventArea} · {date}</p>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleShare} className="h-8 w-8 grid place-items-center bg-paper border-2 border-ink rounded-full" aria-label="Share">
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleDownload} className="h-8 w-8 grid place-items-center bg-paper border-2 border-ink rounded-full" aria-label="Download">
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm("Delete this collage?")) onDelete(); }}
          className="h-8 w-8 grid place-items-center bg-paper border-2 border-ink rounded-full"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Lightbox({ src, title, onClose }: { src: string; title?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 grid place-items-center bg-paper border-2 border-ink rounded-full shadow-[2px_2px_0_0_var(--coral)]"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-w-3xl w-full">
        <img src={src} alt={title ?? ""} className="max-h-[85vh] w-auto mx-auto border-2 border-ink rounded-lg shadow-poster" />
        {title && <p className="mt-3 text-center text-paper font-bold">{title}</p>}
      </div>
    </div>
  );
}
