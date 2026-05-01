import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CITIES, CATEGORIES, VIBES, EVENTS, type City, type TimeOfDay, type Vibe, type Category, type CityEvent } from "@/data/events";
import { PosterCard } from "@/components/PosterCard";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { Sun, Moon, Sparkles, Heart, Calendar, ChevronDown, LogIn, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — What's happening in your city" },
      { name: "description", content: "Discover events, eats, and nightlife happening today in Centurion, Pretoria, and Johannesburg. Plan your whole day in one tap." },
      { property: "og:title", content: "Today — Plan your day in your city" },
      { property: "og:description", content: "Browse posters of what's on today around you, save the ones you like, and auto-build your day." },
    ],
  }),
  component: HomePage,
});

type View = "discover" | "plan" | "favs";

function HomePage() {
  const [city, setCity] = useState<City>("Centurion");
  const [time, setTime] = useState<TimeOfDay | "all">("all");
  const [vibe, setVibe] = useState<Vibe | "all">("all");
  const [cat, setCat] = useState<Category | "all">("all");
  const [view, setView] = useState<View>("discover");
  const fav = useFavorites();

  const filtered = useMemo(() => {
    return EVENTS.filter((e) => {
      if (e.city !== city) return false;
      if (view !== "favs" && time !== "all" && e.time !== time) return false;
      if (vibe !== "all" && !e.vibes.includes(vibe)) return false;
      if (cat !== "all" && e.category !== cat) return false;
      return true;
    });
  }, [city, time, vibe, cat, view]);

  const favEvents = useMemo(() => EVENTS.filter((e) => fav.has(e.id)), [fav]);

  // Build a day plan: pick best event per slot
  const plan = useMemo(() => {
    const pool = EVENTS.filter((e) =>
      e.city === city &&
      (vibe === "all" || e.vibes.includes(vibe))
    );
    const slots: { label: string; range: [number, number]; ev?: CityEvent }[] = [
      { label: "Morning", range: [6, 11] },
      { label: "Midday", range: [11, 14] },
      { label: "Afternoon", range: [14, 17] },
      { label: "Sundown", range: [17, 20] },
      { label: "Late Night", range: [20, 28] },
    ];
    return slots.map((s) => {
      const ev = pool.find((e) => {
        const h = e.startHour < 6 ? e.startHour + 24 : e.startHour;
        return h >= s.range[0] && h < s.range[1];
      });
      return { ...s, ev };
    });
  }, [city, vibe]);

  return (
    <div className="min-h-screen text-ink">
      <Header view={view} setView={setView} favCount={fav.ids.length} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* Hero */}
        <section className="pt-8 sm:pt-12 pb-8 relative">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="sticker">
                <Sparkles className="h-3.5 w-3.5" /> {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.85] mt-4 text-ink">
                What's <em className="text-coral not-italic">happening</em>
                <br />
                in <CityPicker city={city} setCity={setCity} />
                <br />
                today<span className="text-magenta">?</span>
              </h1>
              <p className="mt-5 text-lg text-ink/75 max-w-lg">
                Browse the city like a poster wall. Tap what you like, then let us schedule your whole day.
              </p>
            </div>

            {/* Day / Night switch */}
            <DayNightSwitch time={time} setTime={setTime} />
          </div>
        </section>

        {view === "discover" && (
          <>
            <Filters cat={cat} setCat={setCat} vibe={vibe} setVibe={setVibe} />
            <CollageGrid events={filtered} fav={fav} />
          </>
        )}

        {view === "plan" && <DayPlan plan={plan} city={city} vibe={vibe} setVibe={setVibe} fav={fav} />}

        {view === "favs" && (
          <section className="mt-8">
            <h2 className="font-display text-4xl mb-6">Your saved <span className="text-coral">moments</span></h2>
            {favEvents.length === 0 ? (
              <EmptyFavs onBrowse={() => setView("discover")} />
            ) : (
              <CollageGrid events={favEvents} fav={fav} />
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function Header({ view, setView, favCount }: { view: View; setView: (v: View) => void; favCount: number }) {
  const { user } = useAuth();
  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "discover", label: "Discover", icon: <Sparkles className="h-4 w-4" /> },
    { id: "plan", label: "Plan My Day", icon: <Calendar className="h-4 w-4" /> },
    { id: "favs", label: `Saved${favCount ? ` · ${favCount}` : ""}`, icon: <Heart className="h-4 w-4" /> },
  ];
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2 font-display text-2xl tracking-tight">
          <span className="inline-block h-7 w-7 bg-coral border-2 border-ink rounded-full" />
          <span>today<span className="text-coral">.</span></span>
        </a>
        <nav className="flex items-center gap-1 sm:gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-bold border-2 border-ink rounded-full transition-all",
                view === t.id
                  ? "bg-ink text-paper shadow-[2px_2px_0_0_var(--coral)]"
                  : "bg-cream hover:bg-lemon"
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
          <Link
            to={user ? "/calendar" : "/auth"}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-bold border-2 border-ink rounded-full bg-coral text-paper shadow-[2px_2px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform"
          >
            {user ? <UserIcon className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span className="hidden sm:inline">{user ? "My Calendar" : "Sign in"}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function CityPicker({ city, setCity }: { city: City; setCity: (c: City) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-1 bg-lemon border-2 border-ink shadow-poster-sm rounded-lg hover:bg-tangerine transition-colors -rotate-1"
      >
        {city}
        <ChevronDown className={cn("h-7 w-7 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 z-30 bg-cream border-2 border-ink shadow-poster-sm rounded-lg overflow-hidden text-base font-sans font-bold w-56">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCity(c); setOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-2.5 hover:bg-lemon",
                c === city && "bg-coral text-paper"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function DayNightSwitch({ time, setTime }: { time: TimeOfDay; setTime: (t: TimeOfDay) => void }) {
  return (
    <div className="inline-flex items-center p-1 bg-cream border-2 border-ink rounded-full shadow-poster-sm">
      <button
        onClick={() => setTime("day")}
        className={cn(
          "inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all",
          time === "day" ? "bg-lemon border-2 border-ink" : "text-ink/60 hover:text-ink"
        )}
      >
        <Sun className="h-4 w-4" /> Day
      </button>
      <button
        onClick={() => setTime("night")}
        className={cn(
          "inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all",
          time === "night" ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"
        )}
      >
        <Moon className="h-4 w-4" /> Night
      </button>
    </div>
  );
}

function Filters({
  cat, setCat, vibe, setVibe,
}: {
  cat: Category | "all"; setCat: (c: Category | "all") => void;
  vibe: Vibe | "all"; setVibe: (v: Vibe | "all") => void;
}) {
  return (
    <section className="space-y-4 mb-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink/60 mb-2">Vibe</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={vibe === "all"} onClick={() => setVibe("all")}>Anything</Chip>
          {VIBES.map((v) => (
            <Chip key={v.id} active={vibe === v.id} onClick={() => setVibe(v.id)} accent>
              <span className="mr-1">{v.emoji}</span>{v.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink/60 mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chip({ active, onClick, children, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-bold border-2 border-ink transition-all",
        active
          ? (accent ? "bg-magenta text-paper shadow-[2px_2px_0_0_var(--ink)]" : "bg-ink text-paper shadow-[2px_2px_0_0_var(--coral)]")
          : "bg-cream hover:bg-lemon"
      )}
    >
      {children}
    </button>
  );
}

function CollageGrid({ events, fav }: { events: CityEvent[]; fav: ReturnType<typeof useFavorites> }) {
  if (events.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink/30 rounded-2xl p-12 text-center">
        <p className="font-display text-3xl text-ink/60">Nothing matches yet</p>
        <p className="text-ink/60 mt-2">Try a different vibe or switch Day / Night.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
      {events.map((e) => (
        <PosterCard key={e.id} event={e} favored={fav.has(e.id)} onToggleFav={fav.toggle} />
      ))}
    </div>
  );
}

function DayPlan({
  plan, city, vibe, setVibe, fav,
}: {
  plan: { label: string; range: [number, number]; ev?: CityEvent }[];
  city: City;
  vibe: Vibe | "all";
  setVibe: (v: Vibe | "all") => void;
  fav: ReturnType<typeof useFavorites>;
}) {
  return (
    <section className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-4xl sm:text-5xl">
            Your <span className="text-coral">whole day</span> in {city}
          </h2>
          <p className="text-ink/70 mt-2">From breakfast to bedtime — auto-planned.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={vibe === "all"} onClick={() => setVibe("all")}>Anything</Chip>
          {VIBES.map((v) => (
            <Chip key={v.id} active={vibe === v.id} onClick={() => setVibe(v.id)} accent>
              <span className="mr-1">{v.emoji}</span>{v.label}
            </Chip>
          ))}
        </div>
      </div>

      <ol className="relative border-l-4 border-ink ml-4 space-y-8">
        {plan.map((slot, i) => (
          <li key={slot.label} className="pl-8 relative">
            <span
              className={cn(
                "absolute -left-[14px] top-1 h-6 w-6 rounded-full border-2 border-ink",
                slot.ev ? "bg-coral" : "bg-cream"
              )}
            />
            <p className="font-bold uppercase tracking-widest text-xs text-ink/60 mb-2">
              {slot.label} · {fmtRange(slot.range)}
            </p>
            {slot.ev ? (
              <div className="grid sm:grid-cols-[200px_1fr] gap-5 items-start">
                <div className="sm:max-w-[200px]">
                  <PosterCard event={slot.ev} favored={fav.has(slot.ev.id)} onToggleFav={fav.toggle} />
                </div>
                <div className="pt-2">
                  <h3 className="font-display text-3xl leading-tight">{slot.ev.title}</h3>
                  <p className="text-ink/75 mt-2">{slot.ev.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="sticker">{slot.ev.area}</span>
                    <span className="sticker">{slot.ev.price}</span>
                    <span className="sticker">{slot.ev.category}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-ink/50 italic">Free time — go explore. Rest. Send a friend a meme.</p>
            )}
            {i !== plan.length - 1 && <div className="h-px bg-ink/15 mt-8" />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function fmtRange([a, b]: [number, number]) {
  const fmt = (h: number) => {
    const adj = h % 24;
    const period = adj >= 12 ? "pm" : "am";
    const hh = ((adj + 11) % 12) + 1;
    return `${hh}${period}`;
  };
  return `${fmt(a)}–${fmt(b)}`;
}

function EmptyFavs({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="bg-cream border-2 border-ink shadow-poster-sm p-10 text-center rounded-2xl max-w-xl mx-auto">
      <div className="text-5xl mb-3">💌</div>
      <h3 className="font-display text-3xl mb-2">No saved moments yet</h3>
      <p className="text-ink/70 mb-5">Tap the heart on anything that catches your eye and it'll land here.</p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform"
      >
        <Sparkles className="h-4 w-4" /> Start browsing
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-cream">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
        <p className="font-display text-2xl">today<span className="text-coral">.</span></p>
        <p className="text-sm text-ink/60">Made for people who refuse to be bored. © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
