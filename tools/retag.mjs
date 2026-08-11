import { readFileSync, writeFileSync } from "node:fs";
import { extractData } from "./check-data.mjs";

const POS2CAT = {
  "动词根": "动词", "名词": "名词", "形容词": "形容词",
  "副词": "虚词", "连词": "虚词", "介词": "虚词",
  "数词": "虚词", "代词": "虚词", "量词": "虚词", "词缀": "虚词",
};
const KEEP = new Set(["高频", "工作", "教会", "生活", "辨音"]);

// pos 可能是「动词根（不单用）」或「副词·连词」
function posCats(pos) {
  const bare = String(pos).replace(/（[^）]*）/g, "").trim();
  const parts = bare.split("·").map(s => s.trim());
  const out = [];
  for (const p of parts) {
    const c = POS2CAT[p];
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cards = extractData(html);

const decided = new Map();   // w -> 新标签数组
const pending = [];          // 需要人判的

for (const card of cards) {
  const oldC = typeof card.c === "string" ? card.c : null;
  if (!oldC) continue;                       // 已经是数组，跳过
  const tags = [];
  if (card.t === "root") tags.push(...posCats(card.pos));
  if (KEEP.has(oldC)) tags.push(oldC);

  const needsPos = tags.every(t => !["名词","动词","形容词","虚词"].includes(t));
  if (needsPos || tags.length === 0) {
    pending.push({ w: card.w, t: card.t, pos: card.pos || "", oldC, zh: card.zh, tags });
  } else {
    decided.set(card.w, tags);
  }
}

console.log(`可机械判定 ${decided.size} 张，需人工 ${pending.length} 张`);
writeFileSync(
  new URL("../.superpowers/sdd/2026-08-11-multi-label-categories/needs-judgment.md", import.meta.url),
  `# 需人工判定分类的卡片（${pending.length} 张）\n\n` +
  `| 词形 | 类型 | pos | 旧分类 | 释义 | 已推出的标签 |\n|---|---|---|---|---|---|\n` +
  pending.map(p => `| ${p.w} | ${p.t} | ${p.pos} | ${p.oldC} | ${p.zh} | ${p.tags.join(" ") || "—"} |`).join("\n") + "\n"
);

// 就地改写 index.html：只替换 decided 里那些卡的 c
let out = html;
let n = 0;
for (const [w, tags] of decided) {
  const arr = JSON.stringify(tags).replace(/","/g, '","');
  const re = new RegExp(`(w:"${w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"[^\\n]*?,c:)"[^"]*"`);
  const before = out;
  out = out.replace(re, `$1${arr}`);
  if (out !== before) n++;
}
writeFileSync(new URL("../index.html", import.meta.url), out);
console.log(`已改写 ${n} 张`);
