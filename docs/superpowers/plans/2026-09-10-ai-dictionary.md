# AI 词典 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Gemini gem 的印尼语词典功能嫁接进 kartu-kosakata，查过的词自动落库、不重复调 AI，并加上时间线和查询频次两个回顾视图。

**Architecture:** 纯函数（归一化、索引命中、频次分桶、时间线分组、JSON 转卡片、条目校验）抽进新文件 `dict-core.mjs`，`index.html` 用相对路径 import 它，`tools/` 下的 node --test 也 import 它——同一份代码，既跑在浏览器里也跑在测试里。其余部分（Gemini 请求、Firestore 读写、三个视图的 DOM）全部写在 `index.html` 现有的那个 `<script type="module">` 里。词库存在 Firestore 现有同步码文档的子集合下，同时镜像一份到 localStorage，没连同步码也能用。

**Tech Stack:** 原生 ES module，无构建；Firebase 10.14.1 Firestore（已在用）；Google AI Studio 的 Gemini REST API（浏览器直连，结构化 JSON 输出）；node:test + node:assert 做单元测试。

## Global Constraints

- 前置文档：设计 spec 在 `docs/superpowers/specs/2026-09-10-ai-dictionary-design.md`，有分歧以 spec 为准。
- **只做印尼语。** 不识别英语，不做语言歧义问答。
- **不新建应用、不重构现有代码。** 现有 312 张手写卡的数据结构、卡片视图、进度同步、PWA 清单一律不动。新增文件仅 `dict-core.mjs` 和它的测试。
- 发音字段一律 IPA，不接受「a-jar 阿-乍」那种注音（那是手写卡 `p` 字段的格式，与词典条目无关）。
- 任何 AI 调用失败或返回不合法，都不写词库、不记查询次数。
- 缓存查询全程不依赖网络。
- 十个分类标签固定为：`["名词","动词","形容词","虚词","高频","工作","教会","生活","辨音","其他"]`，顺序不变。
- 提交信息用英文祈使句，与仓库现有历史一致（`git log --oneline` 看得到）。
- 本地预览必须起静态服务器（`python3 -m http.server 8000`），`file://` 直接打开会因为 ES module 的跨域限制加载不了。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `dict-core.mjs`（新建，仓库根目录） | 词典的纯函数。无 DOM、无网络、无 Firebase 依赖。浏览器和测试共用 |
| `tools/dict-core.test.mjs`（新建） | `dict-core.mjs` 的单元测试 |
| `index.html`（修改） | 提示词常量、Gemini 请求、Firestore 词库读写、三个视图的 DOM 与样式 |
| `README.md`（修改） | 补词典功能的说明和 API key 的取得方式 |

`dict-core.mjs` 放在仓库根目录而不是 `tools/` 下，因为它要被部署到 GitHub Pages 供 `index.html` 引用；`tools/` 是纯开发脚本目录。

---

### Task 1: 查询归一化与词库索引命中

**Files:**
- Create: `dict-core.mjs`
- Test: `tools/dict-core.test.mjs`

**Interfaces:**
- Consumes: 无
- Produces:
  - `normalizeQuery(input: string): string` — trim、转小写、连续空白压成单个空格
  - `slugify(word: string): string` — 归一化后再把空格换成连字符
  - `findInLexicon(entries: Entry[], query: string): {entry: Entry, matched: string} | null` — `matched` 是命中的那个词（词根本身或某个衍生词），已归一化
  - 类型 `Entry` 的形状见 spec「数据模型」，本任务只用到 `root: string` 和 `derSlugs: string[]`

- [ ] **Step 1: 写失败的测试**

创建 `tools/dict-core.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuery, slugify, findInLexicon } from "../dict-core.mjs";

test("normalizeQuery 去空白、转小写、压缩空格", () => {
  assert.equal(normalizeQuery("  MengAjar "), "mengajar");
  assert.equal(normalizeQuery("air    terjun"), "air terjun");
  assert.equal(normalizeQuery("\tBelajar\n"), "belajar");
  assert.equal(normalizeQuery(""), "");
});

test("slugify 把空格换成连字符", () => {
  assert.equal(slugify("Air Terjun"), "air-terjun");
  assert.equal(slugify(" ajar "), "ajar");
});

const lex = [
  { root: "ajar", derSlugs: ["ajar", "mengajar", "pelajaran"] },
  { root: "kerja", derSlugs: ["bekerja", "pekerjaan"] }
];

test("findInLexicon 命中词根本身", () => {
  const hit = findInLexicon(lex, "ajar");
  assert.equal(hit.entry.root, "ajar");
  assert.equal(hit.matched, "ajar");
});

test("findInLexicon 命中衍生词，返回所属词根", () => {
  const hit = findInLexicon(lex, "pekerjaan");
  assert.equal(hit.entry.root, "kerja");
  assert.equal(hit.matched, "pekerjaan");
});

test("findInLexicon 命中词根即使它不在 derSlugs 里", () => {
  const hit = findInLexicon([{ root: "kerja", derSlugs: ["bekerja"] }], "kerja");
  assert.equal(hit.entry.root, "kerja");
  assert.equal(hit.matched, "kerja");
});

test("findInLexicon 忽略大小写和前后空白", () => {
  assert.equal(findInLexicon(lex, "  MENGAJAR ").entry.root, "ajar");
});

test("findInLexicon 未命中返回 null", () => {
  assert.equal(findInLexicon(lex, "makan"), null);
  assert.equal(findInLexicon(lex, ""), null);
  assert.equal(findInLexicon([], "ajar"), null);
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `node --test tools/dict-core.test.mjs`
Expected: FAIL，报错 `Cannot find module .../dict-core.mjs`

- [ ] **Step 3: 写最小实现**

创建 `dict-core.mjs`：

```js
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tools/dict-core.test.mjs`
Expected: PASS，6 个测试全绿

- [ ] **Step 5: 提交**

```bash
git add dict-core.mjs tools/dict-core.test.mjs
git commit -m "Add query normalization and lexicon lookup"
```

---

### Task 2: 频次分桶与时间线分组

**Files:**
- Modify: `dict-core.mjs`
- Test: `tools/dict-core.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `normalizeQuery`
- Produces:
  - `bucketOf(count: number): "1" | "2-5" | "5+"` — 单个次数落在哪个桶
  - `filterByBucket(entries: Entry[], bucket: "all"|"1"|"2-5"|"5+"): Entry[]` — 按 `entry.count` 筛选，保持入参顺序
  - `groupHitsByDate(entries: Entry[]): {date: string, items: {root, via, at, ai}[]}[]` — 把所有条目的 `hits` 摊平，按本地日期 `YYYY-MM-DD` 分组，组之间按日期倒序，组内按时间倒序

`hits` 每项形如 `{at: string(ISO), via: string|null, ai: boolean}`。

- [ ] **Step 1: 写失败的测试**

追加到 `tools/dict-core.test.mjs`（同时把 import 那行补上新函数）：

