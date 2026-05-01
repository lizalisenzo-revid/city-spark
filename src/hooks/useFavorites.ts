import { useEffect, useState, useCallback } from "react";

const KEY = "today-favs-v1";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = (next: string[]) => {
    setIds(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle, set: persist };
}
