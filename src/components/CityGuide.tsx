import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, X, KeyRound, Loader2 } from "lucide-react";
import { type CityEvent } from "@/data/events";
import { cn } from "@/lib/utils";

const KEY_STORAGE = "today-openrouter-key";

interface Props {
  events: CityEvent[];
  city: string;
}

type Status = "idle" | "loading" | "speaking" | "error";

export function CityGuide({ events, city }: Props) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(KEY_STORAGE) ?? "" : ""
  );
  const [keyInput, setKeyInput] = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const hasKey = apiKey.trim().length > 0;

  // Stop speech on unmount
  useEffect(() => () => { speechSynthesis.cancel(); }, []);

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(KEY_STORAGE, k);
    setApiKey(k);
    setKeyInput("");
    setShowKeyForm(false);
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setStatus("idle");
  };

  const speak = (content: string) => {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(content);
    utter.rate = 0.95;
    utter.pitch = 1.05;
    // Try to pick a natural-sounding voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      /samantha|karen|daniel|moira|serena|aria|jenny|guy/i.test(v.name)
    ) ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
    if (preferred) utter.voice = preferred;
    utter.onend = () => setStatus("idle");
    utter.onerror = () => setStatus("idle");
    utterRef.current = utter;
    speechSynthesis.speak(utter);
    setStatus("speaking");
  };

  const generate = async () => {
    if (!hasKey) { setShowKeyForm(true); return; }
    if (status === "speaking") { stopSpeaking(); return; }
    setStatus("loading");
    setText("");
    setErrorMsg("");

    // Build a concise event list for the prompt
    const sample = events.slice(0, 18);
    const eventList = sample.map((e) =>
      `• ${e.title} (${e.category}, ${e.area}) — ${e.blurb.slice(0, 80)}`
    ).join("\n");

    const prompt = `You are an upbeat, friendly city guide for ${city}, South Africa. Based on these events and places available today, give a short, punchy 3-4 sentence spoken guide. Sound like a cool friend — enthusiastic but not over the top. Highlight 2-3 specific places by name. Keep it under 80 words.

Events available today in ${city}:
${eventList}

Respond with only the spoken guide text, nothing else.`;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "today. city guide",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 120,
          temperature: 0.8,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`);
      }

      const data = await res.json() as { choices: { message: { content: string } }[] };
      const content = data.choices[0]?.message?.content?.trim() ?? "";
      if (!content) throw new Error("Empty response");
      setText(content);
      speak(content);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  };

  const replay = () => { if (text) speak(text); };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-40 h-14 w-14 flex items-center justify-center bg-coral border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] hover:scale-105 transition-transform"
      title="City Guide — AI voice summary"
    >
      <Mic className="h-6 w-6 text-paper" />
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 bg-paper border-2 border-ink rounded-2xl shadow-[6px_6px_0_0_var(--coral)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink bg-coral">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-paper" />
          <span className="font-bold text-paper text-sm">City Guide · {city}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowKeyForm((v) => !v)} title="API key settings"
            className="h-7 w-7 grid place-items-center rounded-full hover:bg-paper/20 transition-colors">
            <KeyRound className="h-3.5 w-3.5 text-paper" />
          </button>
          <button onClick={() => { setOpen(false); stopSpeaking(); }}
            className="h-7 w-7 grid place-items-center rounded-full hover:bg-paper/20 transition-colors">
            <X className="h-4 w-4 text-paper" />
          </button>
        </div>
      </div>

      {/* Key form */}
      {showKeyForm && (
        <div className="px-4 py-3 border-b-2 border-ink/20 bg-lemon">
          <p className="text-xs font-bold mb-1">OpenRouter API key</p>
          <p className="text-[11px] text-ink/60 mb-2">
            Get a free key at <span className="font-bold">openrouter.ai</span> · uses DeepSeek V3 (~$0.0001/tap)
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveKey()}
              placeholder="sk-or-..."
              className="flex-1 px-2 py-1.5 text-xs border-2 border-ink rounded-lg outline-none focus:border-coral bg-paper"
            />
            <button onClick={saveKey} disabled={!keyInput.trim()}
              className="px-3 py-1.5 text-xs font-bold bg-ink text-paper rounded-lg disabled:opacity-40">
              Save
            </button>
          </div>
          {hasKey && <p className="text-[11px] text-ink/50 mt-1">✓ Key saved</p>}
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Generated text */}
        {text && (
          <div className="bg-cream border-2 border-ink/20 rounded-xl p-3 text-sm leading-relaxed text-ink/80 relative">
            {status === "speaking" && (
              <div className="flex gap-0.5 items-end h-3 mb-2">
                {[0,1,2,3,4].map((i) => (
                  <div key={i} className="w-1 bg-coral rounded-full animate-pulse"
                    style={{ height: `${6 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
            {text}
          </div>
        )}

        {status === "error" && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-2">{errorMsg}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={status === "loading"}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 py-2.5 font-bold text-sm border-2 border-ink rounded-full transition-all",
              status === "speaking"
                ? "bg-ink text-paper"
                : "bg-coral text-paper hover:bg-coral/80 shadow-[2px_2px_0_0_var(--ink)]"
            )}
          >
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "speaking" && <VolumeX className="h-4 w-4" />}
            {status === "idle" || status === "error" ? <Mic className="h-4 w-4" /> : null}
            {status === "loading" ? "Generating…" : status === "speaking" ? "Stop" : text ? "Regenerate" : "What's on today?"}
          </button>

          {text && status !== "speaking" && status !== "loading" && (
            <button onClick={replay} title="Play again"
              className="h-10 w-10 grid place-items-center border-2 border-ink rounded-full bg-cream hover:bg-lemon transition-colors">
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {!hasKey && (
          <p className="text-[11px] text-ink/50 text-center">
            Tap 🔑 above to add your free OpenRouter key
          </p>
        )}
      </div>
    </div>
  );
}
