const KEY = "lumen:recent-searches";
const LIMIT = 8;

function save(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function getRecents(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

export function addRecent(query: string) {
  const q = query.trim();
  if (!q) return;
  save([q, ...getRecents().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, LIMIT));
}

export function removeRecent(query: string): string[] {
  const next = getRecents().filter((x) => x !== query);
  save(next);
  return next;
}

export function clearRecents() {
  save([]);
}
