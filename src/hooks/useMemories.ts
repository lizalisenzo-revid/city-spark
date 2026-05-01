import { useEffect, useState, useCallback } from "react";

const KEY = "today-memories-v1";

export type Memory = {
  id: string;
  dataUrl: string;
  createdAt: number;
};

type Store = Record<string, Memory[]>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try { window.localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota */ }
}

export function useMemories(eventId: string) {
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    setMemories(read()[eventId] ?? []);
  }, [eventId]);

  const refresh = useCallback(() => {
    setMemories(read()[eventId] ?? []);
  }, [eventId]);

  const add = useCallback(async (files: File[]) => {
    const newOnes: Memory[] = [];
    for (const file of files) {
      const dataUrl = await fileToCompressedDataUrl(file, 1400);
      newOnes.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dataUrl,
        createdAt: Date.now(),
      });
    }
    const store = read();
    store[eventId] = [...(store[eventId] ?? []), ...newOnes];
    write(store);
    setMemories(store[eventId]);
  }, [eventId]);

  const remove = useCallback((id: string) => {
    const store = read();
    store[eventId] = (store[eventId] ?? []).filter((m) => m.id !== id);
    write(store);
    setMemories(store[eventId]);
  }, [eventId]);

  const clear = useCallback(() => {
    const store = read();
    delete store[eventId];
    write(store);
    setMemories([]);
  }, [eventId]);

  return { memories, add, remove, clear, refresh };
}

export function getMemoryCount(eventId: string): number {
  return (read()[eventId] ?? []).length;
}

async function fileToCompressedDataUrl(file: File, maxDim: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
