// 把预查结果（tools/prefetch-out）打成网站能直接读的离线词典 dict/：
//   dict/index.json      { 词形: 词根 slug }，词根本身和全部衍生词都在里面
//   dict/<slug>.json     一个词根一个文件，查到才下载
// 查词时先查个人词库，再查这里，都没有才调 Gemini。底库条目不会自己进个人词库，
// 只有真被查到的那一条才写进去（记一次 ai:false 的查询）。
//
// 用法：node tools/build-dict.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeQuery, slugify, validateEntry } from "../dict-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "tools", "prefetch-out");
const OUT = join(root, "dict");

// 按预查的处理顺序（≈词频从高到低）入索引：同一个词形挂在两个词根下时，归高频的那个。
const state = JSON.parse(readFileSync(join(SRC, "_state.json"), "utf8"));
const slugs = [...new Set(Object.values(state).filter(v => v.startsWith("ok:")).map(v => v.slice(3)))];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const index = {};
let bad = 0;
for (const slug of slugs) {
  const file = join(SRC, `${slug}.json`);
  if (!existsSync(file)) { bad++; continue; }
  const e = JSON.parse(readFileSync(file, "utf8"));
  if (validateEntry(e).length) { bad++; continue; }
  const { count, hits, query, ...rest } = e;
  writeFileSync(join(OUT, `${slug}.json`), JSON.stringify({ ...rest, src: "base" }));
  for (const form of [e.root, ...(e.derSlugs ?? [])]) {
    const k = normalizeQuery(form);
    if (k && !(k in index)) index[k] = slug;
  }
}
writeFileSync(join(OUT, "index.json"), JSON.stringify(index));
console.log(`词根 ${slugs.length - bad} 个，词形 ${Object.keys(index).length} 个，跳过 ${bad} 个`);
