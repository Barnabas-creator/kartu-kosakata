import { readFileSync } from "node:fs";

const TYPES = new Set(["root", "phrase"]);
const LEGACY_FIELDS = ["root", "coll"];

export function extractData(html) {
  const marker = html.indexOf("const DATA = [");
  if (marker === -1) throw new Error("找不到 DATA 数组");
  const open = html.indexOf("[", marker);
  const close = html.indexOf("\n];", open);
  if (close === -1) throw new Error("找不到 DATA 数组结尾（期望行首的 `];`）");
  const literal = html.slice(open, close + 2);
  return Function(`"use strict"; return (${literal});`)();
}

export function cardId(card) {
  const slug = String(card.w).trim().toLowerCase().replace(/\s+/g, "-");
  return card.n ? `${card.t}:${slug}-${card.n}` : `${card.t}:${slug}`;
}

function needText(obj, field, errs, where) {
  const v = obj?.[field];
  if (typeof v !== "string" || v.trim() === "") {
    errs.push(`${where}：字段 ${field} 缺失或为空`);
  }
}

export function validateCard(card, where) {
  const errs = [];
  if (!card || !TYPES.has(card.t)) {
    errs.push(`${where}：t 必须是 "root" 或 "phrase"，实际是 ${JSON.stringify(card?.t)}`);
    return errs;
  }
  for (const f of ["w", "p", "zh", "c", "ex"]) needText(card, f, errs, where);
  for (const f of LEGACY_FIELDS) {
    if (f in card) errs.push(`${where}：残留旧字段 ${f}，迁移后必须删除`);
  }
  if (typeof card.ex === "string") {
    const parts = card.ex.split("|");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      errs.push(`${where}：ex 必须是「印尼语|中文」，恰好一个竖线且两侧非空`);
    }
  }
  if (card.t === "root") {
    needText(card, "pos", errs, where);
    const der = card.der ?? [];
    if (!Array.isArray(der)) {
      errs.push(`${where}：der 必须是数组`);
    } else {
      if (der.length > 2) errs.push(`${where}：der 最多 2 条，实际 ${der.length} 条`);
      der.forEach((d, i) => {
        const dw = `${where} der[${i}]`;
        for (const f of ["w", "zh", "ex"]) needText(d, f, errs, dw);
        if (typeof d?.ex === "string" && d.ex.includes("|")) {
          errs.push(`${dw}：der 的 ex 是词组或短例句，不带竖线`);
        }
      });
    }
  }
  if (card.t === "phrase") {
    needText(card, "lit", errs, where);
    if ("der" in card) errs.push(`${where}：词组卡不该有 der`);
  }
  return errs;
}

export function validateDeck(cards) {
  const errs = [];
  const seen = new Map();
  cards.forEach((card, i) => {
    const where = `#${i + 1} ${card?.w ?? "(无 w)"}`;
    errs.push(...validateCard(card, where));
    if (card && TYPES.has(card.t) && typeof card.w === "string") {
      const id = cardId(card);
      if (seen.has(id)) errs.push(`${where}：id 重复 ${id}（与 ${seen.get(id)} 相撞）`);
      else seen.set(id, where);
    }
  });
  return errs;
}

if (import.meta.filename === process.argv[1]) {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const cards = extractData(html);
  const errs = validateDeck(cards);
  if (errs.length) {
    console.error(errs.join("\n"));
    console.error(`\n共 ${errs.length} 个问题，${cards.length} 张卡片`);
    process.exit(1);
  }
  console.log(`OK：${cards.length} 张卡片全部通过校验`);
}
