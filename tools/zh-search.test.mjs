import test from "node:test";
import assert from "node:assert/strict";
import { hasHan, splitGlosses, zhRowsFromEntry, searchZh, buildZhRequestBody, ZH_ROOT, ZH_DER } from "../dict-core.mjs";

test("hasHan 认汉字", () => {
  assert.equal(hasHan("永恒"), true);
  assert.equal(hasHan("abadi"), false);
  assert.equal(hasHan("abadi 永恒"), true);
});

test("splitGlosses 按标点拆、去括号注释", () => {
  assert.deepEqual(splitGlosses("永恒的，永久的；不朽的"), ["永恒的", "永久的", "不朽的"]);
  assert.deepEqual(splitGlosses("记录（照片、影像）、纪念"), ["记录", "纪念"]);
  assert.deepEqual(splitGlosses("aku / 我"), ["我"]);
});

const abadi = {
  root: "abadi", core: "永恒的，永久的", rootBlock: { zh: "永恒的", phrases: [{ t: "hidup abadi", zh: "永生" }] },
  ders: [
    { w: "abadi", zh: "永恒的", phrase: { t: "cinta abadi", zh: "永恒的爱" } },
    { w: "mengabadikan", zh: "使永恒，记录", phrase: { t: "mengabadikan momen", zh: "记录瞬间" } },
    { w: "keabadian", zh: "永恒", phrase: { t: "mencari keabadian", zh: "寻求永恒" } }
  ]
};

test("zhRowsFromEntry 词根/衍生入行、短语不入、去重", () => {
  const rows = zhRowsFromEntry(abadi, 7);
  assert.deepEqual(rows.filter(r => r[1] === "abadi").map(r => r[0]), ["永恒的", "永久的"]);
  assert.ok(rows.some(r => r[0] === "记录" && r[1] === "mengabadikan" && r[3] === ZH_DER));
  assert.ok(!rows.some(r => r[0] === "永生"));
  assert.ok(rows.every(r => r[2] === "abadi" && r[4] === 7));
});

test("searchZh 排序：完全相同 > 开头 > 包含；同档词根优先", () => {
  const rows = zhRowsFromEntry(abadi, 0);
  const hits = searchZh(rows, "永恒");
  assert.equal(hits[0].word, "abadi");        // 「永恒的」去的算完全相同，且是词根
  assert.equal(hits[0].kind, ZH_ROOT);
  assert.equal(hits[1].word, "keabadian");    // 完全相同，衍生词
  assert.equal(hits[2].word, "mengabadikan");  // 「使永恒」只是包含
});

test("searchZh 每个印尼词只出现一次，取最好的义项", () => {
  const hits = searchZh(zhRowsFromEntry(abadi), "永");
  assert.ok(hits.length >= 3);
  const words = hits.map(h => h.word);
  assert.equal(new Set(words).size, words.length);
});

test("searchZh 词频序决定平手", () => {
  const rows = [["爱", "cinta", "cinta", ZH_ROOT, 5], ["爱", "kasih", "kasih", ZH_ROOT, 2]];
  assert.deepEqual(searchZh(rows, "爱").map(h => h.word), ["kasih", "cinta"]);
});

test("searchZh 空查询、查不到", () => {
  assert.deepEqual(searchZh(zhRowsFromEntry(abadi), "  "), []);
  assert.deepEqual(searchZh(zhRowsFromEntry(abadi), "电脑"), []);
});

test("buildZhRequestBody 带中文原文", () => {
  const b = buildZhRequestBody(" 电脑 ");
  assert.equal(b.contents[0].parts[0].text, "电脑");
  assert.equal(b.generationConfig.responseMimeType, "application/json");
});
