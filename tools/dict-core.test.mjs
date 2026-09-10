import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuery, slugify, findInLexicon,
  bucketOf, filterByBucket, groupHitsByDate,
  validateEntry, recordHit, mergeLexicons
} from "../dict-core.mjs";

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
