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
