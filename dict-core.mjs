// 词典的纯函数：无 DOM、无网络、无 Firebase。
// index.html 和 tools/ 下的测试共用这一份。

export function normalizeQuery(input) {
  return String(input ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function slugify(word) {
  return normalizeQuery(word).replace(/ /g, "-");
}

export function findInLexicon(entries, query) {
  const q = normalizeQuery(query);
  if (!q) return null;
  for (const entry of entries ?? []) {
    if (normalizeQuery(entry.root) === q) return { entry, matched: q };
    for (const d of entry.derSlugs ?? []) {
      if (normalizeQuery(d) === q) return { entry, matched: q };
    }
  }
  return null;
}

export function bucketOf(count) {
  const n = Number(count) || 0;
  if (n <= 1) return "1";
  if (n <= 5) return "2-5";
  return "5+";
}

export function filterByBucket(entries, bucket) {
  if (bucket === "all" || !bucket) return [...(entries ?? [])];
  return (entries ?? []).filter(e => bucketOf(e.count) === bucket);
}

function localDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function groupHitsByDate(entries) {
  const flat = [];
  for (const entry of entries ?? []) {
    for (const hit of entry.hits ?? []) {
      flat.push({ root: entry.root, via: hit.via ?? null, at: hit.at, ai: !!hit.ai });
    }
  }
  flat.sort((a, b) => new Date(b.at) - new Date(a.at));
  const groups = [];
  for (const item of flat) {
    const date = localDate(item.at);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(item);
    else groups.push({ date, items: [item] });
  }
  return groups;
}
