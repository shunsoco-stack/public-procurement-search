export function dateLabel(value: string | null | undefined, withTime = false): string {
  if (!value) return "未取得";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "未取得";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } as const : {})
  }).format(date);
}

export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function countLabel(value: number): string { return value.toLocaleString("ja-JP"); }

export function collectionIsStale(value: string | null | undefined): boolean {
  return Boolean(value && Date.now() - Date.parse(value) > 48 * 60 * 60 * 1000);
}
