import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { CalendarPlus, X } from "lucide-react";
import type { CityEvent } from "@/data/events";

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: Partial<{
    title: string;
    notes: string;
    location: string;
    eventId: string;
    startHour: number;
    durationHours: number;
    color: string;
  }>;
  onSaved?: () => void;
  defaultDate?: string; // YYYY-MM-DD
}

export function AddToCalendarDialog({ open, onClose, prefill, onSaved, defaultDate }: Props) {
  const { user } = useAuth();
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const [location, setLocation] = useState(prefill?.location ?? "");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(
    prefill?.startHour != null ? `${String(prefill.startHour).padStart(2, "0")}:00` : "12:00"
  );
  const [duration, setDuration] = useState(
    prefill?.durationHours ? prefill.durationHours * 60 : 60
  );
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("scheduled_events").insert({
      user_id: user.id,
      event_id: prefill?.eventId ?? null,
      title,
      notes: notes || null,
      location: location || null,
      scheduled_date: date,
      start_time: time + ":00",
      duration_minutes: duration,
      color: prefill?.color ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Added to your calendar");
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-cream border-2 border-ink shadow-poster rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-3xl">Add to your day</h2>
            <p className="text-sm text-ink/70">Save this to your personal calendar.</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center bg-paper border-2 border-ink rounded-full">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!user ? (
          <div className="text-center py-6">
            <p className="text-ink/70 mb-4">Sign in to save events to your calendar.</p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)]"
            >
              <CalendarPlus className="h-4 w-4" /> Sign in to continue
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Title">
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
            </Field>
            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="Where?" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input" />
              </Field>
              <Field label="Time">
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="input" />
              </Field>
            </div>
            <Field label="Duration (minutes)">
              <input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input" />
            </Field>
            <Field label="Notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[60px]" />
            </Field>
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-paper border-2 border-ink rounded-full font-bold text-sm shadow-[3px_3px_0_0_var(--coral)] hover:translate-y-0.5 transition-transform disabled:opacity-50"
            >
              <CalendarPlus className="h-4 w-4" /> Save to calendar
            </button>
          </form>
        )}
        <style>{`
          .input { width: 100%; padding: 0.55rem 0.75rem; background: var(--paper); border: 2px solid var(--ink); border-radius: 0.5rem; font-size: 0.875rem; outline: none; }
          .input:focus { box-shadow: 0 0 0 3px color-mix(in oklab, var(--coral) 35%, transparent); }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-ink/60 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function buildPrefillFromEvent(ev: CityEvent) {
  return {
    title: ev.title,
    notes: ev.blurb,
    location: `${ev.area}, ${ev.city}`,
    eventId: ev.id,
    startHour: ev.startHour,
    durationHours: ev.durationHours,
    color: ev.accent,
  };
}
