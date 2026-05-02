/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

// Cast to any so we can use tables not yet in the generated types.
// Run the SQL migration in Supabase first, then regenerate types.
const db = supabase as any;

export type SharedMemory = {
  id: string;
  place_id: string;
  place_title: string;
  place_area: string;
  created_by: string;
  created_at: string;
};

export type SharedMemoryItem = {
  id: string;
  memory_id: string;
  user_id: string;
  display_name: string | null;
  type: "photo" | "note";
  content: string;
  created_at: string;
};

/** Create a new shared memory page for a place. */
export async function createSharedMemory(
  placeId: string,
  placeTitle: string,
  placeArea: string,
  userId: string
): Promise<SharedMemory> {
  const { data, error } = await db
    .from("shared_memories")
    .insert({ place_id: placeId, place_title: placeTitle, place_area: placeArea, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SharedMemory;
}

/** Fetch a shared memory by ID (public). */
export async function getSharedMemory(id: string): Promise<SharedMemory | null> {
  const { data, error } = await db
    .from("shared_memories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as SharedMemory | null;
}

/** Fetch all items for a shared memory, ordered by time. */
export async function getSharedMemoryItems(memoryId: string): Promise<SharedMemoryItem[]> {
  const { data, error } = await db
    .from("shared_memory_items")
    .select("*")
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SharedMemoryItem[];
}

/** Add a photo or note to a shared memory. */
export async function addSharedMemoryItem(
  memoryId: string,
  userId: string,
  displayName: string | null,
  type: "photo" | "note",
  content: string
): Promise<SharedMemoryItem> {
  const { data, error } = await db
    .from("shared_memory_items")
    .insert({ memory_id: memoryId, user_id: userId, display_name: displayName, type, content })
    .select()
    .single();
  if (error) throw error;
  return data as SharedMemoryItem;
}

/** Delete your own item. */
export async function deleteSharedMemoryItem(itemId: string): Promise<void> {
  const { error } = await db.from("shared_memory_items").delete().eq("id", itemId);
  if (error) throw error;
}

/** Compress a File to a small base64 string suitable for DB storage (~25KB). */
export async function fileToSharedDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const maxDim = 800;
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.75);
}
