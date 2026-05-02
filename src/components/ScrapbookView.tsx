import { useState, useRef, useEffect, useMemo } from "react";
import { useScrapbook, type SavedCollage, type ScrapbookNote, type Memory } from "@/hooks/useMemories";
import { EVENTS } from "@/data/events";
import {
  Download, Share2, Trash2, X, BookOpen, Image as ImageIcon,
  PenLine, Plus, Check, ChevronDown, ChevronUp, MapPin, Camera, StickyNote
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "collages" | "photos" | "notes";

/* ── grouped place ── */
type PlaceGroup = {
  eventId: string;
  eventTitle: string;
  eventArea: string;
  poster: string | null;   // event poster image src
  thumb: string | null;    // first real user photo/collage dataUrl
  photos: (Memory & { eventId: string })[];
  collages: SavedCollage[];
  notes: ScrapbookNote[];
  latestAt: number;
};

/* ── random tilt for polaroids ── */
const tilts = [-3, -1.5, 0, 1.5, 3, -2, 2, -1, 1, -2.5];
function tilt(i: number) { return `rotate(${tilts[i % tilts.length]}deg)`; }

/* ════════════════════════════════════════════════
   Main view
═══════════════════════════════════════════════ */
export function ScrapbookView({ onBrowse }: { onBrowse: () => void }) {
  const { photos, collages, notes, removeCollage, saveNote, updateNote, deleteNote } = useScrapbook();
  const [tab, setTab] = useState<Tab>("collages");
  const [zoom, setZoom] = useState<{ src: string; title?: string } | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [diaryPlace, setDiaryPlace] = useState<PlaceGroup | null>(null);

  const isEmpty = photos.length === 0 && collages.length === 0 && notes.length === 0;

  /* Build place groups */
  const places = useMemo<PlaceGroup[]>(() => {
    const map = new Map<string, PlaceGroup>();

    const ensure = (eventId: string, title: string, area: string) => {
      if (!map.has(eventId)) {
        const ev = EVENTS.find((e) => e.id === eventId);
        map.set(eventId, {
          eventId, eventTitle: title, eventArea: area,
          poster: ev ? (typeof ev.poster === "string" ? ev.poster : (ev.poster as { src: string }).src) : null,
          thumb: null,
          photos: [], collages: [], notes: [],
          latestAt: 0,
        });
      }
      return map.get(eventId)!;
    };

    for (const c of collages) {
      const g = ensure(c.eventId, c.eventTitle, c.eventArea);
      g.collages.push(c);
      if (!g.thumb) g.thumb = c.dataUrl;
      if (c.createdAt > g.latestAt) g.latestAt = c.createdAt;
    }
    for (const p of photos) {
      const title = collages.find((c) => c.eventId === p.eventId)?.eventTitle
        ?? notes.find((n) => n.eventId === p.eventId)?.eventTitle
        ?? EVENTS.find((e) => e.id === p.eventId)?.title
        ?? "Unknown place";
      const area = collages.find((c) => c.eventId === p.eventId)?.eventArea
        ?? notes.find((n) => n.eventId === p.eventId)?.eventArea
        ?? EVENTS.find((e) => e.id === p.eventId)?.area ?? "";
      const g = ensure(p.eventId, title, area);
      g.photos.push(p);
      if (!g.thumb) g.thumb = p.dataUrl;
      if (p.createdAt > g.latestAt) g.latestAt = p.createdAt;
    }
    for (const n of notes) {
      const g = ensure(n.eventId, n.eventTitle, n.eventArea);
      g.notes.push(n);
      if (n.updatedAt > g.latestAt) g.latestAt = n.updatedAt;
    }

    return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt);
  }, [photos, collages, notes]);

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode, count: number) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all",
        tab === id ? "bg-coral text-paper border-2 border-ink" : "text-ink/60 hover:text-ink"
      )}
    >
      {icon} {label} · {count}
    </button>
  );

  return (
    <section className="mt-8 space-y-12">

      {/* ── PLACES section (top) ── */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-4xl">Your <span className="text-coral">scrapbook</span></h2>
            <p className="text-ink/70 mt-1">Every memory, tied to the place that made it.</p>
          </div>
          <button
            onClick={() => { setTab("notes"); setAddingNote(true); window.scrollTo({ top: 9999, behavior: "smooth" }); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper font-bold border-2 border-ink rounded-full shadow-[2px_2px_0_0_var(--coral)] hover:bg-ink/80 transition-colors text-sm"
          >
            <PenLine className="h-4 w-4" /> Write a note
          </button>
        </div>

        {isEmpty ? (
          <div className="border-2 border-dashed border-ink/40 rounded-2xl p-10 text-center bg-cream">
            <div className="text-5xl mb-3">📓</div>
            <p className="font-display text-3xl">No memories yet</p>
            <p className="text-ink/70 mt-2 max-w-md mx-auto">
              Save a place, snap photos when you're there, and write down your experiences. They'll all live here.
            </p>
            <button
              onClick={onBrowse}
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-ink text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--coral)] hover:translate-y-0.5 transition-transform"
            >
              Discover places
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {places.map((place) => (
              <PlaceCard key={place.eventId} place={place} onClick={() => setDiaryPlace(place)} />
            ))}
          </div>
        )}
      </div>

      {/* ── ALL MEMORIES section (bottom) ── */}
      {!isEmpty && (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-2xl">All memories</h3>
              <p className="text-ink/60 text-sm mt-0.5">Every collage, photo, and note in one place.</p>
            </div>
            <div className="inline-flex items-center p-1 bg-cream border-2 border-ink rounded-full shadow-poster-sm">
              {tabBtn("collages", "Collages", <BookOpen className="h-4 w-4" />, collages.length)}
              {tabBtn("photos", "Photos", <ImageIcon className="h-4 w-4" />, photos.length)}
              {tabBtn("notes", "Notes", <PenLine className="h-4 w-4" />, notes.length)}
            </div>
          </div>

          {tab === "collages" ? (
            collages.length === 0 ? <EmptyTab text="No collages saved yet. Open Memories on a saved place and tap Save to scrapbook." /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {collages.map((c) => (
                  <CollageCard key={c.id} collage={c} onOpen={() => setZoom({ src: c.dataUrl, title: c.eventTitle })} onDelete={() => removeCollage(c.id)} />
                ))}
              </div>
            )
          ) : tab === "photos" ? (
            photos.length === 0 ? <EmptyTab text="No photos yet. Tap a saved place and add some memories." /> : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {photos.map((p) => (
                  <button key={p.id} onClick={() => setZoom({ src: p.dataUrl })}
                    className="relative aspect-square overflow-hidden border-2 border-ink rounded-lg shadow-poster-sm bg-cream group"
                  >
                    <img src={p.dataUrl} alt="" className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {!addingNote && (
                <button onClick={() => setAddingNote(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink text-paper font-bold border-2 border-ink rounded-full shadow-[2px_2px_0_0_var(--coral)] hover:bg-ink/80 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Write a note
                </button>
              )}
              {addingNote && (
                <NoteComposer
                  onSave={(place, area, text) => {
                    saveNote({ eventId: `manual-${Date.now()}`, eventTitle: place, eventArea: area, text });
                    setAddingNote(false);
                  }}
                  onCancel={() => setAddingNote(false)}
                />
              )}
              {notes.length === 0 && !addingNote
                ? <EmptyTab text='No notes yet. Hit "Write a note" to capture your first memory.' />
                : notes.map((n) => (
                  <NoteCard key={n.id} note={n} onUpdate={(text) => updateNote(n.id, text)} onDelete={() => deleteNote(n.id)} />
                ))
              }
            </div>
          )}
        </div>
      )}

      {zoom && <Lightbox src={zoom.src} title={zoom.title} onClose={() => setZoom(null)} />}
      {diaryPlace && <DiaryModal place={diaryPlace} onClose={() => setDiaryPlace(null)} onZoom={(src, title) => setZoom({ src, title })} />}
    </section>
  );
}

/* ════════════════════════════════════════════════
   Place card
═══════════════════════════════════════════════ */
function PlaceCard({ place, onClick }: { place: PlaceGroup; onClick: () => void }) {
  const bg = place.thumb ?? place.poster;
  const total = place.photos.length + place.collages.length + place.notes.length;

  return (
    <button onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border-2 border-ink shadow-poster-sm bg-cream aspect-[3/4] flex flex-col justify-end hover:-translate-y-1 transition-transform duration-200"
    >
      {bg
        ? <img src={bg} alt={place.eventTitle} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        : <div className="absolute inset-0 bg-lemon flex items-center justify-center"><span className="text-5xl">📍</span></div>
      }
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />

      {/* Info */}
      <div className="relative p-3 text-left">
        <p className="font-display text-lg text-paper leading-tight">{place.eventTitle}</p>
        {place.eventArea && (
          <p className="text-paper/70 text-xs flex items-center gap-0.5 mt-0.5">
            <MapPin className="h-3 w-3" />{place.eventArea}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {place.photos.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-paper/20 backdrop-blur-sm text-paper text-xs font-bold px-2 py-0.5 rounded-full border border-paper/30">
              <Camera className="h-3 w-3" />{place.photos.length}
            </span>
          )}
          {place.collages.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-coral/80 text-paper text-xs font-bold px-2 py-0.5 rounded-full border border-paper/30">
              <BookOpen className="h-3 w-3" />{place.collages.length}
            </span>
          )}
          {place.notes.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-lemon/80 text-ink text-xs font-bold px-2 py-0.5 rounded-full border border-ink/20">
              <StickyNote className="h-3 w-3" />{place.notes.length}
            </span>
          )}
        </div>
      </div>

      {/* Hover cue */}
      <div className="absolute inset-0 border-4 border-coral rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
}

/* ════════════════════════════════════════════════
   Diary modal
═══════════════════════════════════════════════ */
function DiaryModal({ place, onClose, onZoom }: {
  place: PlaceGroup;
  onClose: () => void;
  onZoom: (src: string, title?: string) => void;
}) {
  const date = new Date(place.latestAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

  // Interleave items for a scrapbook feel: photos first as polaroids, then collages, then notes
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="min-h-full mx-auto max-w-2xl px-4 py-8"
      >
        {/* Page */}
        <div className="bg-[#fdf8f0] border-2 border-ink rounded-3xl shadow-[6px_6px_0_0_var(--coral)] overflow-hidden">

          {/* Cover strip */}
          <div className="relative h-52 sm:h-64 overflow-hidden">
            {place.thumb ?? place.poster
              ? <img src={(place.thumb ?? place.poster)!} alt={place.eventTitle} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-lemon flex items-center justify-center text-7xl">📍</div>
            }
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fdf8f0]" />
          </div>

          {/* Header */}
          <div className="px-6 sm:px-8 pb-2 -mt-4 relative">
            <h2 className="font-display text-4xl sm:text-5xl leading-tight">{place.eventTitle}</h2>
            <p className="text-ink/60 text-sm mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />{place.eventArea} · last memory {date}
            </p>
            <div className="h-px bg-ink/10 mt-5" />
          </div>

          {/* Diary content */}
          <div className="px-6 sm:px-8 pb-8 space-y-8 mt-4">

            {/* Photos — polaroid grid */}
            {place.photos.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-4 flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5" /> Photos
                </p>
                <div className="flex flex-wrap gap-4 justify-start">
                  {place.photos.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => onZoom(p.dataUrl)}
                      style={{ transform: tilt(i) }}
                      className="bg-white p-2 pb-8 border-2 border-ink/20 shadow-[2px_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[2px_6px_16px_rgba(0,0,0,0.25)] hover:z-10 relative transition-shadow"
                    >
                      <img src={p.dataUrl} alt="" className="w-28 h-28 sm:w-36 sm:h-36 object-cover block" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Collages — full width */}
            {place.collages.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-4 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" /> Collages
                </p>
                <div className="space-y-4">
                  {place.collages.map((c) => (
                    <button key={c.id} onClick={() => onZoom(c.dataUrl, c.eventTitle)}
                      className="block w-full overflow-hidden border-2 border-ink/20 rounded-xl shadow-[2px_4px_12px_rgba(0,0,0,0.12)] hover:shadow-[2px_6px_16px_rgba(0,0,0,0.2)] transition-shadow"
                    >
                      <img src={c.dataUrl} alt={c.eventTitle} className="w-full h-auto block" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes — torn paper style */}
            {place.notes.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-4 flex items-center gap-2">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </p>
                <div className="space-y-4">
                  {place.notes.map((n, i) => (
                    <DiaryNote key={n.id} note={n} i={i} />
                  ))}
                </div>
              </div>
            )}

            {place.photos.length === 0 && place.collages.length === 0 && place.notes.length === 0 && (
              <p className="text-ink/40 text-center py-8">No memories here yet.</p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button onClick={onClose}
          className="mt-6 mx-auto flex items-center gap-2 px-5 py-2.5 bg-paper border-2 border-ink rounded-full font-bold shadow-[2px_2px_0_0_var(--coral)] hover:bg-cream transition-colors"
        >
          <X className="h-4 w-4" /> Close diary
        </button>
      </div>
    </div>
  );
}

/* Inline diary note (read-only in modal) */
function DiaryNote({ note, i }: { note: ScrapbookNote; i: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.text.length > 280;
  const preview = isLong && !expanded ? note.text.slice(0, 280) + "…" : note.text;
  const noteBgs = ["bg-lemon", "bg-mint", "bg-[#fce4d6]", "bg-sky/30", "bg-lemon"];
  const bg = noteBgs[i % noteBgs.length];
  const date = new Date(note.updatedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={cn("relative rounded-xl border-2 border-ink/20 p-5 shadow-[2px_3px_8px_rgba(0,0,0,0.08)]", bg)}>
      <p className="text-xs text-ink/40 mb-2">{date}</p>
      <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap font-medium">{preview}</p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-coral hover:underline"
        >
          {expanded ? <><ChevronUp className="h-3 w-3" />Show less</> : <><ChevronDown className="h-3 w-3" />Read more</>}
        </button>
      )}
      {/* tape strip decoration */}
      <div className="absolute -top-2 left-8 w-12 h-4 bg-white/60 border border-ink/10 rounded-sm" />
    </div>
  );
}

/* ════════════════════════════════════════════════
   Note composer & card (all-memories section)
═══════════════════════════════════════════════ */
function NoteComposer({ onSave, onCancel }: { onSave: (place: string, area: string, text: string) => void; onCancel: () => void }) {
  const [place, setPlace] = useState("");
  const [area, setArea] = useState("");
  const [text, setText] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textRef.current?.focus(); }, []);
  const canSave = place.trim().length > 0 && text.trim().length > 0;

  return (
    <div className="bg-lemon border-2 border-ink rounded-2xl p-5 shadow-[3px_3px_0_0_var(--coral)]">
      <div className="flex gap-3 mb-3">
        <input value={place} onChange={(e) => setPlace(e.target.value)}
          placeholder="Place name (e.g. Irene Farm Market)"
          className="flex-1 px-3 py-2 bg-paper border-2 border-ink rounded-lg text-sm font-bold placeholder:font-normal placeholder:text-ink/40 outline-none focus:border-coral"
        />
        <input value={area} onChange={(e) => setArea(e.target.value)}
          placeholder="Area"
          className="w-32 px-3 py-2 bg-paper border-2 border-ink rounded-lg text-sm placeholder:text-ink/40 outline-none focus:border-coral"
        />
      </div>
      <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Write about your experience — who you were with, what you ate, how it felt… ✍️"
        rows={5}
        className="w-full px-3 py-2.5 bg-paper border-2 border-ink rounded-lg text-sm placeholder:text-ink/40 outline-none focus:border-coral resize-none leading-relaxed"
      />
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-ink/10 transition-colors">Cancel</button>
        <button onClick={() => canSave && onSave(place.trim(), area.trim(), text.trim())} disabled={!canSave}
          className={cn("inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-2 border-ink rounded-full transition-colors",
            canSave ? "bg-coral text-paper hover:bg-coral/80" : "bg-ink/20 text-ink/40 cursor-not-allowed"
          )}
        >
          <Check className="h-4 w-4" /> Save note
        </button>
      </div>
    </div>
  );
}

function NoteCard({ note, onUpdate, onDelete }: { note: ScrapbookNote; onUpdate: (text: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const date = new Date(note.updatedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  const isLong = note.text.length > 220;
  const preview = isLong && !expanded ? note.text.slice(0, 220) + "…" : note.text;
  useEffect(() => { if (editing) textRef.current?.focus(); }, [editing]);

  return (
    <div className="bg-paper border-2 border-ink rounded-2xl p-5 shadow-poster-sm group relative">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-base leading-tight">{note.eventTitle}</p>
          {note.eventArea && <p className="text-xs text-ink/50 mt-0.5">{note.eventArea} · {date}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          {!editing && (
            <button onClick={() => { setDraft(note.text); setEditing(true); }}
              className="h-8 w-8 grid place-items-center bg-cream border-2 border-ink rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit">
              <PenLine className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => { if (confirm("Delete this note?")) onDelete(); }}
            className="h-8 w-8 grid place-items-center bg-cream border-2 border-ink rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {editing ? (
        <>
          <textarea ref={textRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={6}
            className="w-full px-3 py-2.5 bg-cream border-2 border-ink rounded-lg text-sm outline-none focus:border-coral resize-none leading-relaxed"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-ink/10">Cancel</button>
            <button onClick={() => { if (draft.trim()) { onUpdate(draft.trim()); setEditing(false); } }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold border-2 border-ink rounded-full bg-coral text-paper hover:bg-coral/80">
              <Check className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-wrap">{preview}</p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-coral hover:underline">
              {expanded ? <><ChevronUp className="h-3 w-3" />Show less</> : <><ChevronDown className="h-3 w-3" />Read more</>}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Shared helpers
═══════════════════════════════════════════════ */
function EmptyTab({ text }: { text: string }) {
  return <div className="border-2 border-dashed border-ink/30 rounded-2xl p-8 text-center text-ink/70">{text}</div>;
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
      } else { handleDownload(e); }
    } catch { handleDownload(e); }
  };
  return (
    <div className="group relative">
      <button onClick={onOpen} className="block w-full bg-cream border-2 border-ink rounded-xl overflow-hidden shadow-poster-sm hover:-translate-y-0.5 transition-transform">
        <img src={collage.dataUrl} alt={collage.eventTitle} className="w-full h-auto block" />
      </button>
      <div className="mt-2 px-1">
        <p className="font-bold text-sm leading-tight truncate">{collage.eventTitle}</p>
        <p className="text-xs text-ink/60">{collage.eventArea} · {date}</p>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleShare} className="h-8 w-8 grid place-items-center bg-paper border-2 border-ink rounded-full" aria-label="Share"><Share2 className="h-3.5 w-3.5" /></button>
        <button onClick={handleDownload} className="h-8 w-8 grid place-items-center bg-paper border-2 border-ink rounded-full" aria-label="Download"><Download className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this collage?")) onDelete(); }}
          className="h-8 w-8 grid place-items-center bg-paper border-2 border-ink rounded-full" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function Lightbox({ src, title, onClose }: { src: string; title?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 h-10 w-10 grid place-items-center bg-paper border-2 border-ink rounded-full shadow-[2px_2px_0_0_var(--coral)]" aria-label="Close">
        <X className="h-5 w-5" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-w-3xl w-full">
        <img src={src} alt={title ?? ""} className="max-h-[85vh] w-auto mx-auto border-2 border-ink rounded-lg shadow-poster" />
        {title && <p className="mt-3 text-center text-paper font-bold">{title}</p>}
      </div>
    </div>
  );
}