```js
import { bucketOf, filterByBucket, groupHitsByDate } from "../dict-core.mjs";

test("bucketOf 的边界：1 / 2 / 5 / 6", () => {
  assert.equal(bucketOf(1), "1");
  assert.equal(bucketOf(2), "2-5");
  assert.equal(bucketOf(5), "2-5");
  assert.equal(bucketOf(6), "5+");
});

test("filterByBucket 按次数筛选并保持原顺序", () => {
  const entries = [
    { root: "a", count: 1 }, { root: "b", count: 5 },
    { root: "c", count: 9 }, { root: "d", count: 2 }
  ];
  assert.deepEqual(filterByBucket(entries, "all").map(e => e.root), ["a","b","c","d"]);
  assert.deepEqual(filterByBucket(entries, "1").map(e => e.root), ["a"]);
  assert.deepEqual(filterByBucket(entries, "2-5").map(e => e.root), ["b","d"]);
  assert.deepEqual(filterByBucket(entries, "5+").map(e => e.root), ["c"]);
});

test("groupHitsByDate 跨条目摊平、按日期倒序、组内按时间倒序", () => {
  const entries = [
    { root: "ajar", hits: [
      { at: "2026-09-10T01:00:00Z", via: "mengajar", ai: true },
      { at: "2026-09-12T03:00:00Z", via: null, ai: false }
    ]},
    { root: "kerja", hits: [
      { at: "2026-09-10T05:00:00Z", via: "bekerja", ai: true }
    ]}
  ];
  const groups = groupHitsByDate(entries);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].date, "2026-09-12");
  assert.equal(groups[1].date, "2026-09-10");
  assert.deepEqual(groups[1].items.map(i => i.root), ["kerja", "ajar"]);
  assert.equal(groups[1].items[0].via, "bekerja");
  assert.equal(groups[1].items[1].ai, true);
});

test("groupHitsByDate 忽略没有 hits 的条目，空库返回空数组", () => {
  assert.deepEqual(groupHitsByDate([{ root: "x" }]), []);
  assert.deepEqual(groupHitsByDate([]), []);
});
```

注意：测试里的 `at` 是 UTC，分组按运行机器的本地日期算。上面两条 UTC 时间（01:00 和 05:00）在东八区都落在同一个 9 月 10 日，在 UTC 也落在同一天，所以这个断言在常见时区下都成立。

- [ ] **Step 2: 跑测试确认它失败**

Run: `node --test tools/dict-core.test.mjs`
Expected: FAIL，报错 `bucketOf is not a function`（或同类的 import 报错）

- [ ] **Step 3: 写最小实现**

追加到 `dict-core.mjs`：

```js
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tools/dict-core.test.mjs`
Expected: PASS，10 个测试全绿

- [ ] **Step 5: 提交**

```bash
git add dict-core.mjs tools/dict-core.test.mjs
git commit -m "Group lookups by date and bucket them by frequency"
```

---

### Task 3: 条目校验、记一次查询、合并两端词库

**Files:**
- Modify: `dict-core.mjs`
- Test: `tools/dict-core.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `normalizeQuery`、`slugify`
- Produces:
  - `validateEntry(entry: object): string[]` — 返回错误信息数组，空数组表示合法
  - `recordHit(entry: Entry, {via: string|null, ai: boolean, at?: string}): Entry` — 返回追加了一条 hit、`count` 同步更新的**新对象**，不改原对象
  - `mergeLexicons(local: Entry[], remote: Entry[]): Entry[]` — 按 `root` 合并两边，`hits` 按 `at`+`via` 去重后按时间升序，`count` 取合并后的长度

`validateEntry` 的规则来自 spec：`root`/`ipa`/`core` 是非空字符串，`rootBlock.phrases` 恰好 3 条、`rootBlock.examples` 恰好 2 条，`ders` 非空且每项有 `w`/`ipa`/`zh`/`phrase`/`example`，`derSlugs` 非空。

- [ ] **Step 1: 写失败的测试**

追加到 `tools/dict-core.test.mjs`：

```js
import { validateEntry, recordHit, mergeLexicons } from "../dict-core.mjs";

const p = (t) => ({ t, zh: "中" });
const goodEntry = {
  root: "ajar", query: "mengajar", ipa: "ˈa.dʒar", core: "教导",
  rootBlock: {
    ipa: "ˈa.dʒar", zh: "教导、传授",
    phrases: [p("belajar mengajar"), p("tenaga pengajar"), p("bahan ajar")],
    examples: [p("Dia mengajar."), p("Kami belajar.")]
  },
  ders: [
    { w: "mengajar", ipa: "məˈŋa.dʒar", zh: "教", phrase: p("mengajar di sekolah"), example: p("Dia mengajar di sekolah.") }
  ],
  derSlugs: ["mengajar"],
  count: 1, hits: [{ at: "2026-09-10T01:00:00Z", via: "mengajar", ai: true }]
};

test("validateEntry 接受合法条目", () => {
  assert.deepEqual(validateEntry(goodEntry), []);
});

test("validateEntry 抓必填字段缺失", () => {
  const bad = { ...goodEntry, root: "", core: null };
  const errs = validateEntry(bad);
  assert.ok(errs.some(e => e.includes("root")));
  assert.ok(errs.some(e => e.includes("core")));
});

test("validateEntry 抓短语和例句的数量不对", () => {
  const bad = { ...goodEntry, rootBlock: { ...goodEntry.rootBlock, phrases: [p("只有一条")] } };
  assert.ok(validateEntry(bad).some(e => e.includes("3")));
  const bad2 = { ...goodEntry, rootBlock: { ...goodEntry.rootBlock, examples: [p("一"), p("二"), p("三")] } };
  assert.ok(validateEntry(bad2).some(e => e.includes("2")));
});

test("validateEntry 抓衍生词为空或字段残缺", () => {
  assert.ok(validateEntry({ ...goodEntry, ders: [] }).length > 0);
  const bad = { ...goodEntry, ders: [{ w: "mengajar", zh: "教" }] };
  assert.ok(validateEntry(bad).some(e => e.includes("ipa")));
});

test("recordHit 追加记录且不改原对象", () => {
  const before = { root: "ajar", count: 1, hits: [{ at: "2026-09-10T01:00:00Z", via: null, ai: true }] };
  const after = recordHit(before, { via: "mengajar", ai: false, at: "2026-09-11T02:00:00Z" });
  assert.equal(before.hits.length, 1);
  assert.equal(after.hits.length, 2);
  assert.equal(after.count, 2);
  assert.equal(after.hits[1].via, "mengajar");
  assert.equal(after.hits[1].ai, false);
});

test("recordHit 在没有 hits 字段时也能起头", () => {
  const after = recordHit({ root: "baru" }, { via: null, ai: true, at: "2026-09-11T02:00:00Z" });
  assert.equal(after.count, 1);
  assert.equal(after.hits[0].via, null);
});

