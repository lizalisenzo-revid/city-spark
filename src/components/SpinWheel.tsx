import { useEffect, useRef, useState } from "react";

export type WheelSegment = {
  label: string;
  color: string;
  id: string;
};

const PALETTE = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
  "#FF922B", "#CC5DE8", "#20C997", "#F06595",
  "#74C0FC", "#A9E34B",
];

interface Props {
  segments: WheelSegment[];
  winnerIndex: number | null; // pre-determined winner (null = not yet)
  onSpinComplete: (id: string) => void;
  spinning: boolean;
  onSpinStart: () => void;
}

export function SpinWheel({ segments, winnerIndex, onSpinComplete, spinning, onSpinStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);       // current rotation in radians
  const rafRef = useRef(0);
  const [done, setDone] = useState(false);

  const n = segments.length;
  const segAngle = (2 * Math.PI) / n;

  function draw(rot: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.restore();

    // Segments
    segments.forEach((seg, i) => {
      const start = rot + i * segAngle - Math.PI / 2;
      const end = start + segAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.min(14, 120 / n)}px sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      const maxLen = 16;
      const label = seg.label.length > maxLen ? seg.label.slice(0, maxLen - 1) + "…" : seg.label;
      ctx.fillText(label, r - 12, 5);
      ctx.restore();
    });

    // Centre hub
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer (triangle at top)
    const pw = 14, ph = 28;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - ph + 4);
    ctx.lineTo(cx - pw / 2, cy - r + 4);
    ctx.lineTo(cx + pw / 2, cy - r + 4);
    ctx.closePath();
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
  }

  // Draw initial state
  useEffect(() => { draw(rotRef.current); }, [segments]);

  // Spin animation
  useEffect(() => {
    if (!spinning || winnerIndex === null) return;
    cancelAnimationFrame(rafRef.current);
    setDone(false);

    // Calculate target rotation so winner segment sits under pointer (top = -PI/2)
    // Pointer is at top. Segment i spans [i*segAngle, (i+1)*segAngle] from -PI/2.
    // We want center of winner segment at pointer.
    const targetSegCenter = winnerIndex * segAngle + segAngle / 2;
    // Current normalised rotation
    const cur = ((rotRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    // We want: cur + delta ≡ -targetSegCenter (mod 2π) so segment centre is at pointer
    const desired = (2 * Math.PI - targetSegCenter) % (2 * Math.PI);
    const diff = ((desired - cur) + 2 * Math.PI) % (2 * Math.PI);
    const totalSpin = 6 * 2 * Math.PI + diff; // 6 full rotations + land on winner

    const duration = 4000; // ms
    let start: number | null = null;
    const startRot = rotRef.current;

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 4);
    }

    function step(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      rotRef.current = startRot + totalSpin * easeOut(t);
      draw(rotRef.current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDone(true);
        onSpinComplete(winnerIndex !== null ? segments[winnerIndex].id : "");
      }
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning, winnerIndex]);

  const size = Math.min(320, window.innerWidth - 48);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="drop-shadow-xl"
        />
      </div>
      {!spinning && !done && (
        <button
          onClick={onSpinStart}
          className="mt-2 px-8 py-4 bg-coral text-paper font-display text-2xl border-2 border-ink rounded-full shadow-[4px_4px_0_0_var(--ink)] hover:translate-y-0.5 active:translate-y-1 transition-transform"
        >
          🎰 SPIN!
        </button>
      )}
      {spinning && !done && (
        <p className="font-display text-xl text-ink/60 animate-pulse">Spinning…</p>
      )}
    </div>
  );
}

/** Assign colours to segments from palette */
export function makeSegments(ids: string[], labels: string[]): WheelSegment[] {
  return ids.map((id, i) => ({
    id,
    label: labels[i] ?? id,
    color: PALETTE[i % PALETTE.length],
  }));
}
