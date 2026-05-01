import { useEffect, useRef, useState } from "react";
import { CityEvent } from "@/data/events";
import { useMemories, loadImage, type Memory } from "@/hooks/useMemories";
import { Camera, Upload, X, Download, Share2, Trash2, Sparkles, Grid3x3, Square, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

type Layout = "square" | "story" | "portrait";

const LAYOUTS: { id: Layout; label: string; w: number; h: number; icon: React.ReactNode }[] = [
  { id: "square", label: "Square 1:1", w: 1080, h: 1080, icon: <Square className="h-4 w-4" /> },
  { id: "portrait", label: "Post 4:5", w: 1080, h: 1350, icon: <LayoutGrid className="h-4 w-4" /> },
  { id: "story", label: "Story 9:16", w: 1080, h: 1920, icon: <Grid3x3 className="h-4 w-4" /> },
];

export function MemoriesDialog({
  event,
  open,
  onClose,
}: {
  event: CityEvent;
  open: boolean;
  onClose: () => void;
}) {
  const { memories, add, remove } = useMemories(event.id);
  const [layout, setLayout] = useState<Layout>("portrait");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (memories.length === 0) { setPreviewUrl(null); return; }
    let cancelled = false;
    setBusy(true);
    const cfg = LAYOUTS.find((l) => l.id === layout)!;
    buildCollage(memories, cfg.w, cfg.h, event.title, event.area)
      .then((url) => { if (!cancelled) setPreviewUrl(url); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [open, memories, layout, event.title, event.area]);

  if (!open) return null;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    try { await add(files); } finally { setBusy(false); }
    e.target.value = "";
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-memories.jpg`;
    a.click();
  };

  const handleShare = async () => {
    if (!previewUrl) return;
    try {
      const blob = await (await fetch(previewUrl)).blob();
      const file = new File([blob], `${event.title}-memories.jpg`, { type: "image/jpeg" });
      // @ts-expect-error - canShare with files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: event.title,
          text: `Memories from ${event.title} 📸`,
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper border-2 border-ink w-full max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-poster overflow-hidden my-0 sm:my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-ink bg-cream">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/60">Scrapbook</p>
            <h2 className="font-display text-2xl sm:text-3xl leading-tight truncate">
              {event.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 grid place-items-center bg-paper border-2 border-ink rounded-full shadow-[2px_2px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform shrink-0 ml-3"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
          {/* Add buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-coral text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform text-sm"
            >
              <Camera className="h-4 w-4" /> Take photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-lemon font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform text-sm"
            >
              <Upload className="h-4 w-4" /> From gallery
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={handleFiles}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFiles}
            />
          </div>

          {/* Thumbnail strip */}
          {memories.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink/60 mb-2">
                {memories.length} photo{memories.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {memories.map((m) => (
                  <div key={m.id} className="relative shrink-0 group">
                    <img
                      src={m.dataUrl}
                      alt=""
                      className="h-20 w-20 object-cover border-2 border-ink rounded-lg"
                    />
                    <button
                      onClick={() => remove(m.id)}
                      className="absolute -top-1.5 -right-1.5 h-6 w-6 grid place-items-center bg-paper border-2 border-ink rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layout picker */}
          {memories.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink/60 mb-2">Format</p>
              <div className="flex flex-wrap gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayout(l.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 border-ink rounded-full transition-all",
                      layout === l.id
                        ? "bg-ink text-paper shadow-[2px_2px_0_0_var(--coral)]"
                        : "bg-cream hover:bg-lemon"
                    )}
                  >
                    {l.icon} {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {memories.length === 0 ? (
            <div className="border-2 border-dashed border-ink/30 rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">📸</div>
              <p className="font-display text-2xl">Start your scrapbook</p>
              <p className="text-ink/60 mt-1 text-sm">
                Snap photos at {event.title} and we'll turn them into a poster ready for the 'gram.
              </p>
            </div>
          ) : (
            <div className="bg-cream border-2 border-ink rounded-2xl p-4 grid place-items-center">
              {busy && !previewUrl ? (
                <div className="aspect-[4/5] w-full max-w-xs grid place-items-center text-ink/50">
                  <Sparkles className="h-8 w-8 animate-pulse" />
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Collage preview"
                  className="max-h-[55vh] w-auto border-2 border-ink shadow-poster-sm rounded-lg"
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {memories.length > 0 && (
          <div className="border-t-2 border-ink bg-cream p-4 grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              disabled={!previewUrl || busy}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform text-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={handleShare}
              disabled={!previewUrl || busy}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-magenta text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform text-sm disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Collage builder =====
async function buildCollage(
  memories: Memory[],
  W: number,
  H: number,
  title: string,
  area: string,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Paper background
  ctx.fillStyle = "#FAF6EE";
  ctx.fillRect(0, 0, W, H);

  // Subtle grain via noise dots
  ctx.fillStyle = "rgba(0,0,0,0.025)";
  for (let i = 0; i < 800; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }

  const imgs = await Promise.all(memories.map((m) => loadImage(m.dataUrl)));

  // Layout area (leave bottom strip for caption)
  const captionH = Math.round(H * 0.13);
  const padding = Math.round(Math.min(W, H) * 0.045);
  const areaX = padding;
  const areaY = padding;
  const areaW = W - padding * 2;
  const areaH = H - captionH - padding * 2;

  const tiles = pickTilePositions(imgs.length, areaW, areaH);

  // Accent colors that rotate
  const accents = ["#FF5A4F", "#FFD33D", "#7DD3C8", "#A78BFA", "#FFA94D"];

  tiles.forEach((t, i) => {
    const x = areaX + t.x;
    const y = areaY + t.y;
    const w = t.w;
    const h = t.h;
    const img = imgs[i];
    const rotation = (Math.random() * 6 - 3) * (Math.PI / 180);

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rotation);

    // Drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);

    // White polaroid border
    const border = Math.round(Math.min(w, h) * 0.04);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Image (cover-fit)
    drawImageCover(ctx, img, -w / 2 + border, -h / 2 + border, w - border * 2, h - border * 2 - border);

    // Tape strip
    ctx.fillStyle = accents[i % accents.length] + "CC";
    const tapeW = Math.min(w * 0.3, 90);
    const tapeH = 22;
    ctx.fillRect(-tapeW / 2, -h / 2 - tapeH / 2, tapeW, tapeH);

    ctx.restore();
  });

  // Caption block
  const capY = H - captionH;
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(0, capY, W, captionH);

  // Coral accent stripe
  ctx.fillStyle = "#FF5A4F";
  ctx.fillRect(0, capY, W, 6);

  // Title
  ctx.fillStyle = "#FAF6EE";
  ctx.textBaseline = "middle";
  const titleSize = Math.round(captionH * 0.36);
  ctx.font = `900 ${titleSize}px Georgia, "Times New Roman", serif`;
  const titleText = fitText(ctx, title.toUpperCase(), W - padding * 2);
  ctx.fillText(titleText, padding, capY + captionH * 0.4);

  // Subtitle
  const subSize = Math.round(captionH * 0.18);
  ctx.font = `bold ${subSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#FFD33D";
  const date = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  ctx.fillText(`📍 ${area}  ·  ${date}`, padding, capY + captionH * 0.75);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const ir = img.width / img.height;
  const tr = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 4 && ctx.measureText(t + "…").width > maxW) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function pickTilePositions(n: number, W: number, H: number): { x: number; y: number; w: number; h: number }[] {
  if (n === 1) return [{ x: 0, y: 0, w: W, h: H }];
  if (n === 2) {
    const h = (H - 20) / 2;
    return [
      { x: 0, y: 0, w: W, h },
      { x: 0, y: h + 20, w: W, h },
    ];
  }
  if (n === 3) {
    const big = Math.round(H * 0.6);
    const small = H - big - 20;
    const halfW = (W - 20) / 2;
    return [
      { x: 0, y: 0, w: W, h: big },
      { x: 0, y: big + 20, w: halfW, h: small },
      { x: halfW + 20, y: big + 20, w: halfW, h: small },
    ];
  }
  if (n === 4) {
    const halfW = (W - 20) / 2;
    const halfH = (H - 20) / 2;
    return [
      { x: 0, y: 0, w: halfW, h: halfH },
      { x: halfW + 20, y: 0, w: halfW, h: halfH },
      { x: 0, y: halfH + 20, w: halfW, h: halfH },
      { x: halfW + 20, y: halfH + 20, w: halfW, h: halfH },
    ];
  }
  // 5+ : grid of up to 9 — overflow ignored for the collage to stay tidy
  const count = Math.min(n, 9);
  const cols = count <= 6 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gap = 16;
  const tw = (W - gap * (cols - 1)) / cols;
  const th = (H - gap * (rows - 1)) / rows;
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    out.push({ x: c * (tw + gap), y: r * (th + gap), w: tw, h: th });
  }
  // pad with empty repeats so n matches
  while (out.length < n) out.push(out[out.length - 1]);
  return out;
}
