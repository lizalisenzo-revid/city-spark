import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { CalendarPlus, X, Save } from "lucide-react";
import type { CityEvent } from "@/data/events";

export interface EditingEvent {
  id: string;
  title: string;
  notes: string | null;
  location: string | null;
  scheduled_date: string;
  start_time: string;
  duration_minutes: number;
  color: string | null;
}

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
  editing?: EditingEvent | null;
}

export function AddToCalendarDialog({ open, onClose, prefill, onSaved, defaultDate, editing }: Props) {
  const { user } = useAuth();
  const isEdit = !!editing;
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("12:00");
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);

  // Re-sync state whenever the dialog opens with new prefill/editing data
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setNotes(editing.notes ?? "");
      setLocation(editing.location ?? "");
      setDate(editing.scheduled_date);
      setTime(editing.start_time.slice(0, 5));
      setDuration(editing.duration_minutes);
    } else {
      setTitle(prefill?.title ?? "");
      setNotes(prefill?.notes ?? "");
      setLocation(prefill?.location ?? "");
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setTime(prefill?.startHour != null ? `${String(prefill.startHour).padStart(2, "0")}:00` : "12:00");
      setDuration(prefill?.durationHours ? prefill.durationHours * 60 : 60);
    }
  }, [open, editing, prefill, defaultDate]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);

    if (isEdit && editing) {
      const { error } = await supabase
        .from("scheduled_events")
        .update({
          title,
          notes: notes || null,
          location: location || null,
          scheduled_date: date,
          start_time: time + ":00",
          duration_minutes: duration,
        })
        .eq("id", editing.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Event updated");
    } else {
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
      if (error) return toast.error(error.message);
      toast.success("Added to your calendar");
    }

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
            <h2 className="font-display text-3xl">{isEdit ? "Edit event" : "Add to your day"}</h2>
            <p className="text-sm text-ink/70">
              {isEdit ? "Update the details below." : "Save this to your personal calendar."}
            </p>
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
              {isEdit ? <><Save className="h-4 w-4" /> Save changes</> : <><CalendarPlus className="h-4 w-4" /> Save to calendar</>}
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
