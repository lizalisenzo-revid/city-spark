import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EVENTS, type CityEvent } from "@/data/events";
import {
  createGroupPlan, getGroupPlan, getGroupVotes,
  submitVotes, setWinner, tallyVotes,
  type GroupPlan, type GroupVote,
} from "@/lib/groupPlan";
import { SpinWheel, makeSegments } from "@/components/SpinWheel";
import { Heart, X, Home, Users, Share2, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/group-plan/$planId")({
  head: () => ({ meta: [{ title: "Group Plan — today." }] }),
  component: GroupPlanPage,
});

type Screen = "name" | "voting" | "results" | "winner";

function GroupPlanPage() {
  const { planId } = Route.useParams() as { planId: string };
  const [plan, setPlan] = useState<GroupPlan | null>(null);
  const [allVotes, setAllVotes] = useState<GroupVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Voter identity (stored in sessionStorage per plan)
  const storageKey = `today-voter-${planId}`;
  const savedName = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
  const [voterName, setVoterName] = useState(savedName ?? "");
  const [screen, setScreen] = useState<Screen>(savedName ? "voting" : "name");

  // Voting state
  const events = plan ? EVENTS.filter((e) => e.city === plan.city) : [];
  const [cardIndex, setCardIndex] = useState(0);
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);

  // Wheel state
  const [candidates, setCandidates] = useState<string[]>([]);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const load = async () => {
    try {
      const p = await getGroupPlan(planId);
      if (!p) { setNotFound(true); setLoading(false); return; }
      setPlan(p);
      const votes = await getGroupVotes(planId);
      setAllVotes(votes);
      if (p.status === "decided" && p.winner_event_id) {
        setWinnerId(p.winner_event_id);
        setScreen("winner");
      }
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [planId]);

  // Check if this voter already submitted
  useEffect(() => {
    if (!voterName || allVotes.length === 0) return;
    const mine = allVotes.filter((v) => v.voter_name === voterName);
    if (mine.length > 0) {
      const map: Record<string, boolean> = {};
      mine.forEach((v) => { map[v.event_id] = v.vote; });
      setMyVotes(map);
      setSubmitted(true);
      setCardIndex(events.length);
    }
  }, [allVotes, voterName]);

  const handleName = () => {
    if (!voterName.trim()) return;
    sessionStorage.setItem(storageKey, voterName.trim());
    setScreen("voting");
  };

  const vote = (eventId: string, yes: boolean) => {
    setSwipeDir(yes ? "right" : "left");
    setTimeout(() => {
      setMyVotes((prev) => ({ ...prev, [eventId]: yes }));
      setCardIndex((i) => i + 1);
      setSwipeDir(null);
    }, 300);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const votes = Object.entries(myVotes).map(([event_id, vote]) => ({ event_id, vote }));
      await submitVotes(planId, voterName, votes);
      setSubmitted(true);
      toast.success("Votes saved! 🎉");
      // Refresh all votes
      const latest = await getGroupVotes(planId);
      setAllVotes(latest);
      setScreen("results");
    } catch { toast.error("Couldn't save votes. Try again."); }
    finally { setSubmitting(false); }
  };

  const handleShowResults = async () => {
    const latest = await getGroupVotes(planId);
    setAllVotes(latest);
    const ids = tallyVotes(latest);
    // If no votes at all, put all events on wheel
    const wheelIds = ids.length >= 2 ? ids : events.map((e) => e.id).slice(0, 6);
    setCandidates(wheelIds);
    setScreen("results");
  };

  const handleSpinStart = () => {
    const idx = Math.floor(Math.random() * candidates.length);
    setWinnerIndex(idx);
    setSpinning(true);
  };

  const handleSpinComplete = async (id: string) => {
    setWinnerId(id);
    try { await setWinner(planId, id); } catch {}
    setTimeout(() => setScreen("winner"), 800);
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! Send it to your friends 🎉");
  };

  const voters = [...new Set(allVotes.map((v) => v.voter_name))];
  const winnerEvent = EVENTS.find((e) => e.id === winnerId);

  const segments = makeSegments(
    candidates,
    candidates.map((id) => EVENTS.find((e) => e.id === id)?.title ?? id)
  );

  if (loading) return (
    <Shell><div className="flex-1 flex items-center justify-center flex-col gap-3">
      <div className="text-5xl animate-bounce">🎰</div>
      <p className="font-display text-2xl">Loading your plan…</p>
    </div></Shell>
  );

  if (notFound) return (
    <Shell><div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-4">
      <div className="text-5xl">🔍</div>
      <p className="font-display text-3xl">Plan not found</p>
      <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-paper font-bold border-2 border-ink rounded-full"><Home className="h-4 w-4" />Go home</Link>
    </div></Shell>
  );

  /* ── Name screen ── */
  if (screen === "name") return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 max-w-sm mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-3">👥</div>
          <h1 className="font-display text-4xl">{plan?.created_by}'s <span className="text-coral">group plan</span></h1>
          <p className="text-ink/60 mt-2">In {plan?.city}. Enter your name to start voting.</p>
        </div>
        <input
          autoFocus
          value={voterName}
          onChange={(e) => setVoterName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleName()}
          placeholder="Your name…"
          className="w-full px-4 py-3 border-2 border-ink rounded-xl text-lg font-bold outline-none focus:border-coral bg-paper"
        />
        <button
          onClick={handleName}
          disabled={!voterName.trim()}
          className="w-full py-3 bg-coral text-paper font-bold text-lg border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-40"
        >
          Let's vote! 🗳️
        </button>
        {voters.length > 0 && (
          <p className="text-sm text-ink/50">{voters.join(", ")} already voted</p>
        )}
      </div>
    </Shell>
  );

  /* ── Voting screen ── */
  if (screen === "voting") {
    const current = events[cardIndex];
    const done = cardIndex >= events.length;
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center px-4 pt-4 max-w-sm mx-auto w-full gap-4">
          {/* Header */}
          <div className="w-full flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">{voterName}'s vote</p>
              <p className="text-xs text-ink/50">{plan?.city}</p>
            </div>
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-ink rounded-full bg-cream hover:bg-lemon">
              <Share2 className="h-3.5 w-3.5" /> Invite friends
            </button>
          </div>

          {/* Progress */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>{Math.min(cardIndex, events.length)} of {events.length} places</span>
              <span>{Object.values(myVotes).filter(Boolean).length} yes · {Object.values(myVotes).filter((v) => !v).length} no</span>
            </div>
            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-coral rounded-full transition-all" style={{ width: `${(cardIndex / events.length) * 100}%` }} />
            </div>
          </div>

          {!done ? (
            <>
              {/* Card */}
              <div
                className={cn(
                  "w-full rounded-2xl overflow-hidden border-2 border-ink shadow-poster transition-all duration-300",
                  swipeDir === "right" && "translate-x-20 rotate-6 opacity-0",
                  swipeDir === "left" && "-translate-x-20 -rotate-6 opacity-0"
                )}
              >
                <div className="relative">
                  <img src={current.poster} alt={current.title} className="w-full aspect-[4/3] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-paper">
                    <p className="font-display text-2xl leading-tight">{current.title}</p>
                    <p className="text-sm text-paper/80 mt-0.5">{current.area} · {current.price}</p>
                  </div>
                </div>
                <div className="p-4 bg-paper">
                  <p className="text-sm text-ink/70 leading-snug">{current.blurb}</p>
                </div>
              </div>

              {/* Vote buttons */}
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => vote(current.id, false)}
                  className="flex-1 py-4 flex flex-col items-center gap-1 bg-cream border-2 border-ink rounded-2xl shadow-[3px_3px_0_0_var(--ink)] hover:-translate-y-0.5 transition-transform active:translate-y-0.5 text-2xl font-bold"
                >
                  <X className="h-7 w-7" />
                  <span className="text-xs font-bold text-ink/60">Nope</span>
                </button>
                <button
                  onClick={() => vote(current.id, true)}
                  className="flex-1 py-4 flex flex-col items-center gap-1 bg-coral text-paper border-2 border-ink rounded-2xl shadow-[3px_3px_0_0_var(--ink)] hover:-translate-y-0.5 transition-transform active:translate-y-0.5"
                >
                  <Heart className="h-7 w-7 fill-paper" />
                  <span className="text-xs font-bold">Let's go!</span>
                </button>
              </div>

              <button onClick={() => setCardIndex(events.length)} className="text-xs text-ink/40 hover:text-ink/60 underline">
                Skip to results
              </button>
            </>
          ) : (
            /* Done voting */
            <div className="w-full flex flex-col items-center gap-4 text-center mt-4">
              <div className="text-5xl">✅</div>
              <h2 className="font-display text-3xl">You've seen all {events.length} places!</h2>
              <p className="text-ink/60 text-sm">{Object.values(myVotes).filter(Boolean).length} yes — {Object.values(myVotes).filter((v) => !v).length} no</p>
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 bg-ink text-paper font-bold text-lg border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--coral)] disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Lock in my votes 🔒"}
                </button>
              ) : (
                <button onClick={handleShowResults} className="w-full py-3 bg-coral text-paper font-bold text-lg border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)]">
                  See results & spin! 🎰
                </button>
              )}
              {voters.length > 0 && (
                <p className="text-xs text-ink/40">Voters so far: {voters.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  /* ── Results / Wheel screen ── */
  if (screen === "results") return (
    <Shell>
      <div className="flex-1 flex flex-col items-center px-4 pt-4 pb-8 max-w-md mx-auto w-full gap-6">
        <div className="text-center">
          <h2 className="font-display text-3xl">
            {spinning ? "Spinning…" : candidates.length > 0 ? "Spin the wheel!" : "Getting results…"}
          </h2>
          {!spinning && voters.length > 0 && (
            <p className="text-sm text-ink/50 mt-1">{voters.length} voter{voters.length !== 1 ? "s" : ""}: {voters.join(", ")}</p>
          )}
          {candidates.length >= 2 && !spinning && (
            <p className="text-xs text-ink/40 mt-1">
              {candidates.length === 1 ? "Clear winner!" : `${candidates.length} places on the wheel`}
            </p>
          )}
        </div>

        {candidates.length >= 2 && (
          <SpinWheel
            segments={segments}
            winnerIndex={winnerIndex}
            spinning={spinning}
            onSpinStart={handleSpinStart}
            onSpinComplete={handleSpinComplete}
          />
        )}

        {candidates.length === 0 && (
          <div className="text-center text-ink/50 py-8">
            <p>No one has voted yet.</p>
            <button onClick={copyLink} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-paper font-bold border-2 border-ink rounded-full text-sm">
              <Share2 className="h-4 w-4" /> Invite friends
            </button>
          </div>
        )}

        <button onClick={copyLink} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-lemon">
          <Share2 className="h-3.5 w-3.5" /> Invite more friends
        </button>
      </div>
    </Shell>
  );

  /* ── Winner screen ── */
  return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-6 max-w-sm mx-auto">
        <div className="text-6xl animate-bounce">🎉</div>
        <h2 className="font-display text-4xl">The wheel chose…</h2>
        {winnerEvent && (
          <div className="w-full rounded-2xl overflow-hidden border-2 border-ink shadow-[6px_6px_0_0_var(--coral)]">
            <img src={winnerEvent.poster} alt={winnerEvent.title} className="w-full aspect-video object-cover" />
            <div className="p-5 bg-paper text-left">
              <p className="font-display text-3xl">{winnerEvent.title}</p>
              <p className="text-ink/60 mt-1">{winnerEvent.area} · {winnerEvent.price}</p>
              <p className="text-sm text-ink/70 mt-2 leading-relaxed">{winnerEvent.blurb}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${winnerEvent.title}, ${winnerEvent.area}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-paper font-bold border-2 border-ink rounded-full"
              >
                Get directions 📍
              </a>
            </div>
          </div>
        )}
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-ink rounded-full bg-cream hover:bg-lemon">
          <Home className="h-4 w-4" /> Back to today.
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b-2 border-ink px-4 h-14 flex items-center">
        <Link to="/" className="font-display text-xl tracking-tight flex items-center gap-2">
          <span className="inline-block h-6 w-6 bg-coral border-2 border-ink rounded-full" />
          today<span className="text-coral">.</span>
        </Link>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
