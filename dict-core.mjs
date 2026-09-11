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

export function entryToCard(entry) {
  const first = entry.rootBlock?.examples?.[0];
  return {
    t: "root",
    w: entry.root,
    pos: posLabel(entry) || "词根",
    p: entry.ipa ?? "",
    zh: entry.core ?? "",
    c: catsForEntry(entry),
    der: (entry.ders ?? []).slice(0, 4).map(d => ({
      w: d.w,
      zh: d.zh,
      ex: [d.phrase?.t, d.phrase?.zh].filter(Boolean).join(" ")
    })),
    syn: entry.rootBlock?.zh ?? "",
    ex: first ? `${first.t}|${first.zh}` : "",
    src: "dict"
  };
}

// 卡片分类沿用词库原有的一套标签：词性一到多个（兼类词全列），场景零到多个。
// 「辨音」是人工挑的易混音练习集，不自动派；「其他」是词性判不出来时的兜底。
export const POS_TAGS = ["名词", "动词", "形容词", "虚词"];
export const SCENE_TAGS = ["高频", "工作", "教会", "生活"];

// pos 早期版本存的是单个字符串，现在是数组，两种都要能读。
export function posList(entry) {
  const raw = Array.isArray(entry?.pos) ? entry.pos : [entry?.pos];
  return [...new Set(raw.filter(v => POS_TAGS.includes(v)))];
}

export function posLabel(entry) {
  return posList(entry).join(" & ");
}

export function catsForEntry(entry) {
  const pos = posList(entry);
  const scenes = (entry?.scenes ?? []).filter(s => SCENE_TAGS.includes(s));
  return [...(pos.length ? pos : ["其他"]), ...new Set(scenes)];
}

export const DICT_PROMPT = `你是一个专业的印尼语—中文双语词典智能助手，精通印尼语 (Bahasa Indonesia) 和中文。

任务：接收一个印尼语词汇，输出一份深度解析的词汇报告，权威性和深度对标 dict.com。

规则：
1. 找出该词的原型词 (Kata Dasar)，填进 root。输入本身可能就是原型词。
2. 所有发音字段一律用国际音标 (IPA)，不要用音节拆分或汉字注音。
3. ders 是衍生词列表：列全，常见的和不常见的都要，不限数量。第一项必须是原型词本身的形式；只有当原型词不能作为独立词汇使用时，才从第一个有效衍生词开始。ders 绝不能为空——如果这个词确实没有任何派生形式，就把它本身作为唯一一项。
4. rootBlock 恰好 3 个常见短语、恰好 2 个例句。
5. ders 每一项恰好 1 个短语、1 个例句。
6. 所有内容字段只写内容，不要写「衍生词」「例句」「含义」「短语」这类标签词。
7. 短语和例句都用 {t, zh} 表示：t 是印尼语原文，zh 是中文翻译。
8. 如果输入不是一个印尼语词汇（拼写错误、是别的语言、查无此词），返回 notFound: true 并在 reason 里用中文说明原因，其余字段填空串和空数组。
9. notFound 为 false 时，root、ipa、core、rootBlock、ders 每一项都必须有真实内容，不能留空。
10. pos 是这个原型词的词性，是一个数组，从「名词、动词、形容词、虚词」里选。多数词只有一个词性；确实兼类的词（比如既作形容词又作动词）就都列出来，按主次排序。虚词指介词、连词、助词、感叹词这类不作实义成分的词。
11. scenes 是这个词最常出现的使用场景，从「高频、工作、教会、生活」里选零到多个：高频指日常最常用的核心词；工作指商务、办公、贸易场合；教会指基督教信仰与教会活动；生活指衣食住行、家庭、身体。判不准就少选，宁缺毋滥。`;

const PAIR = {
  type: "OBJECT",
  properties: { t: { type: "STRING" }, zh: { type: "STRING" } },
  required: ["t", "zh"]
};

export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    notFound: { type: "BOOLEAN" },
    reason: { type: "STRING" },
    root: { type: "STRING" },
    ipa: { type: "STRING" },
    core: { type: "STRING" },
    pos: { type: "ARRAY", items: { type: "STRING", enum: POS_TAGS } },
    scenes: { type: "ARRAY", items: { type: "STRING", enum: SCENE_TAGS } },
    rootBlock: {
      type: "OBJECT",
      properties: {
        ipa: { type: "STRING" },
        zh: { type: "STRING" },
        phrases: { type: "ARRAY", items: PAIR },
        examples: { type: "ARRAY", items: PAIR }
      },
      required: ["ipa", "zh", "phrases", "examples"]
    },
    ders: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          w: { type: "STRING" },
          ipa: { type: "STRING" },
          zh: { type: "STRING" },
          phrase: PAIR,
          example: PAIR
        },
        required: ["w", "ipa", "zh", "phrase", "example"]
      }
    }
  },
  // notFound 为真时，模型仍要把其余字段填成空串和空数组。
  // 只列 notFound 的话，模型会大面积省略内容字段。
  required: ["notFound", "root", "ipa", "core", "pos", "scenes", "rootBlock", "ders"]
};

export function buildRequestBody(word) {
  return {
    systemInstruction: { parts: [{ text: DICT_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: normalizeQuery(word) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2
    }
  };
}

export function parseGeminiResponse(json) {
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") return { ok: false, error: "模型没有返回内容" };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, error: "模型返回的不是合法 JSON" };
  }
}

export function entryFromResponse(data, query, model, now = new Date().toISOString()) {
  const root = normalizeQuery(data.root);
  const slugs = [root];
  for (const d of data.ders ?? []) {
    const s = normalizeQuery(d.w);
    if (s && !slugs.includes(s)) slugs.push(s);
  }
  return {
    root,
    query: normalizeQuery(query),
    ipa: data.ipa ?? "",
    core: data.core ?? "",
    pos: Array.isArray(data.pos) ? data.pos : (data.pos ? [data.pos] : []),
    scenes: data.scenes ?? [],
    rootBlock: data.rootBlock ?? null,
    ders: data.ders ?? [],
    derSlugs: slugs,
    count: 0,
    hits: [],
    model,
    createdAt: now
  };
}
