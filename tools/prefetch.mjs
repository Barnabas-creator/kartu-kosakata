// 批量预查词：按词频从高到低，把词根逐个送进和 App 查词同一套提示词，结果存成本地 JSON。
// 只落盘，不写 Firestore 词库；以后要导入再单独做。
//
// 用法：GEMINI_API_KEY=AQ.xxx node tools/prefetch.mjs [--limit=N] [--rpm=N]
//
// 断点续跑：已查过的词记在 prefetch-out/_state.json，重跑自动跳过。
// 词根表：tools/prefetch-src/roots-ranked.tsv（rank_roots.py）+ bible-roots-ranked.tsv（rank_bible.py，AYT 译本）。
// 查询词若已落在某条已存条目的 derSlugs 里（例如先查了 ajar，后面轮到 belajar 还原出的词根），
// 直接跳过，不重复花额度——跟 App 里「先查词库再调 AI」是同一个原则。
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRequestBody, parseGeminiResponse, entryFromResponse, validateEntry,
  findInLexicon, slugify, normalizeQuery
} from "../dict-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// 查询队列：圣经词根（前 4000 之外、圣经出现 ≥3 次）在前，词频前 4000 在后。
// 由 roots-ranked.tsv 与 bible-roots-ranked.tsv 合成，见 prefetch-src/。
const SRC = join(here, "prefetch-src", "queue.txt");
const OUT = join(here, "prefetch-out");
const STATE = join(OUT, "_state.json");

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, "").split("=")));
const LIMIT = Number(args.limit ?? Infinity);
const RPM = Number(args.rpm ?? 12);
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("缺 GEMINI_API_KEY"); process.exit(1); }

// 与 index.html 的 MODEL_FALLBACKS 同一批，但 lite 优先：批量跑看的是额度，不是单次质量上限。
// 免费档额度按模型分开算，一个用完换下一个。
const MODELS = (process.env.GEMINI_MODELS ?? [
  "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest",
  "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash"
].join(",")).split(",");
const exhausted = new Set();

mkdirSync(OUT, { recursive: true });
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
// 上一轮出错或格式不合格的词（模型偶发的坏 JSON、缺字段）每次重跑都再给一次机会。
for (const [w, v] of Object.entries(state)) if (/^(error|invalid):/.test(v)) delete state[w];
const saveState = () => writeFileSync(STATE, JSON.stringify(state, null, 1));

const entries = readdirSync(OUT).filter(f => f.endsWith(".json") && !f.startsWith("_"))
  .map(f => JSON.parse(readFileSync(join(OUT, f), "utf8")));

const queue = readFileSync(SRC, "utf8").trim().split("\n").map(l => l.split("\t")[0])
  .filter(w => !(w in state));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const API = "https://generativelanguage.googleapis.com/v1beta/models";

async function ask(word) {
  for (const model of MODELS) {
    if (exhausted.has(model)) continue;
    for (let attempt = 0; attempt < 3; attempt++) {
      let res;
      try {
        res = await fetch(`${API}/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
          body: JSON.stringify(buildRequestBody(word))
        });
      } catch { await sleep(5000); continue; }
      if (res.status === 401 || res.status === 403) throw new Error("密钥无效");
      if (res.status === 404) { exhausted.add(model); break; }
      if (res.status === 429) {
        // 分钟级限流等一下再试；日额度用完（RESOURCE_EXHAUSTED 且带 PerDay）就换模型。
        const body = await res.text();
        if (/PerDay|per day/i.test(body) || attempt === 2) { exhausted.add(model); console.log(`  ${model} 额度用完`); break; }
        await sleep(30000); continue;
      }
      if (res.status >= 500) { await sleep(5000); continue; }
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const parsed = parseGeminiResponse(await res.json());
      if (!parsed.ok) return { error: parsed.error };
      return { data: parsed.data, model };
    }
  }
  return { allExhausted: true };
}

let done = 0, made = 0;
for (const word of queue) {
  if (done >= LIMIT) break;
  const q = normalizeQuery(word);
  const hit = findInLexicon(entries, q);
  if (hit) { state[word] = `covered:${slugify(hit.entry.root)}`; saveState(); continue; }

  const t0 = Date.now();
  const out = await ask(q);
  if (out.allExhausted) { console.log("所有模型额度都用完了，明天接着跑。"); break; }
  done++;
  if (out.error) { state[word] = `error:${out.error}`; }
  else if (out.data.notFound === true) { state[word] = "notfound"; }
  else {
    const entry = entryFromResponse(out.data, q, out.model);
    const errs = validateEntry(entry);
    if (errs.length) { state[word] = `invalid:${errs[0]}`; }
    else {
      const slug = slugify(entry.root);
      const prev = entries.find(e => slugify(e.root) === slug);
      if (prev) { state[word] = `covered:${slug}`; }
      else {
        writeFileSync(join(OUT, `${slug}.json`), JSON.stringify(entry, null, 1));
        entries.push(entry); made++;
        state[word] = `ok:${slug}`;
      }
    }
  }
  saveState();
  console.log(`${done}\t${word}\t${state[word]}`);
  const wait = 60000 / RPM - (Date.now() - t0);
  if (wait > 0) await sleep(wait);
}
const total = readFileSync(SRC, "utf8").trim().split("\n").length;
console.log(`本轮调用 ${done} 次，新增条目 ${made}，累计条目 ${entries.length}，剩 ${total - Object.keys(state).length} 个词根没处理`);
