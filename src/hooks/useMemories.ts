import { useEffect, useState, useCallback } from "react";

const KEY = "today-memories-v1";
const COLLAGE_KEY = "today-collages-v1";
const NOTE_KEY = "today-notes-v1";

export type Memory = {
  id: string;
  dataUrl: string;
  createdAt: number;
};

export type SavedCollage = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventArea: string;
  dataUrl: string;
  layout: string;
  createdAt: number;
};


export type ScrapbookNote = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventArea: string;
  text: string;
  createdAt: number;
  updatedAt: number;
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

function readCollages(): SavedCollage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COLLAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCollages(list: SavedCollage[]) {
  try { window.localStorage.setItem(COLLAGE_KEY, JSON.stringify(list)); } catch { /* quota */ }
}


function readNotes(): ScrapbookNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeNotes(list: ScrapbookNote[]) {
  try { window.localStorage.setItem(NOTE_KEY, JSON.stringify(list)); } catch { /* quota */ }
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

/** Hook for the scrapbook: all photos + all saved collages across every place. */
export function useScrapbook() {
  const [photos, setPhotos] = useState<(Memory & { eventId: string })[]>([]);
  const [collages, setCollages] = useState<SavedCollage[]>([]);
  const [notes, setNotes] = useState<ScrapbookNote[]>([]);

  const refresh = useCallback(() => {
    const store = read();
    const flat: (Memory & { eventId: string })[] = [];
    for (const [eid, list] of Object.entries(store)) {
      for (const m of list) flat.push({ ...m, eventId: eid });
    }
    flat.sort((a, b) => b.createdAt - a.createdAt);
    setPhotos(flat);
    setCollages(readCollages().sort((a, b) => b.createdAt - a.createdAt));
    setNotes(readNotes().sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveNote = useCallback((input: Omit<ScrapbookNote, "id" | "createdAt" | "updatedAt">) => {
    const all = readNotes();
    const entry: ScrapbookNote = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    all.push(entry);
    writeNotes(all);
    setNotes(all.sort((a, b) => b.updatedAt - a.updatedAt));
    return entry;
  }, []);

  const updateNote = useCallback((id: string, text: string) => {
    const all = readNotes().map((n) => n.id === id ? { ...n, text, updatedAt: Date.now() } : n);
    writeNotes(all);
    setNotes(all.sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const deleteNote = useCallback((id: string) => {
    const all = readNotes().filter((n) => n.id !== id);
    writeNotes(all);
    setNotes(all.sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const removeCollage = useCallback((id: string) => {
    const next = readCollages().filter((c) => c.id !== id);
    writeCollages(next);
    setCollages(next.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  return { photos, collages, notes, refresh, removeCollage, saveNote, updateNote, deleteNote };
}

export function saveCollage(input: Omit<SavedCollage, "id" | "createdAt">): SavedCollage {
  const all = readCollages();
  const entry: SavedCollage = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  all.push(entry);
  writeCollages(all);
  return entry;
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
