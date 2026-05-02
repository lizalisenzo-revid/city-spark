import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getSharedMemory, getSharedMemoryItems,
  addSharedMemoryItem, deleteSharedMemoryItem,
  fileToSharedDataUrl,
  type SharedMemory, type SharedMemoryItem,
} from "@/lib/sharedMemory";
import { MapPin, Camera, StickyNote, Plus, Trash2, LogIn, Home, Upload, X, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/memory/$memoryId")({
  head: () => ({ meta: [{ title: "Shared Memory — today." }] }),
  component: SharedMemoryPage,
});

const tilts = [-3, -1.5, 0, 1.5, 3, -2, 2, -1, 1, -2.5];
function tilt(i: number) { return `rotate(${tilts[i % tilts.length]}deg)`; }

function SharedMemoryPage() {
  const { memoryId } = Route.useParams() as { memoryId: string };
  const { user } = useAuth();
  const [memory, setMemory] = useState<SharedMemory | null>(null);
  const [items, setItems] = useState<SharedMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const displayName = user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "You";

  const load = async () => {
    try {
      const mem = await getSharedMemory(memoryId);
      if (!mem) { setNotFound(true); setLoading(false); return; }
      setMemory(mem);
      const its = await getSharedMemoryItems(memoryId);
      setItems(its);
    } catch {
      setNotFound(true);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [memoryId]);
  useEffect(() => { if (addingNote) noteRef.current?.focus(); }, [addingNote]);

  const handlePhotos = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToSharedDataUrl(file);
        const item = await addSharedMemoryItem(memoryId, user.id, displayName, "photo", dataUrl);
        setItems((prev) => [...prev, item]);
      }
      toast.success("Photos added!");
    } catch { toast.error("Failed to upload photos."); }
    finally { setUploading(false); }
  };

  const handleNote = async () => {
    if (!user || !noteText.trim()) return;
    try {
      const item = await addSharedMemoryItem(memoryId, user.id, displayName, "note", noteText.trim());
      setItems((prev) => [...prev, item]);
      setNoteText(""); setAddingNote(false);
      toast.success("Note added!");
    } catch { toast.error("Failed to save note."); }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Remove this from the shared memory?")) return;
    try {
      await deleteSharedMemoryItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch { toast.error("Couldn't delete item."); }
  };

  const photos = items.filter((i) => i.type === "photo");
  const notes = items.filter((i) => i.type === "note");

  if (loading) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-bounce">📓</div>
        <p className="font-display text-2xl">Loading memory…</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="text-5xl">🔍</div>
        <p className="font-display text-3xl">Memory not found</p>
        <p className="text-ink/60">This link may have expired or never existed.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-paper font-bold border-2 border-ink rounded-full">
          <Home className="h-4 w-4" /> Go home
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-display text-xl tracking-tight flex items-center gap-2">
            <span className="inline-block h-6 w-6 bg-coral border-2 border-ink rounded-full" />
            today<span className="text-coral">.</span>
          </Link>
          {!user && (
            <Link to="/auth" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 border-ink rounded-full bg-coral text-paper">
              <LogIn className="h-4 w-4" /> Sign in to add memories
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Cover */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-lemon border-2 border-ink px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Users className="h-3.5 w-3.5" /> Shared memory
          </div>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight">{memory!.place_title}</h1>
          {memory!.place_area && (
            <p className="text-ink/60 text-sm mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {memory!.place_area}
            </p>
          )}
          <p className="text-ink/40 text-xs mt-1">
            {items.length === 0 ? "No memories yet — be the first to add one!" : `${photos.length} photo${photos.length !== 1 ? "s" : ""} · ${notes.length} note${notes.length !== 1 ? "s" : ""} from ${new Set(items.map(i => i.user_id)).size} contributor${new Set(items.map(i => i.user_id)).size !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-4 flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" /> Photos
            </p>
            <div className="flex flex-wrap gap-4">
              {photos.map((p, i) => (
                <div key={p.id} className="group relative">
                  <button
                    onClick={() => setZoom(p.content)}
                    style={{ transform: tilt(i) }}
                    className="bg-white p-2 pb-8 border-2 border-ink/20 shadow-[2px_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[2px_6px_18px_rgba(0,0,0,0.22)] transition-shadow relative"
                  >
                    <img src={p.content} alt="" className="w-28 h-28 sm:w-36 sm:h-36 object-cover block" />
                    <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-ink/50 font-medium">{p.display_name ?? "Someone"}</p>
                  </button>
                  {user?.id === p.user_id && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="absolute -top-2 -right-2 h-6 w-6 grid place-items-center bg-paper border-2 border-ink rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-4 flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5" /> Notes
            </p>
            <div className="space-y-4">
              {notes.map((n, i) => {
                const noteBgs = ["bg-lemon", "bg-[#fce4d6]", "bg-mint/40", "bg-sky/20"];
                return (
                  <div key={n.id} className={cn("relative rounded-xl border-2 border-ink/20 p-5 shadow-sm group", noteBgs[i % noteBgs.length])}>
                    <div className="absolute -top-2 left-8 w-10 h-3.5 bg-white/60 border border-ink/10 rounded-sm" />
                    <p className="text-xs font-bold text-ink/50 mb-2">
                      {n.display_name ?? "Someone"} · {new Date(n.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap">{n.content}</p>
                    {user?.id === n.user_id && (
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="absolute top-3 right-3 h-7 w-7 grid place-items-center bg-white/60 border border-ink/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="border-2 border-dashed border-ink/30 rounded-2xl p-10 text-center text-ink/50 mb-8">
            <div className="text-4xl mb-3">📷</div>
            <p className="font-display text-2xl text-ink/60">Nothing here yet</p>
            <p className="text-sm mt-1">Be the first to add a photo or write a note.</p>
          </div>
        )}

        {/* Add memories panel */}
        {user ? (
          <div className="border-2 border-ink rounded-2xl p-5 bg-cream shadow-[3px_3px_0_0_var(--coral)]">
            <p className="font-bold text-sm mb-4">Add your memories</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper font-bold border-2 border-ink rounded-full text-sm hover:bg-ink/80 transition-colors disabled:opacity-50"
              >
                {uploading ? <span className="animate-spin">⏳</span> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Add photos"}
              </button>
              <button
                onClick={() => setAddingNote(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-lemon font-bold border-2 border-ink rounded-full text-sm hover:bg-lemon/70 transition-colors"
              >
                <Plus className="h-4 w-4" /> Write a note
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotos(e.target.files)} />
            </div>
            {addingNote && (
              <div>
                <textarea
                  ref={noteRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write about what you experienced here — who you were with, what you loved…"
                  rows={4}
                  className="w-full px-3 py-2.5 bg-paper border-2 border-ink rounded-lg text-sm outline-none focus:border-coral resize-none leading-relaxed"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => { setAddingNote(false); setNoteText(""); }} className="px-3 py-1.5 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-ink/10">Cancel</button>
                  <button
                    onClick={handleNote}
                    disabled={!noteText.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold border-2 border-ink rounded-full bg-coral text-paper hover:bg-coral/80 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-ink/30 rounded-2xl p-6 text-center">
            <p className="font-bold mb-2">Want to add your photos and notes?</p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-paper font-bold border-2 border-ink rounded-full text-sm">
              <LogIn className="h-4 w-4" /> Sign in to contribute
            </Link>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {zoom && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm grid place-items-center p-4" onClick={() => setZoom(null)}>
          <button onClick={() => setZoom(null)} className="absolute top-4 right-4 h-10 w-10 grid place-items-center bg-paper border-2 border-ink rounded-full">
            <X className="h-5 w-5" />
          </button>
          <img src={zoom} alt="" className="max-h-[85vh] max-w-full border-2 border-ink rounded-lg shadow-poster" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
