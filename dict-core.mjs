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

function isText(v) {
  return typeof v === "string" && v.trim() !== "";
}

function checkPair(obj, where, errs) {
  if (!isText(obj?.t)) errs.push(`${where}：t 缺失或为空`);
  if (!isText(obj?.zh)) errs.push(`${where}：zh 缺失或为空`);
}

export function validateEntry(entry) {
  const errs = [];
  if (!entry || typeof entry !== "object") return ["条目不是对象"];
  for (const f of ["root", "ipa", "core"]) {
    if (!isText(entry[f])) errs.push(`条目：${f} 缺失或为空`);
  }
  const rb = entry.rootBlock;
  if (!rb || typeof rb !== "object") {
    errs.push("条目：rootBlock 缺失");
  } else {
    if (!isText(rb.ipa)) errs.push("rootBlock：ipa 缺失或为空");
    if (!isText(rb.zh)) errs.push("rootBlock：zh 缺失或为空");
    if (!Array.isArray(rb.phrases) || rb.phrases.length !== 3) {
      errs.push("rootBlock：phrases 必须恰好 3 条");
    } else rb.phrases.forEach((p, i) => checkPair(p, `rootBlock.phrases[${i}]`, errs));
    if (!Array.isArray(rb.examples) || rb.examples.length !== 2) {
      errs.push("rootBlock：examples 必须恰好 2 条");
    } else rb.examples.forEach((p, i) => checkPair(p, `rootBlock.examples[${i}]`, errs));
  }
  if (!Array.isArray(entry.ders) || entry.ders.length === 0) {
    errs.push("条目：ders 必须是非空数组");
  } else {
    entry.ders.forEach((d, i) => {
      for (const f of ["w", "ipa", "zh"]) {
        if (!isText(d?.[f])) errs.push(`ders[${i}]：${f} 缺失或为空`);
      }
      checkPair(d?.phrase, `ders[${i}].phrase`, errs);
      checkPair(d?.example, `ders[${i}].example`, errs);
    });
  }
  if (!Array.isArray(entry.derSlugs) || entry.derSlugs.length === 0) {
    errs.push("条目：derSlugs 必须是非空数组");
  }
  return errs;
}

export function recordHit(entry, { via = null, ai = false, at = new Date().toISOString() } = {}) {
  const hits = [...(entry.hits ?? []), { at, via: via ? normalizeQuery(via) : null, ai: !!ai }];
  return { ...entry, hits, count: hits.length };
}

export function mergeLexicons(local, remote) {
  const byRoot = new Map();
  for (const entry of [...(local ?? []), ...(remote ?? [])]) {
    const key = slugify(entry.root);
    const prev = byRoot.get(key);
    if (!prev) { byRoot.set(key, { ...entry, hits: [...(entry.hits ?? [])] }); continue; }
    const seen = new Set(prev.hits.map(h => `${h.at}|${h.via ?? ""}`));
    for (const h of entry.hits ?? []) {
      const k = `${h.at}|${h.via ?? ""}`;
      if (!seen.has(k)) { seen.add(k); prev.hits.push(h); }
    }
  }
  const out = [];
  for (const entry of byRoot.values()) {
    entry.hits.sort((a, b) => new Date(a.at) - new Date(b.at));
    entry.count = entry.hits.length;
    out.push(entry);
  }
  return out;
}
