import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuery, slugify, findInLexicon,
  bucketOf, filterByBucket, groupHitsByDate
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
