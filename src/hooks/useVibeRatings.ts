import { useCallback, useEffect, useState } from "react";

export type VibeRating = "fire" | "meh" | "dead";

const KEY = "today-vibes-v1";

function read(): Record<string, VibeRating> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

function write(data: Record<string, VibeRating>) {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

/** Returns all ratings. */
export function useVibeRatings() {
  const [ratings, setRatings] = useState<Record<string, VibeRating>>({});

  useEffect(() => { setRatings(read()); }, []);

  const rate = useCallback((eventId: string, vibe: VibeRating) => {
    setRatings((prev) => {
      // toggle off if same rating tapped again
      const next = { ...prev };
      if (next[eventId] === vibe) { delete next[eventId]; }
      else { next[eventId] = vibe; }
      write(next);
      return next;
    });
  }, []);

  const getRating = useCallback((eventId: string): VibeRating | null => {
    return ratings[eventId] ?? null;
  }, [ratings]);

  return { ratings, rate, getRating };
}

/** Lightweight singleton read — no re-render. Use in non-component code. */
export function readVibeRatings(): Record<string, VibeRating> {
  return read();
}

export const VIBES: { value: VibeRating; emoji: string; label: string }[] = [
  { value: "fire", emoji: "🔥", label: "Loved it" },
  { value: "meh",  emoji: "😐", label: "It was okay" },
  { value: "dead", emoji: "💀", label: "Not worth it" },
];
