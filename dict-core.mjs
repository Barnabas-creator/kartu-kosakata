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