test("mergeLexicons 按词根合并，hits 去重后按时间升序", () => {
  const local = [{ root: "ajar", count: 2, hits: [
    { at: "2026-09-10T01:00:00Z", via: null, ai: true },
    { at: "2026-09-12T01:00:00Z", via: "mengajar", ai: false }
  ]}];
  const remote = [
    { root: "ajar", count: 2, hits: [
      { at: "2026-09-10T01:00:00Z", via: null, ai: true },
      { at: "2026-09-11T01:00:00Z", via: "ajaran", ai: false }
    ]},
    { root: "kerja", count: 1, hits: [{ at: "2026-09-09T01:00:00Z", via: null, ai: true }] }
  ];
  const merged = mergeLexicons(local, remote);
  assert.equal(merged.length, 2);
  const ajar = merged.find(e => e.root === "ajar");
  assert.equal(ajar.count, 3);
  assert.deepEqual(ajar.hits.map(h => h.via), [null, "ajaran", "mengajar"]);
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `node --test tools/dict-core.test.mjs`
Expected: FAIL，报错 `validateEntry is not a function`

- [ ] **Step 3: 写最小实现**

追加到 `dict-core.mjs`：

```js
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tools/dict-core.test.mjs`
Expected: PASS，17 个测试全绿

- [ ] **Step 5: 提交**

```bash
git add dict-core.mjs tools/dict-core.test.mjs
git commit -m "Validate dictionary entries and merge lexicons across devices"
```

---

### Task 4: 词典条目转学习卡

**Files:**
- Modify: `dict-core.mjs`
- Test: `tools/dict-core.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `slugify`
- Produces:
  - `entryToCard(entry: Entry, cats: string[]): Card` — 转成与 `DATA` 里词根卡同构的对象，多一个 `src:"dict"`

映射规则：`w` 取 `entry.root`；`pos` 取 `entry.ders[0].zh` 之外的信息拿不到，因此固定填 `"词根"`；`p` 填 `entry.ipa`；`zh` 填 `entry.core`；`c` 填传入的 `cats`（空数组时兜底成 `["其他"]`）；`der` 取前 4 个衍生词，每个映射成 `{w, zh, ex}`，`ex` 用该衍生词的短语拼成 `"原文 中文"`；`syn` 用 `entry.rootBlock.zh`；`ex` 用词根块第一个例句拼成 `"原文|中文"`（现有卡片就是用竖线分隔的）。

- [ ] **Step 1: 写失败的测试**

追加到 `tools/dict-core.test.mjs`：

```js
import { entryToCard } from "../dict-core.mjs";

test("entryToCard 映射字段并截到 4 个衍生词", () => {
  const mk = (w) => ({ w, ipa: "x", zh: `${w}的意思`, phrase: { t: `${w} pakai`, zh: "用法" }, example: { t: "s", zh: "句" } });
  const entry = {
    root: "ajar", ipa: "ˈa.dʒar", core: "教导",
    rootBlock: { ipa: "ˈa.dʒar", zh: "教与学两个方向",
      phrases: [], examples: [{ t: "Yesus mengajar.", zh: "耶稣教导。" }] },
    ders: ["mengajar", "ajaran", "pelajar", "pelajaran", "pengajaran"].map(mk),
    derSlugs: []
  };
  const card = entryToCard(entry, ["动词", "教会"]);
  assert.equal(card.t, "root");
  assert.equal(card.w, "ajar");
  assert.equal(card.p, "ˈa.dʒar");
  assert.equal(card.zh, "教导");
  assert.equal(card.src, "dict");
  assert.deepEqual(card.c, ["动词", "教会"]);
  assert.equal(card.der.length, 4);
  assert.deepEqual(card.der[0], { w: "mengajar", zh: "mengajar的意思", ex: "mengajar pakai 用法" });
  assert.equal(card.syn, "教与学两个方向");
  assert.equal(card.ex, "Yesus mengajar.|耶稣教导。");
});

test("entryToCard 在没给分类时兜底成「其他」", () => {
  const entry = {
    root: "baru", ipa: "ˈba.ru", core: "新的",
    rootBlock: { zh: "形容词", phrases: [], examples: [] },
    ders: [{ w: "terbaru", ipa: "x", zh: "最新的", phrase: { t: "a", zh: "b" }, example: { t: "c", zh: "d" } }]
  };
  const card = entryToCard(entry, []);
  assert.deepEqual(card.c, ["其他"]);
  assert.equal(card.ex, "");
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `node --test tools/dict-core.test.mjs`
Expected: FAIL，报错 `entryToCard is not a function`

- [ ] **Step 3: 写最小实现**

追加到 `dict-core.mjs`：

```js
export function entryToCard(entry, cats) {
  const first = entry.rootBlock?.examples?.[0];
  return {
    t: "root",
    w: entry.root,
    pos: "词根",
    p: entry.ipa ?? "",
    zh: entry.core ?? "",
    c: (cats && cats.length) ? [...cats] : ["其他"],
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tools/dict-core.test.mjs`
Expected: PASS，19 个测试全绿

- [ ] **Step 5: 跑一遍全部测试，确认没碰坏老的**

Run: `node --test tools/*.test.mjs && node tools/check-data.mjs`
Expected: 两条都通过

- [ ] **Step 6: 提交**

```bash
git add dict-core.mjs tools/dict-core.test.mjs
git commit -m "Turn a dictionary entry into a study card"
```

---

### Task 5: Gemini 请求的构造与解析

**Files:**
- Modify: `dict-core.mjs`
- Test: `tools/dict-core.test.mjs`

**Interfaces:**
- Consumes: Task 3 的 `validateEntry`、Task 1 的 `normalizeQuery`/`slugify`
- Produces:
  - `DICT_PROMPT: string` — 系统提示词常量
  - `RESPONSE_SCHEMA: object` — Gemini `responseSchema` 的值
  - `buildRequestBody(word: string): object` — 完整的 `generateContent` 请求体
  - `parseGeminiResponse(json: object): {ok: true, data: object} | {ok: false, error: string}` — 从 Gemini 的响应壳里剥出模型给的 JSON
  - `entryFromResponse(data: object, query: string, model: string, now?: string): Entry` — 补齐 `derSlugs`、`query`、`createdAt`、空的 `hits`/`count`

网络请求本身（`fetch`）不在这里，放 Task 7，这样这一层可以完全离线测试。

- [ ] **Step 1: 写失败的测试**

追加到 `tools/dict-core.test.mjs`：

```js
import { DICT_PROMPT, buildRequestBody, parseGeminiResponse, entryFromResponse } from "../dict-core.mjs";

test("DICT_PROMPT 保留 gem 的硬性规则，且不提英语", () => {
  assert.ok(DICT_PROMPT.includes("Kata Dasar"));
  assert.ok(DICT_PROMPT.includes("dict.com"));
  assert.ok(DICT_PROMPT.includes("IPA"));
  assert.ok(!DICT_PROMPT.includes("英语"));
  assert.ok(!DICT_PROMPT.includes("English"));
});

test("buildRequestBody 把词放进 contents，并要求 JSON 输出", () => {
  const body = buildRequestBody("mengajar");
  assert.equal(body.contents[0].parts[0].text, "mengajar");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.ok(body.generationConfig.responseSchema);
  assert.ok(body.systemInstruction.parts[0].text.includes("Kata Dasar"));
});

test("parseGeminiResponse 剥出模型返回的 JSON", () => {
  const raw = { candidates: [{ content: { parts: [{ text: '{"notFound":false,"root":"ajar"}' }] } }] };
  const out = parseGeminiResponse(raw);
  assert.equal(out.ok, true);
  assert.equal(out.data.root, "ajar");
});

test("parseGeminiResponse 在结构不对或不是 JSON 时报错", () => {
  assert.equal(parseGeminiResponse({}).ok, false);
  assert.equal(parseGeminiResponse({ candidates: [] }).ok, false);
  const bad = { candidates: [{ content: { parts: [{ text: "不是 JSON" }] } }] };
  assert.equal(parseGeminiResponse(bad).ok, false);
});

test("entryFromResponse 补齐 derSlugs、query、空 hits", () => {
  const data = {
    notFound: false, root: "Ajar", ipa: "ˈa.dʒar", core: "教导",
    rootBlock: { ipa: "x", zh: "y", phrases: [], examples: [] },
    ders: [{ w: "Mengajar" }, { w: "ajaran" }]
  };
  const entry = entryFromResponse(data, " MengAjar ", "gemini-2.5-flash", "2026-09-10T01:00:00Z");
  assert.equal(entry.root, "ajar");
  assert.equal(entry.query, "mengajar");
  assert.deepEqual(entry.derSlugs, ["ajar", "mengajar", "ajaran"]);
  assert.deepEqual(entry.hits, []);
  assert.equal(entry.count, 0);
  assert.equal(entry.model, "gemini-2.5-flash");
  assert.equal(entry.createdAt, "2026-09-10T01:00:00Z");
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `node --test tools/dict-core.test.mjs`
Expected: FAIL，报错 `DICT_PROMPT is not defined` 或同类 import 报错

- [ ] **Step 3: 写最小实现**

追加到 `dict-core.mjs`。提示词是 gem 的 V3.8 删掉英语支线、发音收紧成 IPA 之后的版本：

```js
export const DICT_PROMPT = `你是一个专业的印尼语—中文双语词典智能助手，精通印尼语 (Bahasa Indonesia) 和中文。

任务：接收一个印尼语词汇，输出一份深度解析的词汇报告，权威性和深度对标 dict.com。

规则：
1. 找出该词的原型词 (Kata Dasar)，填进 root。输入本身可能就是原型词。
2. 所有发音字段一律用国际音标 (IPA)，不要用音节拆分或汉字注音。
3. ders 是衍生词列表：列全，常见的和不常见的都要，不限数量。第一项必须是原型词本身的形式；只有当原型词不能作为独立词汇使用时，才从第一个有效衍生词开始。
4. rootBlock 恰好 3 个常见短语、恰好 2 个例句。
5. ders 每一项恰好 1 个短语、1 个例句。
6. 所有内容字段只写内容，不要写「衍生词」「例句」「含义」「短语」这类标签词。
7. 短语和例句都用 {t, zh} 表示：t 是印尼语原文，zh 是中文翻译。
8. 如果输入不是一个印尼语词汇（拼写错误、是别的语言、查无此词），返回 notFound: true 并在 reason 里用中文说明原因，其余字段留空。`;

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
  required: ["notFound"]
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
    rootBlock: data.rootBlock ?? null,
    ders: data.ders ?? [],
    derSlugs: slugs,
    count: 0,
    hits: [],
    model,
    createdAt: now
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tools/dict-core.test.mjs`
Expected: PASS，24 个测试全绿

- [ ] **Step 5: 提交**

```bash
git add dict-core.mjs tools/dict-core.test.mjs
git commit -m "Port the gem prompt to a structured-output Gemini request"
```

---

### Task 6: 词库的本地存储与 Firestore 同步

**Files:**
- Modify: `index.html`（`<script type="module">` 内，紧跟现有同步逻辑之后，约 1890 行附近）

**Interfaces:**
- Consumes: Task 1-5 的全部导出
- Produces（都是 `index.html` 内的模块级函数）：
  - `lexicon: Entry[]` — 内存里的词库，全局单例
  - `loadLexiconLocal(): Entry[]`、`saveLexiconLocal(): void`
  - `upsertEntry(entry: Entry): void` — 按 root 覆盖或追加，写本地并推远端
  - `pushEntryToRemote(entry: Entry): void`
  - `attachLexiconSync(code: string): Promise<void>` — 连同步码时拉远端、合并、回写
  - `apiKey: string`、`setApiKey(key: string): void`

- [ ] **Step 1: 在 index.html 顶部引入 dict-core**

在现有两条 firebase import 之后加一行：

```js
import {
  normalizeQuery, slugify, findInLexicon, bucketOf, filterByBucket,
  groupHitsByDate, validateEntry, recordHit, mergeLexicons, entryToCard,
  buildRequestBody, parseGeminiResponse, entryFromResponse
} from "./dict-core.mjs";
```

同时把 firestore 的 import 补上后面要用的方法：

```js
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
```

- [ ] **Step 2: 写词库存储层**

在 `disconnectSync()` 函数之后插入：

```js
const LEXICON_KEY = "kosakata-lexicon-v1";
const APIKEY_KEY = "kosakata-api-key";
const MODEL = "gemini-2.5-flash";

let lexicon = loadLexiconLocal();
let apiKey = localStorage.getItem(APIKEY_KEY) || "";

function loadLexiconLocal(){
  try {
    const raw = localStorage.getItem(LEXICON_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function saveLexiconLocal(){
  try { localStorage.setItem(LEXICON_KEY, JSON.stringify(lexicon)); } catch(e){}
}

function upsertEntry(entry){
  const i = lexicon.findIndex(e => slugify(e.root) === slugify(entry.root));
  if(i >= 0) lexicon[i] = entry; else lexicon.push(entry);
  saveLexiconLocal();
  pushEntryToRemote(entry);
}

function pushEntryToRemote(entry){
  if(!syncRef) return;
  setDoc(doc(syncRef, "lexicon", slugify(entry.root)), entry).catch(()=>{});
}

function setApiKey(key){
  apiKey = key.trim();
  localStorage.setItem(APIKEY_KEY, apiKey);
  if(syncRef) setDoc(syncRef, { apiKey }, { merge: true }).catch(()=>{});
}

async function attachLexiconSync(){
  if(!syncRef) return;
  try {
    const snap = await getDocs(collection(syncRef, "lexicon"));
    const remote = snap.docs.map(d => d.data());
    lexicon = mergeLexicons(lexicon, remote);
    saveLexiconLocal();
    for(const entry of lexicon) pushEntryToRemote(entry);
    renderDict();
    renderTimeline();
  } catch(e){}
}
```

- [ ] **Step 3: 让连同步码时也拉词库和 key**

在 `connectSync()` 里，`$("syncStatus").textContent = "已连接";` 那一行之后加：

```js
    const remoteKey = snap.exists() ? (snap.data().apiKey || "") : "";
    if(remoteKey && !apiKey){ apiKey = remoteKey; localStorage.setItem(APIKEY_KEY, apiKey); }
    else if(apiKey && !remoteKey){ await setDoc(syncRef, { apiKey }, { merge: true }); }
    await attachLexiconSync();
```

- [ ] **Step 4: 手动验证存储层**

Run: `python3 -m http.server 8000`，浏览器打开 `http://localhost:8000`，开控制台执行：

```js
localStorage.getItem("kosakata-lexicon-v1")
```

Expected: 返回 `null`（还没查过词），且控制台没有报错——特别是没有 `Failed to resolve module specifier "./dict-core.mjs"`。

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "Store the lexicon locally and mirror it to the sync code"
```

---

### Task 7: 查词流程与 Gemini 调用

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 6 的 `lexicon`/`upsertEntry`/`apiKey`/`MODEL`
- Produces:
  - `lookup(rawQuery: string): Promise<{status, entry?, matched?, message?}>` — `status` 取值 `"cached" | "fetched" | "notfound" | "error"`
  - `callGemini(word: string): Promise<{ok, data?, error?}>`

- [ ] **Step 1: 写 Gemini 调用**

在 Task 6 的存储层之后插入：

```js
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(word){
  if(!apiKey) return { ok:false, error:"NOKEY" };
  let res;
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(buildRequestBody(word))
    });
  } catch(e){
    return { ok:false, error:"连不上，词库里的词仍然可以查。" };
  }
  if(res.status === 401 || res.status === 403) return { ok:false, error:"密钥无效或已过期，去设置里换一个。" };
  if(res.status === 429) return { ok:false, error:"今日免费额度用完了，明天再试。" };
  if(!res.ok) return { ok:false, error:`查询失败（HTTP ${res.status}）。` };
  const parsed = parseGeminiResponse(await res.json());
  return parsed.ok ? { ok:true, data: parsed.data } : { ok:false, error: parsed.error };
}
```

- [ ] **Step 2: 写查词流程**

紧接着插入。注意失败时一律不写库、不记 hit：

```js
async function lookup(rawQuery){
  const q = normalizeQuery(rawQuery);
  if(!q) return { status:"error", message:"先输入一个词。" };

  const hit = findInLexicon(lexicon, q);
  if(hit){
    const via = normalizeQuery(hit.entry.root) === q ? null : q;
    const updated = recordHit(hit.entry, { via, ai:false });
    upsertEntry(updated);
    return { status:"cached", entry: updated, matched: hit.matched };
  }

  let out = await callGemini(q);
  if(!out.ok && out.error === "NOKEY") return { status:"error", message:"NOKEY" };
  if(out.ok && out.data.notFound !== true && validateEntry(entryFromResponse(out.data, q, MODEL)).length){
    out = await callGemini(q);          // 不合 schema 时重试一次
  }
  if(!out.ok) return { status:"error", message: out.error };
  if(out.data.notFound === true){
    return { status:"notfound", message: out.data.reason || "查无此词。" };
  }

  const entry = entryFromResponse(out.data, q, MODEL);
  const errs = validateEntry(entry);
  if(errs.length) return { status:"error", message:`返回的内容不完整：${errs[0]}` };

  const withHit = recordHit(entry, { via: normalizeQuery(entry.root) === q ? null : q, ai:true });
  upsertEntry(withHit);
  return { status:"fetched", entry: withHit, matched: q };
}
```

- [ ] **Step 3: 手动验证**

Run: 起服务器打开页面，控制台执行 `await lookup("mengajar")`
Expected: 没填 key 时返回 `{status:"error", message:"NOKEY"}`；填了 key（下一个任务做界面，先临时 `setApiKey("你的key")`）后返回 `{status:"fetched", entry:{root:"ajar", ...}}`，且再执行一次同样的调用返回 `{status:"cached"}`、`entry.count` 变成 2。

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "Look a word up in the cache first, then ask Gemini"
```

---

### Task 8: 三个页签的导航骨架

**Files:**
- Modify: `index.html`（`.masthead` 之后的 DOM 与对应样式）

**Interfaces:**
- Consumes: 无
- Produces: `showView(name: "card"|"dict"|"timeline"): void`，以及三个容器 `#viewCard` / `#viewDict` / `#viewTimeline`

- [ ] **Step 1: 加页签的 DOM**

在 `.masthead` 元素之后、现有卡片区之前插入：

```html
<nav class="tabs">
  <button class="tab on" data-view="card">卡片</button>
  <button class="tab" data-view="dict">词典</button>
  <button class="tab" data-view="timeline">日历</button>
</nav>
```

把现有从分类筛选行到底部按钮区的所有元素，整体包进 `<div id="viewCard">…</div>`，并在其后加两个空容器：

```html
<div id="viewDict" hidden></div>
<div id="viewTimeline" hidden></div>
```

- [ ] **Step 2: 加样式**

在 `.masthead` 的样式规则之后插入：

```css
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
  .tabs .tab {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; letter-spacing: 0.08em;
    padding: 7px 14px; border: 1.5px solid var(--ink);
    background: transparent; color: var(--ink);
    cursor: pointer; border-radius: 2px;
  }
  .tabs .tab.on { background: var(--ink); color: var(--paper); }
```

- [ ] **Step 3: 加切换逻辑**

在现有的键盘事件绑定附近插入：

```js
function showView(name){
  for(const el of document.querySelectorAll(".tabs .tab")){
    el.classList.toggle("on", el.dataset.view === name);
  }
  $("viewCard").hidden = name !== "card";
  $("viewDict").hidden = name !== "dict";
  $("viewTimeline").hidden = name !== "timeline";
  if(name === "dict") renderDict();
  if(name === "timeline") renderTimeline();
}
for(const el of document.querySelectorAll(".tabs .tab")){
  el.addEventListener("click", ()=> showView(el.dataset.view));
}
```

现有的空格翻面、左右箭头快捷键要加一道闸，只在卡片页生效。找到那个 `document.addEventListener("keydown", …)`，在处理函数最前面加：

```js
  if($("viewCard").hidden) return;
```

词典页搜索框里打字因此也不会误触这些快捷键——搜索框在 `#viewDict` 里，那时卡片页是隐藏的。

- [ ] **Step 4: 手动验证**

Run: 起服务器打开页面
Expected: 三个页签能点，卡片页行为跟改动前一样；切到词典页和日历页时按空格不再翻卡。（此时两个新页面还是空的，`renderDict` / `renderTimeline` 下一个任务才写，先在文件里放两个空函数占位以免报错。）

在切换逻辑之前先放：

```js
function renderDict(){}
function renderTimeline(){}
```

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "Split the app into card, dictionary, and timeline tabs"
```

---

### Task 9: 词典页——搜索与报告渲染

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 7 的 `lookup`，Task 8 的 `#viewDict`
- Produces: `renderDict(): void`（重画整个词典页）、`renderEntry(entry, matched, cached): void`（画报告区）

- [ ] **Step 1: 填词典页的 DOM**

把 `<div id="viewDict" hidden></div>` 换成：

```html
<div id="viewDict" hidden>
  <div class="dictbar">
    <input id="dictInput" type="search" placeholder="输入一个印尼语词" autocomplete="off">
    <button id="dictGo">查</button>
  </div>
  <div id="dictMsg" class="dictmsg" hidden></div>
  <div id="dictResult"></div>
  <div class="libhead">
    <span>词库 <b id="libCount">0</b></span>
    <div class="libfilters">
      <button class="lf on" data-b="all">全部</button>
      <button class="lf" data-b="1">1 次</button>
      <button class="lf" data-b="2-5">2-5 次</button>
      <button class="lf" data-b="5+">5 次以上</button>
    </div>
  </div>
  <div id="libList"></div>
</div>
```

- [ ] **Step 2: 加样式**

```css
  .dictbar { display: flex; gap: 8px; margin-bottom: 14px; }
  .dictbar input {
    flex: 1; font-family: 'Inter', sans-serif; font-size: 16px;
    padding: 10px 12px; border: 1.5px solid var(--ink);
    background: var(--paper-2); color: var(--ink); border-radius: 2px;
  }
  .dictbar button {
    padding: 10px 18px; border: 1.5px solid var(--ink);
    background: var(--ink); color: var(--paper);
    font-family: 'JetBrains Mono', monospace; cursor: pointer; border-radius: 2px;
  }
  .dictmsg {
    padding: 12px; margin-bottom: 14px; border-left: 3px solid var(--clove);
    background: var(--paper-2); font-size: 14px; line-height: 1.6;
  }
  .entry { border: 1.5px solid var(--ink); padding: 16px; background: var(--paper-2); }
  .entry h2 { font-family: 'Fraunces', serif; font-size: 26px; }
  .entry .meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--mute); margin: 4px 0 12px; }
  .entry .core { font-size: 16px; margin-bottom: 14px; }
  .entry h3 {
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--moss);
    margin: 16px 0 8px; border-top: 1px solid var(--ink); padding-top: 8px;
  }
  .entry .line { margin: 6px 0; font-size: 14px; line-height: 1.6; }
  .entry .line i { color: var(--mute); font-style: italic; }
  .der { margin: 10px 0; padding-left: 10px; border-left: 2px solid var(--gold); }
  .der.hit { border-left-color: var(--clove); background: rgba(201,162,39,0.12); }
  .der b { font-size: 15px; }
  .badge {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    padding: 2px 6px; border: 1px solid var(--moss); color: var(--moss);
    border-radius: 2px; margin-left: 8px; vertical-align: middle;
  }
  .libhead { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin: 22px 0 10px; }
  .libfilters { display: flex; gap: 6px; }
  .libfilters .lf {
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    padding: 5px 9px; border: 1px solid var(--mute); background: transparent;
    color: var(--mute); cursor: pointer; border-radius: 2px;
  }
  .libfilters .lf.on { border-color: var(--ink); background: var(--ink); color: var(--paper); }
  .libitem {
    display: flex; justify-content: space-between; align-items: center;
    padding: 9px 2px; border-bottom: 1px solid var(--paper-2); cursor: pointer;
  }
  .libitem b { font-size: 15px; }
  .libitem span { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--mute); }
```

- [ ] **Step 3: 写渲染逻辑**

替换掉 Task 8 放的空 `renderDict()`：

```js
let libBucket = "all";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => (
  { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]
));

function dictMsg(text){
  const el = $("dictMsg");
  if(!text){ el.hidden = true; el.textContent = ""; return; }
  el.hidden = false;
  el.textContent = text;
}

function renderEntry(entry, matched, cached){
  const rb = entry.rootBlock || {};
  const pair = o => `<div class="line">${esc(o.t)} <i>${esc(o.zh)}</i></div>`;
  const ders = (entry.ders || []).map(d => {
    const on = normalizeQuery(d.w) === normalizeQuery(matched) ? " hit" : "";
    return `<div class="der${on}">
      <b>${esc(d.w)}</b> <i>${esc(d.ipa)}</i><br>${esc(d.zh)}
      <div class="line">${esc(d.phrase?.t)} <i>${esc(d.phrase?.zh)}</i></div>
      <div class="line">${esc(d.example?.t)} <i>${esc(d.example?.zh)}</i></div>
    </div>`;
  }).join("");

  $("dictResult").innerHTML = `<div class="entry">
    <h2>${esc(entry.root)}${cached ? `<span class="badge">库中 · 第 ${entry.count} 次</span>` : ""}</h2>
    <div class="meta">${esc(entry.ipa)}</div>
    <div class="core">${esc(entry.core)}</div>
    <h3>词根</h3>
    <div class="meta">${esc(rb.ipa)}</div>
    <div class="core">${esc(rb.zh)}</div>
    ${(rb.phrases || []).map(pair).join("")}
    ${(rb.examples || []).map(pair).join("")}
    <h3>衍生词</h3>
    ${ders}
    <div id="toCardBox"></div>
  </div>`;
  renderToCardBox(entry);
}

function renderLibrary(){
  const list = filterByBucket(lexicon, libBucket)
    .slice()
    .sort((a, b) => b.count - a.count || a.root.localeCompare(b.root));
  $("libCount").textContent = lexicon.length;
  $("libList").innerHTML = list.length
    ? list.map(e => `<div class="libitem" data-root="${esc(e.root)}">
        <b>${esc(e.root)}</b><span>${esc(e.core)} · ${e.count} 次</span></div>`).join("")
    : `<div class="dictmsg">这个区间还没有词。</div>`;
  for(const el of $("libList").querySelectorAll(".libitem")){
    el.addEventListener("click", ()=>{
      const entry = lexicon.find(e => e.root === el.dataset.root);
      if(entry){ renderEntry(entry, entry.root, true); window.scrollTo(0, 0); }
    });
  }
}

function renderDict(){
  renderLibrary();
}

async function doLookup(){
  const q = $("dictInput").value;
  dictMsg("查询中…");
  const out = await lookup(q);
  if(out.status === "error" && out.message === "NOKEY"){
    dictMsg("还没填 Gemini API 密钥。去底部的同步设置里填一个，免费密钥在 aistudio.google.com/apikey 建。");
    return;
  }
  if(out.status === "error" || out.status === "notfound"){ dictMsg(out.message); return; }
  dictMsg("");
  renderEntry(out.entry, out.matched, out.status === "cached");
  renderLibrary();
}

$("dictGo").addEventListener("click", doLookup);
$("dictInput").addEventListener("keydown", e => { if(e.key === "Enter") doLookup(); });
for(const el of document.querySelectorAll(".libfilters .lf")){
  el.addEventListener("click", ()=>{
    libBucket = el.dataset.b;
    for(const b of document.querySelectorAll(".libfilters .lf")) b.classList.toggle("on", b === el);
    renderLibrary();
  });
}
```

`renderToCardBox` 在下一个任务实现，这里先放一个空函数占位：

```js
function renderToCardBox(entry){}
```

- [ ] **Step 4: 手动验证**

Run: 起服务器，控制台先 `setApiKey("你的key")`，切到词典页查 `mengajar`
Expected: 出完整报告，`mengajar` 那个衍生词块高亮；再查一次，标题旁出现「库中 · 第 2 次」；词库列表出现该词；点四个频次按钮筛选正常。

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "Render dictionary lookups and the saved word library"
```

---

### Task 10: 一键转成学习卡

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 4 的 `entryToCard`，Task 6 的 `syncRef`，Task 9 的 `renderToCardBox` 占位
- Produces: `userCards: Card[]`、`rebuildDeck(): void`、`saveCard(entry, cats): Promise<void>`

- [ ] **Step 1: 加用户卡的存储与牌组重建**

在 Task 6 的存储层里追加：

```js
const CARDS_KEY = "kosakata-cards-v1";
let userCards = (()=>{
  try { return JSON.parse(localStorage.getItem(CARDS_KEY) || "[]"); } catch(e){ return []; }
})();

function rebuildDeck(){
  deck = DATA.concat(userCards).map(d => ({...d, id: cardId(d)}));
  filter();
}

async function saveCard(entry, cats){
  const card = entryToCard(entry, cats);
  const i = userCards.findIndex(c => c.w === card.w);
  if(i >= 0) userCards[i] = card; else userCards.push(card);
  localStorage.setItem(CARDS_KEY, JSON.stringify(userCards));
  rebuildDeck();
  if(syncRef) await setDoc(doc(syncRef, "cards", slugify(card.w)), card).catch(()=>{});
}
```

把 `attachLexiconSync()` 里拉词库那段之后，再拉一次卡片：

```js
    const cardSnap = await getDocs(collection(syncRef, "cards"));
    const remoteCards = cardSnap.docs.map(d => d.data());
    for(const c of remoteCards){
      if(!userCards.some(u => u.w === c.w)) userCards.push(c);
    }
    localStorage.setItem(CARDS_KEY, JSON.stringify(userCards));
    rebuildDeck();
```

注意 `deck` 现在是 `let`，原来的 `let deck = DATA.map(...)` 那一行保留不动，`rebuildDeck()` 只是在有用户卡时重算一次。

- [ ] **Step 2: 加样式**

```css
  .tocard { margin-top: 18px; border-top: 1px solid var(--ink); padding-top: 12px; }
  .tocard .cats { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 12px; }
  .tocard .cats button {
    font-size: 12px; padding: 5px 10px; border: 1px solid var(--mute);
    background: transparent; color: var(--mute); cursor: pointer; border-radius: 2px;
  }
  .tocard .cats button.on { border-color: var(--moss); background: var(--moss); color: var(--paper); }
  .tocard .go {
    padding: 9px 16px; border: 1.5px solid var(--moss); background: var(--moss);
    color: var(--paper); font-family: 'JetBrains Mono', monospace; cursor: pointer; border-radius: 2px;
  }
  .tocard .done { font-size: 13px; color: var(--moss); }
```

- [ ] **Step 3: 实现 renderToCardBox**

替换 Task 9 放的空函数：

```js
function renderToCardBox(entry){
  const box = $("toCardBox");
  if(userCards.some(c => c.w === entry.root)){
    box.innerHTML = `<div class="tocard"><span class="done">已在牌组里</span></div>`;
    return;
  }
  box.innerHTML = `<div class="tocard">
    <div>选分类，然后转成一张学习卡：</div>
    <div class="cats">${CATS.map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    <button class="go">转成学习卡</button>
  </div>`;
  const picked = new Set();
  for(const b of box.querySelectorAll(".cats button")){
    b.addEventListener("click", ()=>{
      const c = b.dataset.c;
      if(picked.has(c)) picked.delete(c); else picked.add(c);
      b.classList.toggle("on", picked.has(c));
    });
  }
  box.querySelector(".go").addEventListener("click", async ()=>{
    await saveCard(entry, [...picked]);
    renderToCardBox(entry);
  });
}
```

- [ ] **Step 4: 手动验证**

Run: 查一个词，选两个分类，点「转成学习卡」
Expected: 按钮区变成「已在牌组里」；切到卡片页，该词出现在牌组里、背面有衍生词；刷新页面后卡片仍在；顶部分类筛选按选的标签能筛到它。

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "Turn a looked-up word into a study card with one tap"
```

---

### Task 11: 日历页——查询时间线

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 2 的 `groupHitsByDate`，Task 8 的 `#viewTimeline`
- Produces: `renderTimeline(): void`

- [ ] **Step 1: 加样式**

```css
  .tlday { margin-bottom: 20px; }
  .tlday h4 {
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    letter-spacing: 0.08em; color: var(--mute);
    border-bottom: 1px solid var(--ink); padding-bottom: 5px; margin-bottom: 9px;
  }
  .tlitem {
    display: inline-block; margin: 0 7px 7px 0; padding: 5px 10px;
    border: 1.5px solid var(--moss); border-radius: 2px;
    font-size: 14px; cursor: pointer;
  }
  .tlitem.ai { background: var(--moss); color: var(--paper); }
  .tlitem em { font-style: normal; opacity: 0.7; font-size: 12px; }
```

- [ ] **Step 2: 实现 renderTimeline**

替换 Task 8 放的空函数：

```js
function renderTimeline(){
  const groups = groupHitsByDate(lexicon);
  if(!groups.length){
    $("viewTimeline").innerHTML = `<div class="dictmsg">还没查过词。去词典页查第一个。</div>`;
    return;
  }
  $("viewTimeline").innerHTML = groups.map(g => `<div class="tlday">
    <h4>${g.date} · ${g.items.length} 词</h4>
    ${g.items.map(i => `<span class="tlitem${i.ai ? " ai" : ""}" data-root="${esc(i.root)}">
      ${i.via ? `${esc(i.via)} <em>→ ${esc(i.root)}</em>` : esc(i.root)}
    </span>`).join("")}
  </div>`).join("");
  for(const el of $("viewTimeline").querySelectorAll(".tlitem")){
    el.addEventListener("click", ()=>{
      const entry = lexicon.find(e => e.root === el.dataset.root);
      if(!entry) return;
      showView("dict");
      renderEntry(entry, entry.root, true);
      window.scrollTo(0, 0);
    });
  }
}
```

- [ ] **Step 3: 手动验证**

Run: 查两三个词（含一个衍生词），切到日历页
Expected: 按日期分组，首次查询的词是实心底色，命中缓存的是描边；查衍生词的那条显示成 `mengajar → ajar`；点任一条跳回词典页展开该条目。

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "Show every past lookup on a reverse-chronological timeline"
```

---

### Task 12: API 密钥的设置界面

**Files:**
- Modify: `index.html`（现有同步弹窗内）

**Interfaces:**
- Consumes: Task 6 的 `setApiKey`/`apiKey`
- Produces: 无新接口

- [ ] **Step 1: 在同步弹窗里加一栏**

找到弹窗里 `syncCodeInput` 所在的那一块，在它下面插入：

```html
<div class="keyrow">
  <label for="apiKeyInput">Gemini API 密钥</label>
  <input id="apiKeyInput" type="password" placeholder="AIza…" autocomplete="off">
  <button id="apiKeySave">保存</button>
  <div class="keyhint">
    词典功能要用。免费密钥在
    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>
    建，不用绑卡。填了之后会跟同步码一起存，换设备不用再填。
  </div>
  <div id="apiKeyState" class="keyhint"></div>
</div>
```

- [ ] **Step 2: 加样式**

```css
  .keyrow { margin-top: 16px; border-top: 1px solid var(--paper-2); padding-top: 14px; }
  .keyrow label { display: block; font-size: 13px; margin-bottom: 6px; }
  .keyrow input {
    width: 100%; padding: 9px 10px; border: 1.5px solid var(--ink);
    background: var(--paper-2); color: var(--ink); border-radius: 2px; margin-bottom: 8px;
  }
  .keyrow button {
    padding: 7px 14px; border: 1.5px solid var(--ink); background: var(--ink);
    color: var(--paper); font-family: 'JetBrains Mono', monospace; cursor: pointer; border-radius: 2px;
  }
  .keyhint { font-size: 12px; color: var(--mute); line-height: 1.6; margin-top: 8px; }
  .keyhint a { color: var(--moss); }
```

- [ ] **Step 3: 接上逻辑**

在打开弹窗的那个函数里（现有代码会填 `syncCodeInput` 的值，约 2009 行），追加：

```js
  $("apiKeyInput").value = "";
  $("apiKeyState").textContent = apiKey
    ? `已保存，尾号 ${apiKey.slice(-4)}`
    : "未设置";
```

并在事件绑定处加：

```js
$("apiKeySave").addEventListener("click", ()=>{
  const v = $("apiKeyInput").value.trim();
  if(!v){ $("apiKeyState").textContent = "没填内容。"; return; }
  setApiKey(v);
  $("apiKeyInput").value = "";
  $("apiKeyState").textContent = `已保存，尾号 ${apiKey.slice(-4)}`;
});
```

- [ ] **Step 4: 手动验证**

Run: 打开同步弹窗，填 key，保存，关掉再打开
Expected: 显示「已保存，尾号 xxxx」，输入框是空的；词典页能查词了；连上同步码后在另一台设备（或另一个浏览器 profile）填同一个同步码，key 自动带过去。

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "Add a Gemini API key field to the sync dialog"
```

---

### Task 13: Firestore 规则、README、全量回归

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 前面全部
- Produces: 无

- [ ] **Step 1: 放开 Firestore 规则**

这一步在 Firebase 控制台手动做，不在仓库里。打开 console.firebase.google.com → 项目 `kartu-kosakata` → Firestore Database → 规则，改成：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /progress/{code} {
      allow read, write: if true;
      match /{sub=**} {
        allow read, write: if true;
      }
    }
  }
}
```

**注意：** 这条规则允许任何知道同步码的人读写该同步码下的全部数据，包括存在那里的 API 密钥。这跟现有进度同步的开放程度一致，是 spec 里认可的取舍。同步码要挑一个别人猜不到的字符串。

- [ ] **Step 2: 更新 README**

在「怎么用」一节末尾加：

```markdown
## 词典

顶部切到「词典」页，输入一个印尼语词就能查。查询结果包含词根、IPA 发音、核心释义、
三个常见短语、两个例句，以及完整的衍生词列表（每个带发音、释义、短语、例句）。

- 查过的词会存进词库。再查同一个词，或者查它的任何一个衍生词，直接读库，不再调 AI
- 报告底部可以选分类，一键把这个词转成学习卡，进入卡片页的牌组
- 词库列表可以按查询次数筛：1 次 / 2-5 次 / 5 次以上，反复查的词一眼看得到
- 「日历」页按日期倒序列出查过的所有词。实心的是当时真调了 AI，描边的是命中了词库

查词要一个 Gemini API 密钥。在 [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
用 Google 账号免费建一个，不用绑卡，然后填进底部同步设置里的「Gemini API 密钥」。
填过一次之后会跟同步码一起存，换设备自动带过去。
```

在「文件说明」一节加一行：

```markdown
- `dict-core.mjs` — 词典的纯函数（归一化、索引、分桶、转卡片、提示词与 schema），浏览器和测试共用
```

把「本地开发」里那句直接打开 `index.html` 的话改掉——现在有相对路径的 module import，必须起服务器：

```markdown
这是纯静态页面，没有构建步骤。因为用了 ES module 的相对导入，需要起一个本地静态服务器
才能预览（直接双击打开 `index.html` 会加载不了模块）：
```

- [ ] **Step 3: 跑全量回归**

Run:

```bash
node --test tools/*.test.mjs && node tools/check-data.mjs
```

Expected: 全部通过

- [ ] **Step 4: 手动走一遍完整流程**

Run: 起服务器，从零开始（先在控制台执行 `localStorage.clear()` 再刷新）
Expected:
1. 卡片页行为跟改动前完全一样
2. 词典页查词提示要填密钥，填完能查
3. 同一个词查第二次显示「库中 · 第 2 次」，且断网也能查出来
4. 查一个已知词的衍生词，命中词库、高亮对应衍生词块、次数记在词根上
5. 转成学习卡后卡片页能翻到它
6. 日历页按日期倒序列出以上所有查询
7. 填同步码后，换一个浏览器 profile 填同一个同步码，词库、卡片、密钥都带过去

- [ ] **Step 5: 提交**

```bash
git add README.md
git commit -m "Document the dictionary, the API key, and the server-only preview"
```

---

## 自查

**Spec 覆盖：**

| Spec 要求 | 对应任务 |
|---|---|
| 只做印尼语、无歧义分支 | Task 5（提示词与 schema）、Task 7（查词流程） |
| 浏览器直连 Gemini、免费 key | Task 7、Task 12 |
| key 跟进度存 `progress/{code}` | Task 6、Task 12 |
| 词典条目数据模型、`derSlugs` 索引 | Task 3、Task 5、Task 6 |
| `hits` 里的 `via` / `ai` 字段 | Task 3、Task 7 |
| 命中缓存不调 AI、次数全算词根头上 | Task 7 |
| 一次请求一个结果、`notFound` 分支 | Task 5、Task 7 |
| 提示词保留 gem 的六条硬规则 | Task 5 |
| 发音一律 IPA | Task 5（提示词）、Task 3（校验） |
| 三个页签 | Task 8 |
| 报告渲染、「库中」标记 | Task 9 |
| 频次四档筛选 | Task 2、Task 9 |
| 一键转卡片、分类选择 | Task 4、Task 10 |
| 倒序时间线、实心/描边、`via → root` | Task 2、Task 11 |
| 六种错误情况 | Task 7（网络/401/429/schema/notFound）、Task 9（NOKEY 引导） |
| AI 失败不写库不记次数 | Task 7 |
| 五个纯函数的单元测试 | Task 1-5 |
| Firestore 规则 | Task 13 |

**与 spec 的一处偏离：** spec 写「`tools/check-data.mjs` 扩一条：校验词典条目 JSON」。词典条目存在 Firestore 里，不在仓库里，`check-data.mjs` 这个静态校验脚本读不到它们。校验改成运行时做——`validateEntry` 放在 `dict-core.mjs`，Task 3 有单元测试，Task 7 在写库前调用它。`check-data.mjs` 不动。

**类型一致性：** `Entry` 的字段（`root`/`query`/`ipa`/`core`/`rootBlock`/`ders`/`derSlugs`/`count`/`hits`/`model`/`createdAt`）在 Task 3、5、6、7 里用法一致；`hits` 项的 `{at, via, ai}` 在 Task 2、3、7、11 里一致；`Card` 的字段与现有 `DATA` 及 `tools/check-data.mjs` 的 `validateCard` 一致。转出来的卡存在 Firestore 和 localStorage 里，不进 `index.html` 的 `DATA` 数组，所以 `check-data.mjs` 扫不到它们；`src` 这个多出来的字段只在运行时用于标记来源。
