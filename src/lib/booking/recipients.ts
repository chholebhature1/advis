export function parseExtraRecipientsFromEnv(): string[] {
  const raw = process.env.BOOKING_NOTIFICATION_EXTRA_RECIPIENTS ?? "";
  if (!raw || raw.trim().length === 0) return [];

  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const dedup: string[] = [];
  const seen = new Set<string>();

  for (const it of items) {
    const key = it.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(it);
    }
  }

  return dedup;
}

export function mergeRecipients(primary: string | string[], extras: string[]): string[] {
  const prim = Array.isArray(primary) ? primary : [primary];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const p of [...prim, ...extras]) {
    if (!p) continue;
    const trimmed = p.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(trimmed);
    }
  }

  return out;
}
