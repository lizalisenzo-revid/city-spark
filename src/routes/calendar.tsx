import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddToCalendarDialog, type EditingEvent } from "@/components/AddToCalendarDialog";
import { toast } from "sonner";
import {
  CalendarPlus, ChevronLeft, ChevronRight, Trash2, Sparkles,
  LogOut, Home, Calendar as CalIcon, Pencil, GripVertical, ChevronDown, Archive, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENTS } from "@/data/events";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Your Calendar — today." },
      { name: "description", content: "Your personal day & week planner. Drag sticky-note events around your calendar." },
    ],
  }),
  component: CalendarPage,
});

interface ScheduledEvent {
  id: string;
  event_id: string | null;
  title: string;
  notes: string | null;
  location: string | null;
  scheduled_date: string;
  start_time: string;
  duration_minutes: number;
  color: string | null;
}

const COLOR_BG: Record<string, string> = {
  coral: "bg-coral", tangerine: "bg-tangerine", lemon: "bg-lemon",
  mint: "bg-mint", sky: "bg-sky", lilac: "bg-lilac", magenta: "bg-magenta",
};
const STICKY_TILT = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "rotate-0"];
const NIGHT_HOUR = 17;
const DEFAULT_DAY_TIME = "10:00:00";
const DEFAULT_NIGHT_TIME = "19:00:00";

const POSTER_BY_ID: Record<string, string> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e.poster])
);

function CalendarPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"day" | "week">("week");
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | undefined>();
  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveEvents, setArchiveEvents] = useState<ScheduledEvent[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const range = useMemo(() => {
    if (view === "day") {
      const d = ymd(anchor);
      return { start: d, end: d };
    }
    const start = new Date(anchor); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 4);
    return { start: ymd(start), end: ymd(end) };
  }, [view, anchor]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("scheduled_events")
      .select("*")
      .gte("scheduled_date", range.start)
      .lte("scheduled_date", range.end)
      .order("scheduled_date").order("start_time");
    if (error) { toast.error(error.message); return; }
    setEvents((data ?? []) as ScheduledEvent[]);
  };

  const loadArchive = async () => {
    if (!user) return;
    const today = ymd(new Date());
    const { data, error } = await supabase
      .from("scheduled_events")
      .select("*")
      .lt("scheduled_date", today)
      .order("scheduled_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(50);
    if (error) { toast.error(error.message); return; }
    setArchiveEvents((data ?? []) as ScheduledEvent[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, range.start, range.end]);
  useEffect(() => { if (showArchive) loadArchive(); /* eslint-disable-next-line */ }, [showArchive, user]);

  // Delete with confirmation
  const requestDelete = (id: string) => setDeleteConfirm(id);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);
    const { error } = await supabase.from("scheduled_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEvents((e) => e.filter((x) => x.id !== id));
    setArchiveEvents((e) => e.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  const moveEvent = async (id: string, newDate: string, newTime: string) => {
    const prev = events;
    setEvents((es) => es.map((e) => e.id === id ? { ...e, scheduled_date: newDate, start_time: newTime } : e));
    const { error } = await supabase
      .from("scheduled_events")
      .update({ scheduled_date: newDate, start_time: newTime })
      .eq("id", id);
    if (error) { setEvents(prev); toast.error(error.message); }
  };

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-ink/60">Loading…</div>;
  }

  const days = view === "day" ? [new Date(anchor)] : nDays(anchor, 5);
  const todayKey = ymd(new Date());
  const canGoBack = ymd(anchor) > todayKey;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 backdrop-blur-sm px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm bg-cream border-2 border-ink shadow-poster rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl mb-2">Remove this plan?</h3>
            <p className="text-sm text-ink/70 mb-5">This can't be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border-2 border-ink rounded-full font-bold text-sm hover:bg-lemon"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-coral text-paper border-2 border-ink rounded-full font-bold text-sm shadow-[2px_2px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform"
              >
                Yes, remove
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl">
            <span className="inline-block h-7 w-7 bg-coral border-2 border-ink rounded-full" />
            today<span className="text-coral">.</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-lemon">
              <Home className="h-4 w-4" /> <span className="hidden sm:inline">Discover</span>
            </Link>
            <button
              onClick={() => { setShowArchive(!showArchive); }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 border-ink rounded-full transition-colors",
                showArchive ? "bg-ink text-paper" : "bg-cream hover:bg-lemon"
              )}
            >
              <Archive className="h-4 w-4" /> <span className="hidden sm:inline">Archive</span>
            </button>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-coral hover:text-paper"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── ARCHIVE PANEL ── */}
        {showArchive ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-4xl sm:text-5xl">
                  Past <em className="text-coral not-italic">plans</em>
                </h1>
                <p className="text-ink/70 mt-1">Everything you've done — your personal history.</p>
              </div>
              <button onClick={() => setShowArchive(false)} className="h-10 w-10 grid place-items-center border-2 border-ink rounded-full bg-cream hover:bg-lemon">
                <X className="h-4 w-4" />
              </button>
            </div>

            {archiveEvents.length === 0 ? (
              <div className="border-2 border-dashed border-ink/30 rounded-2xl p-12 text-center">
                <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-display text-2xl text-ink/60">No past plans yet</p>
                <p className="text-ink/50 mt-1">Events from previous dates will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {archiveEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-4 bg-cream border-2 border-ink rounded-xl px-4 py-3 shadow-[2px_2px_0_0_var(--ink)]">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{ev.title}</p>
                      <p className="text-xs text-ink/60">
                        {new Date(ev.scheduled_date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {fmtTime(ev.start_time)}
                        {ev.location ? ` · ${ev.location}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => requestDelete(ev.id)}
                      className="h-8 w-8 grid place-items-center border-2 border-ink rounded-full bg-paper hover:bg-coral hover:text-paper shrink-0"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        ) : (
          /* ── MAIN CALENDAR ── */
          <>
            <section className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <span className="sticker"><Sparkles className="h-3.5 w-3.5" /> Your calendar</span>
                <h1 className="font-display text-5xl sm:text-6xl mt-3">
                  Plan your <em className="text-coral not-italic">whole week</em>
                </h1>
                <p className="text-ink/70 mt-2">
                  Tap a day to expand it.{" "}
                  <span className="hidden sm:inline">Drag sticky notes to shuffle your plans · </span>
                  Tap ✏️ to edit on mobile.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 bg-cream border-2 border-ink rounded-full">
                  {(["day", "week"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => { setView(v); setExpandedDay(null); }}
                      className={cn(
                        "px-4 py-1.5 rounded-full font-bold text-sm capitalize",
                        view === v ? "bg-ink text-paper" : "text-ink/60"
                      )}
                    >{v}</button>
                  ))}
                </div>
                <button
                  onClick={() => { setEditingEvent(null); setDialogDate(ymd(anchor)); setDialogOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform"
                >
                  <CalendarPlus className="h-4 w-4" /> Add event
                </button>
              </div>
            </section>

            {/* Nav */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => shift(setAnchor, anchor, view, -1)}
                disabled={!canGoBack}
                className="h-10 w-10 grid place-items-center border-2 border-ink rounded-full bg-cream hover:bg-lemon disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="font-display text-2xl">{rangeLabel(view, anchor)}</h2>
              <button onClick={() => shift(setAnchor, anchor, view, 1)} className="h-10 w-10 grid place-items-center border-2 border-ink rounded-full bg-cream hover:bg-lemon" aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className={cn(
              "grid gap-3 items-start",
              view === "day" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-5"
            )}>
              {days.map((d) => {
                const key = ymd(d);
                const dayEvents = events.filter((e) => e.scheduled_date === key);
                const isToday = key === ymd(new Date());
                const isExpanded = view === "day" || expandedDay === key;

                return (
                  <DayColumn
                    key={key}
                    dateKey={key}
                    date={d}
                    isToday={isToday}
                    isExpanded={isExpanded}
                    isWeekView={view === "week"}
                    onToggleExpand={() => setExpandedDay(expandedDay === key ? null : key)}
                    events={dayEvents}
                    onAdd={() => { setEditingEvent(null); setDialogDate(key); setDialogOpen(true); }}
                    onEdit={(ev) => { setEditingEvent(ev); setDialogOpen(true); }}
                    onDelete={requestDelete}
                    onMoveEvent={moveEvent}
                    allowExpandToggle={view === "week"}
                  />
                );
              })}
            </div>

            {events.length === 0 && (
              <div className="mt-8 text-center text-ink/60">
                <CalIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Your week is wide open. <Link to="/" className="font-bold underline hover:text-coral">Browse what's on</Link> and tap "Add to calendar" on anything you like.</p>
              </div>
            )}
          </>
        )}
      </main>

      <AddToCalendarDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingEvent(null); }}
        defaultDate={dialogDate}
        editing={editingEvent}
        onSaved={load}
      />
    </div>
  );
}

/* ── Day Column ── */
interface DayColumnProps {
  dateKey: string; date: Date; isToday: boolean; isExpanded: boolean;
  allowExpandToggle: boolean; isWeekView: boolean; onToggleExpand: () => void;
  events: ScheduledEvent[]; onAdd: () => void; onEdit: (ev: EditingEvent) => void;
  onDelete: (id: string) => void; onMoveEvent: (id: string, newDate: string, newTime: string) => void;
}

function DayColumn(props: DayColumnProps) {
  const { dateKey, date, isToday, isExpanded, allowExpandToggle, isWeekView, onToggleExpand, events, onAdd, onEdit, onDelete, onMoveEvent } = props;

  const handleColumnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/event-id");
    const origTime = e.dataTransfer.getData("text/event-time");
    if (id && origTime) onMoveEvent(id, dateKey, origTime);
  };

  return (
    <div
      className={cn(
        "bg-cream border-2 border-ink rounded-xl p-3 flex flex-col transition-all",
        isToday && "shadow-[3px_3px_0_0_var(--coral)]",
        isExpanded ? "min-h-[200px]" : "min-h-[180px]",
        isWeekView && isExpanded && "md:col-span-3"
      )}
      onDragOver={(e) => { if (!isExpanded) e.preventDefault(); }}
      onDrop={(e) => { if (!isExpanded) handleColumnDrop(e); }}
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={allowExpandToggle ? onToggleExpand : undefined}
          className={cn("flex items-center gap-2 text-left rounded-md px-1 -mx-1", allowExpandToggle && "hover:bg-paper")}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink/60">
              {date.toLocaleDateString("en-ZA", { weekday: "short" })}
            </p>
            <p className="font-display text-2xl leading-none">{date.getDate()}</p>
          </div>
          {allowExpandToggle && (
            <ChevronDown className={cn("h-4 w-4 text-ink/50 transition-transform", isExpanded && "rotate-180")} />
          )}
        </button>
        <button
          onClick={onAdd}
          className="h-7 w-7 grid place-items-center border-2 border-ink rounded-full bg-paper hover:bg-lemon text-xs font-bold"
          aria-label="Add event"
        >+</button>
      </div>

      {isExpanded ? (
        <ExpandedDay dateKey={dateKey} events={events} onMoveEvent={onMoveEvent} onEdit={onEdit} onDelete={onDelete} />
      ) : (
        <div className="flex-1 space-y-2">
          {events.length === 0 ? (
            <p className="text-xs text-ink/40 italic mt-2">Drop a sticky here ✨</p>
          ) : events.map((e, i) => (
            <StickyNote key={e.id} ev={e} tilt={STICKY_TILT[i % STICKY_TILT.length]} onEdit={onEdit} onDelete={onDelete} compact />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Expanded Day ── */
function isNight(time: string) {
  const h = Number(time.slice(0, 2));
  return h >= NIGHT_HOUR || h < 5;
}

function ExpandedDay({ dateKey, events, onMoveEvent, onEdit, onDelete }: {
  dateKey: string; events: ScheduledEvent[];
  onMoveEvent: (id: string, newDate: string, newTime: string) => void;
  onEdit: (ev: EditingEvent) => void; onDelete: (id: string) => void;
}) {
  const day = events.filter((e) => !isNight(e.start_time)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const night = events.filter((e) => isNight(e.start_time)).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="mt-2 grid gap-3">
      <Zone label="Daytime" emoji="☀️" accent="bg-lemon" items={day} dateKey={dateKey} onMoveEvent={onMoveEvent} onEdit={onEdit} onDelete={onDelete} defaultTime={DEFAULT_DAY_TIME} />
      <Zone label="Nighttime" emoji="🌙" accent="bg-lilac" items={night} dateKey={dateKey} onMoveEvent={onMoveEvent} onEdit={onEdit} onDelete={onDelete} defaultTime={DEFAULT_NIGHT_TIME} />
    </div>
  );
}

function Zone({ label, emoji, accent, items, dateKey, defaultTime, onMoveEvent, onEdit, onDelete }: {
  label: string; emoji: string; accent: string; items: ScheduledEvent[];
  dateKey: string; defaultTime: string;
  onMoveEvent: (id: string, newDate: string, newTime: string) => void;
  onEdit: (ev: EditingEvent) => void; onDelete: (id: string) => void;
}) {
  const [over, setOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const id = e.dataTransfer.getData("text/event-id");
    const origTime = e.dataTransfer.getData("text/event-time");
    if (!id) return;
    const targetIsNight = label === "Nighttime";
    const sameZone = origTime ? (isNight(origTime) === targetIsNight) : false;
    onMoveEvent(id, dateKey, sameZone ? origTime : defaultTime);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn("rounded-xl border-2 border-ink p-3 transition-colors", over ? "bg-lemon/30" : "bg-paper/60")}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("inline-grid place-items-center h-7 w-7 border-2 border-ink rounded-full text-sm", accent)}>{emoji}</span>
        <h3 className="font-display text-lg leading-none">{label}</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40 ml-auto">{items.length} {items.length === 1 ? "plan" : "plans"}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-ink/40 italic py-3 text-center">Drop a sticky here ✨</p>
      ) : (
        <div className="grid gap-2">
          {items.map((e, i) => (
            <StickyNote key={e.id} ev={e} tilt={STICKY_TILT[i % STICKY_TILT.length]} onEdit={onEdit} onDelete={onDelete} size="large" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sticky Note ── */
interface StickyProps {
  ev: ScheduledEvent; tilt: string;
  onEdit: (ev: EditingEvent) => void; onDelete: (id: string) => void;
  compact?: boolean; size?: "small" | "large";
}

function StickyNote({ ev, tilt, onEdit, onDelete, compact, size = "small" }: StickyProps) {
  const poster = ev.event_id ? POSTER_BY_ID[ev.event_id] : undefined;
  const bg = ev.color ? COLOR_BG[ev.color] ?? "bg-paper" : "bg-paper";
  const isLarge = size === "large" && !compact;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/event-id", ev.id);
    e.dataTransfer.setData("text/event-time", ev.start_time);
    e.dataTransfer.effectAllowed = "move";
  };

  if (isLarge) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        title="Drag to move · tap ✏️ to edit"
        className={cn(
          "group relative border-2 border-ink rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-0.5",
          "shadow-[4px_4px_0_0_var(--ink)]", bg, tilt
        )}
      >
        {poster ? (
          <div className="relative aspect-[16/7] w-full overflow-hidden bg-cream">
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute left-2 bottom-1.5 right-2 text-paper">
              <div className="font-display text-base leading-tight drop-shadow-sm truncate">{ev.title}</div>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">{fmtTime(ev.start_time)}</div>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">{fmtTime(ev.start_time)}</div>
            <div className="font-display text-lg leading-tight truncate">{ev.title}</div>
            {ev.location && <div className="text-[11px] text-ink/60 truncate">{ev.location}</div>}
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
          <button onClick={(e) => { e.stopPropagation(); onEdit(ev as EditingEvent); }} className="h-6 w-6 grid place-items-center bg-paper border border-ink rounded shadow-sm" aria-label="Edit"><Pencil className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} className="h-6 w-6 grid place-items-center bg-paper border border-ink rounded shadow-sm" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      title="Drag to move · tap ✏️ to edit"
      className={cn(
        "group relative border-2 border-ink rounded-lg shadow-[2px_2px_0_0_var(--ink)] cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-0.5",
        bg, tilt, compact ? "p-1.5 pr-7" : "p-2 pr-8"
      )}
    >
      <div className="flex items-center gap-2">
        {poster ? (
          <img src={poster} alt="" className={cn("rounded object-cover border border-ink/40 shrink-0", compact ? "h-9 w-9" : "h-10 w-10")} draggable={false} />
        ) : (
          <div className={cn("rounded border border-ink/40 bg-cream grid place-items-center shrink-0", compact ? "h-9 w-9" : "h-10 w-10")}>
            <GripVertical className="h-3 w-3 text-ink/40" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-xs leading-tight truncate">{ev.title}</div>
          <div className="text-[10px] text-ink/60 mt-0.5">{fmtTime(ev.start_time)}</div>
        </div>
      </div>
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        <button onClick={(e) => { e.stopPropagation(); onEdit(ev as EditingEvent); }} className="h-5 w-5 grid place-items-center bg-paper border border-ink rounded" aria-label="Edit"><Pencil className="h-2.5 w-2.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} className="h-5 w-5 grid place-items-center bg-paper border border-ink rounded" aria-label="Delete"><Trash2 className="h-2.5 w-2.5" /></button>
      </div>
    </div>
  );
}

/* ── Date helpers ── */
function ymd(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function nDays(start: Date, n: number) {
  const s = new Date(start); s.setHours(0,0,0,0);
  return Array.from({ length: n }, (_, i) => { const x = new Date(s); x.setDate(s.getDate() + i); return x; });
}
function shift(set: (d: Date) => void, cur: Date, view: "day" | "week", dir: 1 | -1) {
  const today = new Date(); today.setHours(0,0,0,0);
  const x = new Date(cur);
  if (view === "day") x.setDate(x.getDate() + dir);
  else x.setDate(x.getDate() + dir * 5);
  if (x < today) return;
  set(x);
}
function rangeLabel(view: "day" | "week", d: Date) {
  if (view === "day") return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  const s = new Date(d); const e = new Date(s); e.setDate(s.getDate() + 4);
  return `${s.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`;
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return m === 0 ? `${hh}${period}` : `${hh}:${String(m).padStart(2,"0")}${period}`;
}
