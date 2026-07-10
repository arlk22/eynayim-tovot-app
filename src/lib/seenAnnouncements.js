const STORAGE_KEY = 'eynayim-tovot.seenAnnouncements';

function readSeenIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function countUnseen(announcements) {
  const seen = readSeenIds();
  return announcements.filter((a) => !seen.has(a.id)).length;
}

export function markAllSeen(announcements) {
  const seen = readSeenIds();
  announcements.forEach((a) => seen.add(a.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}
