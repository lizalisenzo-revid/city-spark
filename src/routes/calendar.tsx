import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddToCalendarDialog, type EditingEvent } from "@/components/AddToCalendarDialog";
import { toast } from "sonner";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2, Sparkles, LogOut, Home, Calendar as CalIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Your Calendar — today." },
      { name: "description", content: "Your personal day & week planner. Schedule events, eats, and more." },
    ],
  }),
  component: CalendarPage,
});

interface ScheduledEvent {
  id: string;
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

function CalendarPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"day" | "week">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | undefined>();
  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null);

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
            <p className="text-ink/70 mt-2">Add events from posters or your own custom plans.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-cream border-2 border-ink rounded-full">
              {(["day", "week"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
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

        {/* Grid */}
        <div className={cn(
          "grid gap-3",
          view === "day" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-7"
        )}>
          {days.map((d) => {
            const key = ymd(d);
            const dayEvents = events.filter((e) => e.scheduled_date === key);
            const isToday = key === ymd(new Date());
            return (
              <div key={key} className={cn(
                "bg-cream border-2 border-ink rounded-xl p-3 min-h-[200px] flex flex-col",
                isToday && "shadow-[3px_3px_0_0_var(--coral)]"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink/60">
                      {d.toLocaleDateString("en-ZA", { weekday: "short" })}
                    </p>
                    <p className="font-display text-2xl leading-none">
                      {d.getDate()}
                    </p>
                  </div>
                  <button
                    onClick={() => { setDialogDate(key); setDialogOpen(true); }}
                    className="h-7 w-7 grid place-items-center border-2 border-ink rounded-full bg-paper hover:bg-lemon text-xs font-bold"
                    aria-label="Add event"
                  >+</button>
                </div>
                <div className="flex-1 space-y-2">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-ink/40 italic mt-2">Nothing planned.</p>
                  ) : dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        "p-2 border-2 border-ink rounded-lg text-xs group relative",
                        e.color ? COLOR_BG[e.color] ?? "bg-paper" : "bg-paper"
                      )}
                    >
                      <div className="font-bold">{fmtTime(e.start_time)} · {e.title}</div>
                      {e.location && <div className="text-ink/70 mt-0.5">{e.location}</div>}
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="absolute top-1 right-1 h-6 w-6 grid place-items-center bg-paper border border-ink rounded opacity-0 group-hover:opacity-100"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
        onClose={() => setDialogOpen(false)}
        defaultDate={dialogDate}
        onSaved={load}
      />
    </div>
  );
}

function ymd(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d); const dow = (x.getDay() + 6) % 7; // Monday-start
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
