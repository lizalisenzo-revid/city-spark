import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddToCalendarDialog, type EditingEvent } from "@/components/AddToCalendarDialog";
import { toast } from "sonner";
import {
  CalendarPlus, ChevronLeft, ChevronRight, Trash2, Sparkles,
  LogOut, Home, Calendar as CalIcon, Pencil, GripVertical, ChevronDown,
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

const HOUR_START = 7;   // 7am
const HOUR_END = 24;    // midnight (exclusive)
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const HOUR_PX = 56;     // height of one hour row in expanded view

// Lookup poster image by seed event id
const POSTER_BY_ID: Record<string, string> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e.poster])
);

function CalendarPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"day" | "week">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | undefined>();
  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const range = useMemo(() => {
    if (view === "day") {
      const d = ymd(anchor);
      return { start: d, end: d };
    }
    const start = startOfWeek(anchor);
    const end = new Date(start); end.setDate(start.getDate() + 6);
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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, range.start, range.end]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("scheduled_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEvents((e) => e.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  // Move an event to a new (date, time) — optimistic update
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

  const days = view === "day" ? [new Date(anchor)] : weekDays(anchor);

  return (
    <div className="min-h-screen bg-paper text-ink">
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
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-coral hover:text-paper"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="sticker"><Sparkles className="h-3.5 w-3.5" /> Your calendar</span>
            <h1 className="font-display text-5xl sm:text-6xl mt-3">
              Plan your <em className="text-coral not-italic">whole week</em>
            </h1>
            <p className="text-ink/70 mt-2">Tap a day to expand it. Drag sticky notes to shuffle your plans.</p>
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
          <button onClick={() => shift(setAnchor, anchor, view, -1)} className="h-10 w-10 grid place-items-center border-2 border-ink rounded-full bg-cream hover:bg-lemon">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-2xl">{rangeLabel(view, anchor)}</h2>
          <button onClick={() => shift(setAnchor, anchor, view, 1)} className="h-10 w-10 grid place-items-center border-2 border-ink rounded-full bg-cream hover:bg-lemon">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Grid — items-start so each column has independent height */}
        <div className={cn(
          "grid gap-3 items-start",
          view === "day" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-7"
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
                onToggleExpand={() => setExpandedDay(expandedDay === key ? null : key)}
                events={dayEvents}
                onAdd={() => { setEditingEvent(null); setDialogDate(key); setDialogOpen(true); }}
                onEdit={(ev) => { setEditingEvent(ev); setDialogOpen(true); }}
                onDelete={handleDelete}
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

/* ---------- Day column (collapsed list OR expanded time grid) ---------- */

interface DayColumnProps {
  dateKey: string;
  date: Date;
  isToday: boolean;
  isExpanded: boolean;
  allowExpandToggle: boolean;
  onToggleExpand: () => void;
  events: ScheduledEvent[];
  onAdd: () => void;
  onEdit: (ev: EditingEvent) => void;
  onDelete: (id: string) => void;
  onMoveEvent: (id: string, newDate: string, newTime: string) => void;
}

function DayColumn(props: DayColumnProps) {
  const {
    dateKey, date, isToday, isExpanded, allowExpandToggle, onToggleExpand,
    events, onAdd, onEdit, onDelete, onMoveEvent,
  } = props;

  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  // Drop on collapsed column → keep original time, just change date
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
        isExpanded ? "min-h-[200px]" : "min-h-[180px]"
      )}
      onDragOver={(e) => { if (!isExpanded) e.preventDefault(); }}
      onDrop={(e) => { if (!isExpanded) handleColumnDrop(e); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={allowExpandToggle ? onToggleExpand : undefined}
          className={cn(
            "flex items-center gap-2 text-left rounded-md px-1 -mx-1",
            allowExpandToggle && "hover:bg-paper"
          )}
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

      {/* Body */}
      {isExpanded ? (
        <ExpandedDay
          dateKey={dateKey}
          events={events}
          dragOverHour={dragOverHour}
          setDragOverHour={setDragOverHour}
          onMoveEvent={onMoveEvent}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <div className="flex-1 space-y-2">
          {events.length === 0 ? (
            <p className="text-xs text-ink/40 italic mt-2">Drop a sticky here ✨</p>
          ) : events.map((e, i) => (
            <StickyNote
              key={e.id}
              ev={e}
              tilt={STICKY_TILT[i % STICKY_TILT.length]}
              onEdit={onEdit}
              onDelete={onDelete}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Expanded day with hour grid ---------- */

interface ExpandedDayProps {
  dateKey: string;
  events: ScheduledEvent[];
  dragOverHour: number | null;
  setDragOverHour: (h: number | null) => void;
  onMoveEvent: (id: string, newDate: string, newTime: string) => void;
  onEdit: (ev: EditingEvent) => void;
  onDelete: (id: string) => void;
}

function ExpandedDay({ dateKey, events, dragOverHour, setDragOverHour, onMoveEvent, onEdit, onDelete }: ExpandedDayProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative mt-1" style={{ height: HOURS.length * HOUR_PX }}>
      {/* Hour rows */}
      <div ref={gridRef} className="absolute inset-0">
        {HOURS.map((h) => (
          <div
            key={h}
            className={cn(
              "border-t border-dashed border-ink/20 flex items-start gap-2 pl-10 pr-1 transition-colors",
              dragOverHour === h && "bg-lemon/40"
            )}
            style={{ height: HOUR_PX }}
            onDragOver={(e) => { e.preventDefault(); setDragOverHour(h); }}
            onDragLeave={() => { if (dragOverHour === h) setDragOverHour(null); }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/event-id");
              if (id) onMoveEvent(id, dateKey, `${String(h).padStart(2, "0")}:00:00`);
              setDragOverHour(null);
            }}
          >
            <span className="absolute left-0 -mt-2 text-[10px] font-bold text-ink/40 w-9 text-right pr-1">
              {fmtHour(h)}
            </span>
          </div>
        ))}
      </div>

      {/* Sticky notes positioned by start time */}
      <div className="absolute inset-0 pl-10 pr-1 pointer-events-none">
        {events.map((e, i) => {
          const [hh, mm] = e.start_time.split(":").map(Number);
          const top = (hh - HOUR_START) * HOUR_PX + (mm / 60) * HOUR_PX;
          if (top < 0 || top > HOURS.length * HOUR_PX) return null;
          return (
            <div
              key={e.id}
              className="absolute left-10 right-1 pointer-events-auto"
              style={{ top }}
            >
              <StickyNote
                ev={e}
                tilt={STICKY_TILT[i % STICKY_TILT.length]}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Sticky note component ---------- */

interface StickyProps {
  ev: ScheduledEvent;
  tilt: string;
  onEdit: (ev: EditingEvent) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

function StickyNote({ ev, tilt, onEdit, onDelete, compact }: StickyProps) {
  const poster = ev.event_id ? POSTER_BY_ID[ev.event_id] : undefined;
  const bg = ev.color ? COLOR_BG[ev.color] ?? "bg-paper" : "bg-paper";

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/event-id", ev.id);
    e.dataTransfer.setData("text/event-time", ev.start_time);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group relative border-2 border-ink rounded-lg shadow-[2px_2px_0_0_var(--ink)] cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-0.5",
        bg, tilt,
        compact ? "p-1.5 pr-7" : "p-2 pr-8"
      )}
    >
      <div className="flex items-center gap-2">
        {poster ? (
          <img
            src={poster}
            alt=""
            className={cn("rounded object-cover border border-ink/40 shrink-0", compact ? "h-9 w-9" : "h-10 w-10")}
            draggable={false}
          />
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
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(ev as EditingEvent); }}
          className="h-5 w-5 grid place-items-center bg-paper border border-ink rounded"
          aria-label="Edit"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }}
          className="h-5 w-5 grid place-items-center bg-paper border border-ink rounded"
          aria-label="Delete"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}

/* ---------- Date helpers ---------- */

function ymd(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d); const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow); x.setHours(0,0,0,0); return x;
}
function weekDays(d: Date) {
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(s); x.setDate(s.getDate() + i); return x; });
}
function shift(set: (d: Date) => void, cur: Date, view: "day" | "week", dir: 1 | -1) {
  const x = new Date(cur);
  if (view === "day") x.setDate(x.getDate() + dir);
  else x.setDate(x.getDate() + dir * 7);
  set(x);
}
function rangeLabel(view: "day" | "week", d: Date) {
  if (view === "day") return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`;
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return m === 0 ? `${hh}${period}` : `${hh}:${String(m).padStart(2,"0")}${period}`;
}
function fmtHour(h: number) {
  const period = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}${period}`;
}
