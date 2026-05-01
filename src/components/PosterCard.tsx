import { CityEvent } from "@/data/events";
import { Heart, MapPin, Clock, CalendarPlus, Navigation, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AddToCalendarDialog, buildPrefillFromEvent } from "@/components/AddToCalendarDialog";
import { MemoriesDialog } from "@/components/MemoriesDialog";

const accentBg: Record<CityEvent["accent"], string> = {
  coral: "bg-coral",
  tangerine: "bg-tangerine",
  lemon: "bg-lemon",
  mint: "bg-mint",
  sky: "bg-sky",
  lilac: "bg-lilac",
  magenta: "bg-magenta",
};

interface Props {
  event: CityEvent;
  favored: boolean;
  onToggleFav: (id: string) => void;
  size?: "md" | "lg";
  showMemories?: boolean;
}

function getMapsUrl(event: CityEvent): string {
  const query = event.mapsQuery ?? `${event.title}, ${event.area}, ${event.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function PosterCard({ event, favored, onToggleFav, size = "md", showMemories = false }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [memOpen, setMemOpen] = useState(false);
  const fmtTime = (h: number) => {
    const period = h >= 12 ? "pm" : "am";
    const hh = ((h + 11) % 12) + 1;
    return `${hh}${period}`;
  };

  return (
    <>
    <article
      className={cn(
        "group relative flex flex-col bg-cream border-2 border-ink shadow-poster-sm transition-transform duration-300 hover:-translate-y-1 hover:rotate-0",
        size === "lg" && "shadow-poster"
      )}
      style={{ transform: `rotate(${event.rotation}deg)` }}
    >
      {/* Poster image */}
      <div className="relative overflow-hidden border-b-2 border-ink">
        <img
          src={event.poster}
          alt={event.title}
          width={768}
          height={1024}
          loading="lazy"
          className="w-full aspect-[3/4] object-cover"
        />
        {/* Accent corner sticker */}
        <div className={cn(
          "absolute top-3 left-3 px-2.5 py-1 border-2 border-ink text-[10px] font-bold uppercase tracking-wider",
          accentBg[event.accent]
        )}>
          {event.category}
        </div>
        {/* Fav button */}
        <button
          onClick={(e) => { e.preventDefault(); onToggleFav(event.id); }}
          aria-label={favored ? "Remove from favourites" : "Save to favourites"}
          className="absolute top-3 right-3 h-10 w-10 grid place-items-center bg-cream border-2 border-ink rounded-full shadow-[2px_2px_0_0_var(--ink)] hover:scale-110 transition-transform"
        >
          <Heart
            className={cn("h-5 w-5", favored ? "fill-coral text-coral" : "text-ink")}
            strokeWidth={2.5}
          />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <h3 className="font-display text-2xl leading-[0.95] text-ink">
          {event.title}
        </h3>
        <p className="text-sm text-ink/75 leading-snug line-clamp-2">{event.blurb}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-bold text-ink/80">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.area}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtTime(event.startHour)}</span>
          <span className="ml-auto px-2 py-0.5 bg-ink text-paper rounded-sm">{event.price}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <a
            href={getMapsUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-paper border-2 border-ink rounded-full hover:bg-mint transition-colors"
          >
            <Navigation className="h-3.5 w-3.5" /> Directions
          </a>
          <button
            onClick={(e) => { e.preventDefault(); setAddOpen(true); }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-paper border-2 border-ink rounded-full hover:bg-lemon transition-colors"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>

        {showMemories && (
          <button
            onClick={(e) => { e.preventDefault(); setMemOpen(true); }}
            className="w-full mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-coral text-paper border-2 border-ink rounded-full shadow-[2px_2px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform"
          >
            <Camera className="h-3.5 w-3.5" /> Memories & collage
          </button>
        )}
      </div>
    </article>
    <AddToCalendarDialog
      open={addOpen}
      onClose={() => setAddOpen(false)}
      prefill={buildPrefillFromEvent(event)}
    />
    {showMemories && (
      <MemoriesDialog event={event} open={memOpen} onClose={() => setMemOpen(false)} />
    )}
    </>
  );
}
