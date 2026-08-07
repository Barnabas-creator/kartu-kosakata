# 词根卡 + 固定词组卡 重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 kartu-kosakata 的 271 张词形卡重构成「词根卡（带词性 + 1~2 个精选衍生词）」和「固定搭配词组卡」两种类型，并输出一份新的取词规范文档。

**Architecture:** 应用是单个 `index.html`，词库 `DATA` 内联在文件底部的 `<script type="module">` 里。改动分三层：(1) 新增 `tools/check-data.mjs` 校验脚本 + `node:test` 单测，充当这个无测试框架项目的测试闭环；(2) `index.html` 内的模型层（卡片 id 从数组下标改成稳定字符串）、筛选层（类型 × 分类两维叠加）、渲染层（按 `t` 分两套背面模板）；(3) 词库内容分五批迁移，迁移期间旧词库以 `OLD` 常量并存，最后一并删除。

**Tech Stack:** 原生 HTML/CSS/ES module，Firebase Firestore v10.14.1（CDN，仅用于进度同步），Node 22 内置 `node:test`（仅校验脚本用，不引入任何 npm 依赖）。

设计文档：`docs/superpowers/specs/2026-08-07-root-card-redesign-design.md`

## Global Constraints

- 纯前端单文件项目，**不引入构建步骤，不引入任何 npm 依赖，不创建 `package.json`**。校验脚本只用 Node 22 内置模块（`node:test`、`node:assert/strict`、`node:fs`）。
- 词库始终内联在 `index.html` 的 `const DATA = [...]` 里，不外置成 JSON。
- 卡片类型字段 `t` 只有两个合法值：`"root"`、`"phrase"`。
- 词根卡的 `der` 数组**最多 2 条**。
- 所有 `ex` 字段格式固定为 `印尼语|中文`，恰好一个竖线，两侧非空。
- `der[].ex` 是词组或短例句，**不带竖线**，格式为「印尼语 中文」。
- 卡片 id 格式：`${t}:${w 小写、空格转连字符}`，同形异义追加 `-${n}`，如 `root:bisa-1`。
- 衍生词的**构成式（`ber- + ajar`、`meN- + ajar + -kan`）不出现在卡片上**。
- localStorage key 改为 `kosakata-known-v2`；旧 key `kosakata-known` 不读取、不删除。旧进度全部作废。
- 界面文案全部中文，沿用现有语气。
- git commit message 用正常英文，不用缩略语气。

---

### Task 1: 词库校验脚本

这个项目没有测试框架，`tools/check-data.mjs` 就是后续每一步的验证闸门。它从 `index.html` 里抠出 `DATA` 数组，逐卡校验字段，并检查 id 冲突。

**Files:**
- Create: `tools/check-data.mjs`
- Create: `tools/check-data.test.mjs`

**Interfaces:**
- Consumes: 无（本计划第一个任务）
- Produces:
  - `extractData(html: string): object[]` — 从 index.html 文本里解析出 DATA 数组
  - `cardId(card: object): string` — 生成稳定 id
  - `validateCard(card: object, where: string): string[]` — 单卡错误列表，无错返回 `[]`
  - `validateDeck(cards: object[]): string[]` — 全库错误列表（含 id 重复检查）
  - CLI：`node tools/check-data.mjs` 校验 `index.html`，有错打印并 `exit 1`

- [ ] **Step 1: 写失败的测试**

创建 `tools/check-data.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { extractData, cardId, validateCard, validateDeck } from "./check-data.mjs";

const goodRoot = {
  t: "root", w: "ajar", pos: "动词根（不单用）", p: "a-jar 阿-乍",
  zh: "教导", c: "学习",
  der: [
    { w: "mengajar", zh: "教、授课", ex: "mengajar di sekolah 在学校教书" },
    { w: "ajaran", zh: "教义、道理", ex: "ajaran sesat 异端" }
  ],
  syn: "belajar 学 / mengajar 教，一根两向",
  ex: "Yesus mengajar orang banyak.|耶稣教导众人。"
};

const goodPhrase = {
  t: "phrase", w: "air terjun", p: "a-ir ter-jun", zh: "瀑布", c: "地形",
  lit: "air 水 + terjun 跳下",
  note: "固定组合，不说 air jatuh",
  ex: "Kami pergi melihat air terjun.|我们去看瀑布。"
};

test("extractData 从 index.html 文本里抠出 DATA 数组", () => {
  const html = `<script type="module">\nconst x = 1;\nconst DATA = [\n {t:"root",w:"ajar"},\n {t:"phrase",w:"air terjun"}\n];\nlet deck = [];\n</script>`;
  const data = extractData(html);
  assert.equal(data.length, 2);
  assert.equal(data[0].w, "ajar");
  assert.equal(data[1].t, "phrase");
});

test("extractData 找不到 DATA 时抛错", () => {
  assert.throws(() => extractData("<script>let a = 1;</script>"), /找不到 DATA/);
});

test("cardId 用类型加小写连字符词形", () => {
  assert.equal(cardId(goodRoot), "root:ajar");
  assert.equal(cardId(goodPhrase), "phrase:air-terjun");
});

test("cardId 用 n 区分同形异义词根", () => {
  assert.equal(cardId({ t: "root", w: "bisa", n: 1 }), "root:bisa-1");
  assert.equal(cardId({ t: "root", w: "bisa", n: 2 }), "root:bisa-2");
});

test("合法词根卡和词组卡零错误", () => {
  assert.deepEqual(validateCard(goodRoot, "#1"), []);
  assert.deepEqual(validateCard(goodPhrase, "#2"), []);
});

test("t 值非法直接报错并停止后续检查", () => {
  const errs = validateCard({ t: "word", w: "ajar" }, "#1");
  assert.equal(errs.length, 1);
  assert.match(errs[0], /t 必须是/);
});

test("词根卡缺 pos 报错", () => {
  const errs = validateCard({ ...goodRoot, pos: "" }, "#1");
  assert.equal(errs.filter(e => /pos/.test(e)).length, 1);
});

test("der 超过 2 条报错", () => {
  const der = [...goodRoot.der, { w: "pelajar", zh: "学生", ex: "pelajar SMA 高中生" }];
  const errs = validateCard({ ...goodRoot, der }, "#1");
  assert.equal(errs.filter(e => /der 最多 2 条/.test(e)).length, 1);
});

test("der 缺字段报错", () => {
  const errs = validateCard({ ...goodRoot, der: [{ w: "mengajar", zh: "教" }] }, "#1");
  assert.equal(errs.filter(e => /der\[0\].*ex/.test(e)).length, 1);
});

test("der 的 ex 带竖线报错", () => {
  const der = [{ w: "mengajar", zh: "教", ex: "Dia mengajar.|他教书。" }];
  const errs = validateCard({ ...goodRoot, der }, "#1");
  assert.equal(errs.filter(e => /不带竖线/.test(e)).length, 1);
});

test("词根卡没有 der 也合法", () => {
  const { der, ...noDer } = goodRoot;
  assert.deepEqual(validateCard(noDer, "#1"), []);
});

test("ex 缺竖线报错", () => {
  const errs = validateCard({ ...goodRoot, ex: "Yesus mengajar orang banyak." }, "#1");
  assert.equal(errs.filter(e => /ex 必须是/.test(e)).length, 1);
});

test("ex 有两个竖线报错", () => {
  const errs = validateCard({ ...goodRoot, ex: "a|b|c" }, "#1");
  assert.equal(errs.filter(e => /ex 必须是/.test(e)).length, 1);
});

test("残留旧字段 root 和 coll 各报一次", () => {
  const errs = validateCard({ ...goodRoot, root: "ajar", coll: "belajar 学习" }, "#1");
  assert.equal(errs.filter(e => /残留旧字段/.test(e)).length, 2);
});

test("词组卡缺 lit 报错", () => {
  const { lit, ...noLit } = goodPhrase;
  const errs = validateCard(noLit, "#1");
  assert.equal(errs.filter(e => /lit/.test(e)).length, 1);
});

test("词组卡带 der 报错", () => {
  const errs = validateCard({ ...goodPhrase, der: [] }, "#1");
  assert.equal(errs.filter(e => /词组卡不该有 der/.test(e)).length, 1);
});

test("词组卡的 note 可省", () => {
  const { note, ...noNote } = goodPhrase;
  assert.deepEqual(validateCard(noNote, "#1"), []);
});

test("validateDeck 抓 id 重复", () => {
  const errs = validateDeck([goodRoot, { ...goodRoot }]);
  assert.equal(errs.filter(e => /id 重复/.test(e)).length, 1);
});

test("validateDeck 对干净词库返回空数组", () => {
  assert.deepEqual(validateDeck([goodRoot, goodPhrase]), []);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tools/`
Expected: FAIL，报 `Cannot find module .../tools/check-data.mjs`

- [ ] **Step 3: 写实现**

创建 `tools/check-data.mjs`：

```js
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tools/`
Expected: PASS，19 个 test 全绿

- [ ] **Step 5: 确认 CLI 能跑起来并对当前旧词库报错**

Run: `node tools/check-data.mjs; echo "exit=$?"`
Expected: 打印大量 `t 必须是 "root" 或 "phrase"，实际是 undefined`，最后 `exit=1`。这是正确的——现在的 271 条还是旧格式。

- [ ] **Step 6: 提交**

```bash
git add tools/check-data.mjs tools/check-data.test.mjs
git commit -m "Add deck validator for the root/phrase card schema

The project has no test framework, so this script is the verification
gate for the migration: it extracts DATA out of index.html, checks every
card against the new schema, and reports duplicate ids."
```

---

### Task 2: 迁移清册

271 条卡片的归并关系跨越整个数组（`mengatakan` 在前面，它的词根 `kata` 可能在后面，也可能根本不存在）。分批迁移之前必须先有一张全局清册，否则同一个词根会被建两次。

**Files:**
- Create: `docs/superpowers/migration-inventory.md`

**Interfaces:**
- Consumes: `tools/check-data.mjs` 的 `extractData`（用来把 271 条读出来）
- Produces: `docs/superpowers/migration-inventory.md` — 后续五个迁移批次唯一的事实来源

- [ ] **Step 1: 把 271 条原始卡片导出成可读清单**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const data = m.extractData(readFileSync("index.html", "utf8"));
  data.forEach((d, i) => console.log(`${i+1}\t${d.w}\t${d.c}\t${d.root}\t${d.coll}`));
});'
```

Expected: 271 行，制表符分隔，字段依次是 序号 / 词形 / 分类 / 旧 root 字段 / 旧 coll 字段。

- [ ] **Step 2: 逐条判定处置方式，写成清册**

创建 `docs/superpowers/migration-inventory.md`。开头写一段说明和处置类型定义，正文是一张表，271 行，一行一条原卡：

```markdown
# 词库迁移清册

271 条原卡的逐条处置。五个迁移批次都以这张表为准，不要在批次里临时改判——
要改先改这张表。

## 处置类型

- `新建词根卡` — 原卡本身就是词根，直接转 `t:"root"`
- `并入 <词根>` — 原卡是派生词，降级成目标词根卡的一条 `der`
- `新建词组卡` — 原卡本身就是固定搭配，转 `t:"phrase"`
- `抽出词组卡：<词组>` — 原卡的 coll 里够格的固定搭配，另立词组卡（可多个）
- `丢弃` — 与其他卡完全重叠，无独立价值

## 清册

| # | 原词形 | 分类 | 处置 | 目标词根 | 词性 | 拟选 der | 抽出的词组卡 |
|---|---|---|---|---|---|---|---|
| 1 | musik | 教会 | 新建词根卡 | musik | 名词 | — | alat musik / musik rohani |
| 2 | lalu | 语法 | 新建词根卡 | lalu | 副词·连词 | — | minggu lalu |
...
```

判定规则（来自设计文档「词库迁移」一节）：

1. 词形带 `me-/meN-`、`ber-`、`pe-/peN-`、`-an`、`-kan`、`-i`、`se-`、`ter-`、`-lah` 且去掉词缀后是一个真词根 → `并入 <词根>`。已知的：`mengatakan→kata`、`menceritakan→cerita`、`pemasok→pasok`、`menghitung→hitung`、`mengusir→usir`、`mengabulkan→kabul`、`sejumlah→jumlah`、`mendesak→desak`、`suruhlah→suruh`。**注意假词缀**：`terjun`、`berat`、`bermain` 里只有后者是真 `ber-`，`terjun` 和 `berat` 是词根本身，原卡 `root` 字段已经标了「ter- 非词缀」这类提示，照它判。
2. 词形含空格 → `新建词组卡`。
3. 其余 → `新建词根卡`。
4. 每条的 `coll` **和 `syn`** 字段逐项过一遍收录门槛：**整体意思不能由逐词直译推出，或搭配固定到换词就错** → `抽出词组卡`。`syn` 是辨析文字，固定搭配埋在句子里（`surat jalan` 送货单、`dana cair` 款项到账），要读进去挑，不能只看分隔符。`mendengarkan musik`（听音乐）这种自由组合不抽；`air terjun`、`gempa bumi`、`berat hati`、`satu demi satu`、`jurang pemisah`、`Khotbah di Bukit` 这种抽。
5. 多条派生词卡指向同一词根时，「拟选 der」列在**词根那一行**填最终选中的 1~2 个，落选的在该行备注「落选：xxx（降级到 syn）」。
6. 词组卡的目标词形去重：同一个词组被多张原卡的 coll 提到时，只立一张，后来的那行写 `抽出词组卡：air terjun（已由 #13 立）`。

- [ ] **Step 3: 自检清册**

逐项确认，不通过就改表：

- 表格行数 = 271（`grep -c '^| [0-9]' docs/superpowers/migration-inventory.md`）
- 每个 `并入 X` 的 X 都在表里有一行 `新建词根卡`；没有的话补一行新词根卡（原库里没有这个裸词根的卡，需要新建）
- 所有 `新建词根卡` + `新建词组卡` + `抽出词组卡` 的目标词形两两不重复
- 每个 `新建词根卡` 行的「词性」列已填，取值在设计文档的词性标注表里
- 每个 `新建词根卡` 行的「拟选 der」不超过 2 个

- [ ] **Step 4: 记录规模**

在清册末尾追加一节：

```markdown
## 规模

- 原卡片：271
- 词根卡：<数字>
- 词组卡：<数字>
- 合计：<数字>
```

- [ ] **Step 5: 提交**

```bash
git add docs/superpowers/migration-inventory.md
git commit -m "Add per-entry migration inventory for all 271 cards

Merging derived forms into their roots crosses the whole array, so the
disposition of every entry is decided up front in one table. The five
migration batches read from this file rather than re-deciding."
```

---

### Task 3: 数据模型切换与双模板渲染

把应用从旧格式切到新格式。旧的 271 条整体改名成 `OLD`（暂时保留，供后续批次抄内容），新的 `DATA` 先只放样例卡，把三种卡片形态都覆盖到：两条 der 的词根卡、零条 der 的外来词词根卡、词组卡。

**Files:**
- Modify: `index.html:144-145`（CSS，在 `.ex em` 后追加 `.der` 样式）
- Modify: `index.html:320`（`const DATA = [` → `const OLD = [`）
- Modify: `index.html:592`（`];` 之后插入新的 `const DATA = [...]`）
- Modify: `index.html:594`（`deck` 的 id 生成）
- Modify: `index.html:598`（`STORAGE_KEY`）
- Modify: `index.html:693-723`（`render`）
- Modify: `index.html:747`（`renderKnownList` 里的 `Number()`）

**Interfaces:**
- Consumes: Task 1 的 `node tools/check-data.mjs`；Task 2 清册里样例卡对应的行
- Produces:
  - `index.html` 内的 `cardId(d)`，与 `tools/check-data.mjs` 的 `cardId` 行为一致（两份实现，靠 Task 1 的 `cardId` 单测和本任务 Step 6 的手测共同锁住）
  - 新 `DATA` 数组，`t:"root"` / `t:"phrase"` 两种形态
  - `OLD` 常量，保存全部 271 条原卡，Task 9 删除

- [ ] **Step 1: 加 `.der` 样式**

在 `index.html` 的 `.ex em { ... }` 那一行（第 145 行）后面插入：

```css
  .der { display: flex; gap: 10px; padding: 9px 0; border-top: 1px solid var(--paper-2); font-size: 14px; line-height: 1.55; }
  .der .dw { flex: 0 0 104px; font-weight: 600; color: var(--ink); word-break: break-word; }
  .der .dz { flex: 1; }
  .der .dx { display: block; margin-top: 3px; font-size: 12.5px; color: var(--moss); }
```

- [ ] **Step 2: 旧词库改名，新词库加样例卡**

把第 320 行的 `const DATA = [` 改成：

```js
// 旧格式词库，迁移期间保留供抄写，全部迁完后删除（见计划 Task 9）
const OLD = [
```

在第 592 行的 `];`（`OLD` 的收尾）之后、`let deck = ...` 之前插入新词库：

```js
const DATA = [
 {t:"root",w:"ajar",pos:"动词根（不单用）",p:"a-jar 阿-乍",zh:"教导",c:"学习",
  der:[{w:"mengajar",zh:"教、授课",ex:"mengajar di sekolah 在学校教书"},
       {w:"ajaran",zh:"教义、道理",ex:"ajaran sesat 异端"}],
  syn:"belajar 学 / mengajar 教，一根两向；pelajar 学生 / pengajar 教师；pelajaran 功课 / pengajaran 教导这件事",
  ex:"Yesus mengajar orang banyak.|耶稣教导众人。"},
 {t:"root",w:"musik",pos:"名词",p:"mu-sik 木-西克",zh:"音乐",c:"教会",
  der:[],
  syn:"外来词（荷 muziek），不参与印尼语派生。lagu = 一首首的歌曲；musik = 音乐整体",
  ex:"Saya suka mendengarkan musik rohani.|我喜欢听灵修音乐。"},
 {t:"phrase",w:"air terjun",p:"a-ir ter-jun",zh:"瀑布",c:"地形",
  lit:"air 水 + terjun 跳下",
  note:"固定组合，不说 air jatuh；terjun 单用是「跳下、投身」",
  ex:"Kami pergi melihat air terjun.|我们去看瀑布。"},
];
```

注意 `extractData` 靠**行首的 `];`** 定位数组结尾，且取的是文件里**第一个** `const DATA = [`。改名后 `OLD` 在前、`DATA` 在后，`extractData` 会正确锁定新的 `DATA`。

- [ ] **Step 3: 换 id 生成和 storage key**

第 594 行：

```js
let deck = DATA.map((d,i)=>({...d,id:i}));
```

改成：

```js
function cardId(d){
  const slug = String(d.w).trim().toLowerCase().replace(/\s+/g, "-");
  return d.n ? `${d.t}:${slug}-${d.n}` : `${d.t}:${slug}`;
}
let deck = DATA.map(d=>({...d, id: cardId(d)}));
```

第 598 行：

```js
const STORAGE_KEY = "kosakata-known";
```

改成：

```js
const STORAGE_KEY = "kosakata-known-v2";
```

第 747 行（`renderKnownList` 里的移出按钮）：

```js
      known.delete(Number(b.dataset.id));
```

改成：

```js
      known.delete(b.dataset.id);
```

id 现在是字符串，`Number()` 会得到 `NaN`，删不掉任何东西。

- [ ] **Step 4: 渲染分两套模板**

把 `render()`（第 693-723 行）整个替换成：

```js
function render(){
  $("knownCount").textContent = known.size;
  $("score").textContent = `已掌握 ${known.size}`;
  if(!view.length){
    card.classList.remove("flip");
    $("tagF").textContent = cat;
    $("tagB").textContent = cat;
    $("w").textContent = "🎉";
    $("p").textContent = "";
    $("zh").textContent = "这个分类的词你都记住了！";
    $("detail").innerHTML = `<div class="row"><i>点击下方"已掌握列表"可以把词移出来重新练习。</i></div>`;
    $("pos").textContent = "0 / 0";
    $("fill").style.width = "0%";
    return;
  }
  card.classList.remove("flip");
  const d = view[idx];
  $("w").textContent = d.w;
  $("p").textContent = d.p;
  $("tagF").textContent = d.c;
  $("tagB").textContent = d.c;
  $("zh").textContent = d.zh;
  const [ind, chn] = d.ex.split("|");
  const row = (label, val) => `<div class="row"><b>${label}</b><i>${val}</i></div>`;
  const exBlock = `<div class="ex"><em>${ind}</em>${chn}</div>`;
  $("detail").innerHTML = d.t === "phrase"
    ? row("直译", d.lit) + (d.note ? row("提示", d.note) : "") + exBlock
    : row("词性", d.pos)
      + (d.der || []).map(x =>
          `<div class="der"><span class="dw">${x.w}</span><span class="dz">${x.zh}<span class="dx">${x.ex}</span></span></div>`
        ).join("")
      + (d.syn ? row("辨析", d.syn) : "")
      + exBlock;
  $("pos").textContent = `${idx+1} / ${view.length}`;
  $("fill").style.width = `${(idx+1)/view.length*100}%`;
}
```

- [ ] **Step 5: 跑校验**

Run: `node tools/check-data.mjs`
Expected: `OK：3 张卡片全部通过校验`

Run: `node --test tools/`
Expected: PASS，19 个 test 全绿（校验脚本本身没动，确认没被连带改坏）

- [ ] **Step 6: 浏览器手测**

Run: `python3 -m http.server 8000` 然后打开 `http://localhost:8000/`

逐项确认：

- 三张卡都能翻面，背面不再出现「词根 undefined」「搭配 undefined」
- `ajar` 背面：词性行 → 两行衍生词（词形加粗、中文、下面一行灰绿色的用例）→ 辨析行 → 例句块。**不出现 `ber- + ajar` 这类构成式**
- `musik` 背面：词性行 → 无衍生词行 → 辨析行 → 例句块
- `air terjun` 背面：直译行 → 提示行 → 例句块
- 点「记住了」后卡片消失；刷新页面进度还在
- 打开「已掌握列表」，点「移出」，卡片回到轮换里（这一步验证 Step 3 的 `Number()` 修复）
- 点「清空进度」能清干净

- [ ] **Step 7: 提交**

```bash
git add index.html
git commit -m "Switch card model to root/phrase types with stable ids

Card ids move from array indices to strings like root:ajar, so
reordering the deck no longer scrambles saved progress. The known-set
storage key is bumped to v2 and old progress is intentionally dropped.
Backs render() with one template per card type, and keeps the 271 legacy
entries around as OLD while the migration runs."
```

---

### Task 4: 类型筛选行

顶部加一行类型切换（全部 / 词根 / 词组），与现有分类标签叠加生效。两行的计数都随对方的选中状态变化。

**Files:**
- Modify: `index.html:238`（在 `#cats` 前插入 `#types`）
- Modify: `index.html` 的 `cats()` / `filter()`（Task 3 之后行号会偏移，按函数名定位）
- Modify: `index.html` 末尾的 `cats(); filter();` 初始化调用

**Interfaces:**
- Consumes: Task 3 的 `DATA`（含 `t` 字段）、`deck`、`cardId`
- Produces: 模块级 `let type`（值域 `"全部" | "root" | "phrase"`）、`inType(d)`、`inCat(d)`、`types()`

- [ ] **Step 1: 加类型行的容器**

第 238 行：

```html
  <div class="controls" id="cats"></div>
```

改成：

```html
  <div class="controls" id="types"></div>
  <div class="controls" id="cats"></div>
```

样式复用现有的 `.controls` 和 `.chip`，不加新 CSS。

- [ ] **Step 2: 加 `type` 状态**

找到 `let cat = "全部";`，在它下面加一行：

```js
let type = "全部";
```

- [ ] **Step 3: 重写筛选函数**

把 `cats()` 和 `filter()` 两个函数整体替换成：

```js
const TYPE_LABEL = { "全部":"全部", "root":"词根", "phrase":"词组" };

function inType(d){ return type === "全部" || d.t === type; }
function inCat(d){ return cat === "全部" || d.c === cat; }

function types(){
  const pool = DATA.filter(inCat);
  $("types").innerHTML = ["全部","root","phrase"].map(k=>{
    const n = k === "全部" ? pool.length : pool.filter(d=>d.t===k).length;
    return `<button class="chip ${k===type?'on':''}" data-t="${k}">${TYPE_LABEL[k]} ${n}</button>`;
  }).join("");
  $("types").querySelectorAll(".chip").forEach(b=>{
    b.onclick = ()=>{ type = b.dataset.t; filter(); types(); cats(); };
  });
}

function cats(){
  const pool = DATA.filter(inType);
  const set = ["全部", ...new Set(DATA.map(d=>d.c))];
  $("cats").innerHTML = set.map(c=>{
    const n = c === "全部" ? pool.length : pool.filter(d=>d.c===c).length;
    return `<button class="chip ${c===cat?'on':''}" data-c="${c}">${c} ${n}</button>`;
  }).join("");
  $("cats").querySelectorAll(".chip").forEach(b=>{
    b.onclick = ()=>{ cat = b.dataset.c; filter(); cats(); types(); };
  });
}

function filter(){
  view = deck.filter(d => inCat(d) && inType(d) && !known.has(d.id));
  idx = 0; render();
}
```

分类标签的**列表**始终来自完整 `DATA`（`new Set(DATA.map(d=>d.c))`），只有计数跟着类型走。这样切到「词组」时，计数为 0 的分类仍然留在原位可点，用户不会因为标签消失而卡住。

- [ ] **Step 4: 空状态显示两个维度**

在 `render()` 里，把空状态的两行：

```js
    $("tagF").textContent = cat;
    $("tagB").textContent = cat;
```

改成：

```js
    const scope = type === "全部" ? cat : `${TYPE_LABEL[type]} · ${cat}`;
    $("tagF").textContent = scope;
    $("tagB").textContent = scope;
```

- [ ] **Step 5: 初始化时渲染类型行**

文件末尾：

```js
cats(); filter();
```

改成：

```js
types(); cats(); filter();
```

- [ ] **Step 6: 跑校验**

Run: `node tools/check-data.mjs && node --test tools/`
Expected: `OK：3 张卡片全部通过校验`，随后 19 个 test 全绿

- [ ] **Step 7: 浏览器手测**

Run: `python3 -m http.server 8000`

用 Task 3 的三张样例卡（学习 1 张词根、教会 1 张词根、地形 1 张词组）确认：

- 顶部两行标签，上面是 `全部 3 / 词根 2 / 词组 1`
- 点「词组」→ 只剩 `air terjun`；分类行的计数变成 `全部 1 / 学习 0 / 教会 0 / 地形 1`，且「学习」「教会」标签仍在
- 在「词组」下再点「教会」→ 空状态，标签显示 `词组 · 教会`
- 点回「全部 / 全部」→ 三张卡都回来
- 类型选中态和分类选中态互不清除

- [ ] **Step 8: 提交**

```bash
git add index.html
git commit -m "Add card-type filter row alongside the category filter

Type and category are orthogonal, so the two rows intersect rather than
replace each other. Each row's counts reflect the other row's current
selection, but the category labels themselves always come from the full
deck so a zero-count category stays clickable."
```

---

### Task 5: 迁移批次 1（原 #1-55）

从这里开始是内容迁移。五个批次流程完全一致，只是覆盖的清册行号不同。每批的产出直接追加到 `index.html` 的新 `DATA` 数组末尾。

**Files:**
- Read: `docs/superpowers/migration-inventory.md`（第 1-55 行）
- Read: `index.html` 的 `OLD` 数组第 1-55 条（源文件行 321-375）
- Modify: `index.html` 的新 `DATA` 数组（追加卡片）

**Interfaces:**
- Consumes: Task 2 的清册、Task 3 定下的 `DATA` 字段结构
- Produces: 新 `DATA` 里对应本批的词根卡与词组卡

- [ ] **Step 1: 读清册的本批范围**

读 `docs/superpowers/migration-inventory.md` 的第 1-55 行，读 `index.html` 里 `OLD` 的对应 55 条原卡。

- [ ] **Step 2: 按处置逐条产出卡片**

四种处置的写法：

**`新建词根卡`** — 原卡的 `w`/`p`/`zh`/`c` 直接搬；`pos` 取清册的「词性」列；`der` 取清册「拟选 der」列的 1~2 个，每条的 `zh` 从对应派生词原卡的 `zh` 来（若那张原卡在别的批次，照清册记的写，不要等），`ex` 从对应原卡的 `coll` 里挑一条最典型的词组；`syn` 由原卡 `syn` 加上落选衍生词的一句话说明拼成；`ex` 搬原卡 `ex`。旧的 `root` 和 `coll` 字段**不写进新卡**。

```js
 {t:"root",w:"usir",pos:"动词根（不单用）",p:"u-sir 乌-西尔",zh:"驱赶、驱逐",c:"教会",
  der:[{w:"mengusir",zh:"驱赶、驱逐（及物）",ex:"mengusir setan 赶鬼"}],
  syn:"mengeluarkan 使出去；menolak 拒绝；membuang 丢弃",
  ex:"Yesus mengusir setan dari orang itu.|耶稣从那人身上赶出鬼。"},
```

**`并入 X`** — 本批**不产出卡片**，内容已经进了词根 X 的 `der`。若 X 属于后面的批次，在本批的提交说明里记一句，别重复建卡。

**`新建词组卡`** — 原卡的 `w`/`p`/`zh`/`c` 直接搬；`lit` 从原卡 `root` 字段改写成 `词A 义A + 词B 义B` 格式；`note` 从原卡 `syn` 改写；`ex` 搬原卡 `ex`。

```js
 {t:"phrase",w:"kali terakhir",p:"ka-li te-ra-khir",zh:"上一次",c:"高频",
  lit:"kali 次 + terakhir 最后",
  note:"⚠️ 没有「kali lalu」这种说法；lalu 只跟时间段（hari/minggu/bulan/tahun）",
  ex:"Kali terakhir kita bertemu di gereja.|上一次我们是在教会见面的。"},
```

**`抽出词组卡：X`** — 为 X 单独建一张 `t:"phrase"` 卡。`p` 自己按音节切；`zh` 写整体释义；`lit` 逐词直译；`ex` 现造一句用得上的例句（教会 / 印尼工厂采购 / 日常三个场景里挑），不要复用词根卡的例句。

```js
 {t:"phrase",w:"gempa bumi",p:"gem-pa bu-mi",zh:"地震",c:"生活",
  lit:"gempa 震动 + bumi 大地",
  note:"口语可只说 gempa；bumi 单用是「地、大地」",
  ex:"Semalam ada gempa bumi kecil di Jakarta.|昨晚雅加达有一次小地震。"},
```

把本批产出的卡片追加到新 `DATA` 数组末尾（`];` 之前）。

- [ ] **Step 3: 跑校验**

Run: `node tools/check-data.mjs`
Expected: `OK：<3 + 本批张数> 张卡片全部通过校验`

有报错就照错误信息改，直到通过。常见错误和成因：
- `残留旧字段 root` — 忘了删原卡的 `root` 字段
- `der 的 ex 是词组或短例句，不带竖线` — 把整句例句抄进 `der[].ex` 了
- `id 重复` — 同一个词组被两条原卡的 coll 抽了两次，或忘了查清册的去重记录

- [ ] **Step 4: 对照清册核数**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8"));
  const n = t => d.filter(x => x.t === t).length;
  console.log(`词根卡 ${n("root")} / 词组卡 ${n("phrase")} / 合计 ${d.length}`);
});'
```

Expected: 数字等于「3 张样例卡 + 清册第 1-55 行判定的新建卡数」。对不上就回头查是不是漏了或重了。

- [ ] **Step 5: 浏览器抽查 3 张**

Run: `python3 -m http.server 8000`

本批里随机翻 3 张（至少含 1 张词组卡），确认背面排版正常、没有 `undefined`、衍生词那行不出现构成式。

- [ ] **Step 6: 提交**

```bash
git add index.html
git commit -m "Migrate deck entries 1-55 to root and phrase cards"
```

---

### Task 6: 迁移批次 2（原 #56-110）

**Files:**
- Read: `docs/superpowers/migration-inventory.md`（第 56-110 行）
- Read: `index.html` 的 `OLD` 数组第 56-110 条（源文件行 376-430）
- Modify: `index.html` 的新 `DATA` 数组（追加卡片）

**Interfaces:**
- Consumes: Task 2 的清册、Task 3 定下的 `DATA` 字段结构
- Produces: 新 `DATA` 里对应本批的词根卡与词组卡

- [ ] **Step 1: 读清册的本批范围**

读 `docs/superpowers/migration-inventory.md` 的第 56-110 行，读 `index.html` 里 `OLD` 的对应 55 条原卡。

- [ ] **Step 2: 按处置逐条产出卡片**

写法与 Task 5 Step 2 完全相同，四种处置的模板逐字重复如下。

**`新建词根卡`** — 原卡的 `w`/`p`/`zh`/`c` 直接搬；`pos` 取清册的「词性」列；`der` 取清册「拟选 der」列的 1~2 个；`syn` 由原卡 `syn` 加上落选衍生词的说明拼成；`ex` 搬原卡 `ex`。旧的 `root` 和 `coll` 字段不写进新卡。

```js
 {t:"root",w:"usir",pos:"动词根（不单用）",p:"u-sir 乌-西尔",zh:"驱赶、驱逐",c:"教会",
  der:[{w:"mengusir",zh:"驱赶、驱逐（及物）",ex:"mengusir setan 赶鬼"}],
  syn:"mengeluarkan 使出去；menolak 拒绝；membuang 丢弃",
  ex:"Yesus mengusir setan dari orang itu.|耶稣从那人身上赶出鬼。"},
```

**`并入 X`** — 本批不产出卡片，内容已经进了词根 X 的 `der`。

**`新建词组卡`**：

```js
 {t:"phrase",w:"kali terakhir",p:"ka-li te-ra-khir",zh:"上一次",c:"高频",
  lit:"kali 次 + terakhir 最后",
  note:"⚠️ 没有「kali lalu」这种说法；lalu 只跟时间段（hari/minggu/bulan/tahun）",
  ex:"Kali terakhir kita bertemu di gereja.|上一次我们是在教会见面的。"},
```

**`抽出词组卡：X`** — `p` 自己按音节切，`ex` 现造一句，不复用词根卡的例句：

```js
 {t:"phrase",w:"gempa bumi",p:"gem-pa bu-mi",zh:"地震",c:"生活",
  lit:"gempa 震动 + bumi 大地",
  note:"口语可只说 gempa；bumi 单用是「地、大地」",
  ex:"Semalam ada gempa bumi kecil di Jakarta.|昨晚雅加达有一次小地震。"},
```

追加到新 `DATA` 数组末尾。

- [ ] **Step 3: 跑校验**

Run: `node tools/check-data.mjs`
Expected: `OK：<累计张数> 张卡片全部通过校验`

- [ ] **Step 4: 对照清册核数**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8"));
  const n = t => d.filter(x => x.t === t).length;
  console.log(`词根卡 ${n("root")} / 词组卡 ${n("phrase")} / 合计 ${d.length}`);
});'
```

Expected: 等于上一批的合计加上清册第 56-110 行判定的新建卡数。

- [ ] **Step 5: 浏览器抽查 3 张**

Run: `python3 -m http.server 8000`，本批随机翻 3 张（至少含 1 张词组卡），确认背面排版正常、无 `undefined`、无构成式。

- [ ] **Step 6: 提交**

```bash
git add index.html
git commit -m "Migrate deck entries 56-110 to root and phrase cards"
```

---

### Task 7: 迁移批次 3（原 #111-165）

**Files:**
- Read: `docs/superpowers/migration-inventory.md`（第 111-165 行）
- Read: `index.html` 的 `OLD` 数组第 111-165 条（源文件行 431-485）
- Modify: `index.html` 的新 `DATA` 数组（追加卡片）

**Interfaces:**
- Consumes: Task 2 的清册、Task 3 定下的 `DATA` 字段结构
- Produces: 新 `DATA` 里对应本批的词根卡与词组卡

- [ ] **Step 1: 读清册的本批范围**

读 `docs/superpowers/migration-inventory.md` 的第 111-165 行，读 `index.html` 里 `OLD` 的对应 55 条原卡。

- [ ] **Step 2: 按处置逐条产出卡片**

**`新建词根卡`** — 原卡的 `w`/`p`/`zh`/`c` 直接搬；`pos` 取清册的「词性」列；`der` 取清册「拟选 der」列的 1~2 个；`syn` 由原卡 `syn` 加落选衍生词说明拼成；`ex` 搬原卡 `ex`。旧的 `root` 和 `coll` 不写进新卡。

```js
 {t:"root",w:"usir",pos:"动词根（不单用）",p:"u-sir 乌-西尔",zh:"驱赶、驱逐",c:"教会",
  der:[{w:"mengusir",zh:"驱赶、驱逐（及物）",ex:"mengusir setan 赶鬼"}],
  syn:"mengeluarkan 使出去；menolak 拒绝；membuang 丢弃",
  ex:"Yesus mengusir setan dari orang itu.|耶稣从那人身上赶出鬼。"},
```

**`并入 X`** — 本批不产出卡片。

**`新建词组卡`**：

```js
 {t:"phrase",w:"kali terakhir",p:"ka-li te-ra-khir",zh:"上一次",c:"高频",
  lit:"kali 次 + terakhir 最后",
  note:"⚠️ 没有「kali lalu」这种说法；lalu 只跟时间段（hari/minggu/bulan/tahun）",
  ex:"Kali terakhir kita bertemu di gereja.|上一次我们是在教会见面的。"},
```

**`抽出词组卡：X`**：

```js
 {t:"phrase",w:"gempa bumi",p:"gem-pa bu-mi",zh:"地震",c:"生活",
  lit:"gempa 震动 + bumi 大地",
  note:"口语可只说 gempa；bumi 单用是「地、大地」",
  ex:"Semalam ada gempa bumi kecil di Jakarta.|昨晚雅加达有一次小地震。"},
```

追加到新 `DATA` 数组末尾。

- [ ] **Step 3: 跑校验**

Run: `node tools/check-data.mjs`
Expected: `OK：<累计张数> 张卡片全部通过校验`

- [ ] **Step 4: 对照清册核数**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8"));
  const n = t => d.filter(x => x.t === t).length;
  console.log(`词根卡 ${n("root")} / 词组卡 ${n("phrase")} / 合计 ${d.length}`);
});'
```

Expected: 等于上一批的合计加上清册第 111-165 行判定的新建卡数。

- [ ] **Step 5: 浏览器抽查 3 张**

Run: `python3 -m http.server 8000`，本批随机翻 3 张（至少含 1 张词组卡），确认背面排版正常、无 `undefined`、无构成式。

- [ ] **Step 6: 提交**

```bash
git add index.html
git commit -m "Migrate deck entries 111-165 to root and phrase cards"
```

---

### Task 8: 迁移批次 4（原 #166-220）

**Files:**
- Read: `docs/superpowers/migration-inventory.md`（第 166-220 行）
- Read: `index.html` 的 `OLD` 数组第 166-220 条（源文件行 486-540）
- Modify: `index.html` 的新 `DATA` 数组（追加卡片）

**Interfaces:**
- Consumes: Task 2 的清册、Task 3 定下的 `DATA` 字段结构
- Produces: 新 `DATA` 里对应本批的词根卡与词组卡

- [ ] **Step 1: 读清册的本批范围**

读 `docs/superpowers/migration-inventory.md` 的第 166-220 行，读 `index.html` 里 `OLD` 的对应 55 条原卡。

- [ ] **Step 2: 按处置逐条产出卡片**

**`新建词根卡`** — 原卡的 `w`/`p`/`zh`/`c` 直接搬；`pos` 取清册的「词性」列；`der` 取清册「拟选 der」列的 1~2 个；`syn` 由原卡 `syn` 加落选衍生词说明拼成；`ex` 搬原卡 `ex`。旧的 `root` 和 `coll` 不写进新卡。

```js
 {t:"root",w:"usir",pos:"动词根（不单用）",p:"u-sir 乌-西尔",zh:"驱赶、驱逐",c:"教会",
  der:[{w:"mengusir",zh:"驱赶、驱逐（及物）",ex:"mengusir setan 赶鬼"}],
  syn:"mengeluarkan 使出去；menolak 拒绝；membuang 丢弃",
  ex:"Yesus mengusir setan dari orang itu.|耶稣从那人身上赶出鬼。"},
```

**`并入 X`** — 本批不产出卡片。

**`新建词组卡`**：

```js
 {t:"phrase",w:"kali terakhir",p:"ka-li te-ra-khir",zh:"上一次",c:"高频",
  lit:"kali 次 + terakhir 最后",
  note:"⚠️ 没有「kali lalu」这种说法；lalu 只跟时间段（hari/minggu/bulan/tahun）",
  ex:"Kali terakhir kita bertemu di gereja.|上一次我们是在教会见面的。"},
```

**`抽出词组卡：X`**：

```js
 {t:"phrase",w:"gempa bumi",p:"gem-pa bu-mi",zh:"地震",c:"生活",
  lit:"gempa 震动 + bumi 大地",
  note:"口语可只说 gempa；bumi 单用是「地、大地」",
  ex:"Semalam ada gempa bumi kecil di Jakarta.|昨晚雅加达有一次小地震。"},
```

追加到新 `DATA` 数组末尾。

- [ ] **Step 3: 跑校验**

Run: `node tools/check-data.mjs`
Expected: `OK：<累计张数> 张卡片全部通过校验`

- [ ] **Step 4: 对照清册核数**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8"));
  const n = t => d.filter(x => x.t === t).length;
  console.log(`词根卡 ${n("root")} / 词组卡 ${n("phrase")} / 合计 ${d.length}`);
});'
```

Expected: 等于上一批的合计加上清册第 166-220 行判定的新建卡数。

- [ ] **Step 5: 浏览器抽查 3 张**

Run: `python3 -m http.server 8000`，本批随机翻 3 张（至少含 1 张词组卡），确认背面排版正常、无 `undefined`、无构成式。

- [ ] **Step 6: 提交**

```bash
git add index.html
git commit -m "Migrate deck entries 166-220 to root and phrase cards"
```

---

### Task 9: 迁移批次 5（原 #221-271）并删除旧词库

最后一批，外加删掉 `OLD` 常量、更新 README。

**Files:**
- Read: `docs/superpowers/migration-inventory.md`（第 221-271 行）
- Read: `index.html` 的 `OLD` 数组第 221-271 条（源文件行 541-591）
- Modify: `index.html` 的新 `DATA` 数组（追加卡片），随后删除整个 `OLD` 数组
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 2 的清册、Task 3 定下的 `DATA` 字段结构
- Produces: 完整迁移后的 `DATA`；`index.html` 里不再有 `OLD`

- [ ] **Step 1: 读清册的本批范围**

读 `docs/superpowers/migration-inventory.md` 的第 221-271 行，读 `index.html` 里 `OLD` 的对应 51 条原卡。

- [ ] **Step 2: 按处置逐条产出卡片**

**`新建词根卡`** — 原卡的 `w`/`p`/`zh`/`c` 直接搬；`pos` 取清册的「词性」列；`der` 取清册「拟选 der」列的 1~2 个；`syn` 由原卡 `syn` 加落选衍生词说明拼成；`ex` 搬原卡 `ex`。旧的 `root` 和 `coll` 不写进新卡。

```js
 {t:"root",w:"usir",pos:"动词根（不单用）",p:"u-sir 乌-西尔",zh:"驱赶、驱逐",c:"教会",
  der:[{w:"mengusir",zh:"驱赶、驱逐（及物）",ex:"mengusir setan 赶鬼"}],
  syn:"mengeluarkan 使出去；menolak 拒绝；membuang 丢弃",
  ex:"Yesus mengusir setan dari orang itu.|耶稣从那人身上赶出鬼。"},
```

**`并入 X`** — 本批不产出卡片。

**`新建词组卡`**：

```js
 {t:"phrase",w:"kali terakhir",p:"ka-li te-ra-khir",zh:"上一次",c:"高频",
  lit:"kali 次 + terakhir 最后",
  note:"⚠️ 没有「kali lalu」这种说法；lalu 只跟时间段（hari/minggu/bulan/tahun）",
  ex:"Kali terakhir kita bertemu di gereja.|上一次我们是在教会见面的。"},
```

**`抽出词组卡：X`**：

```js
 {t:"phrase",w:"gempa bumi",p:"gem-pa bu-mi",zh:"地震",c:"生活",
  lit:"gempa 震动 + bumi 大地",
  note:"口语可只说 gempa；bumi 单用是「地、大地」",
  ex:"Semalam ada gempa bumi kecil di Jakarta.|昨晚雅加达有一次小地震。"},
```

追加到新 `DATA` 数组末尾。

- [ ] **Step 3: 跑校验并对全部清册核数**

Run: `node tools/check-data.mjs`
Expected: `OK：<全部张数> 张卡片全部通过校验`

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8"));
  const n = t => d.filter(x => x.t === t).length;
  console.log(`词根卡 ${n("root")} / 词组卡 ${n("phrase")} / 合计 ${d.length}`);
});'
```

Expected: 与清册末尾「规模」一节记的数字完全一致。**不一致就停下来查**，不要改清册凑数——先确认是哪一批漏了或重了。

- [ ] **Step 4: 确认原库每一条都有着落**

Run:

```bash
grep -c '^| [0-9]' docs/superpowers/migration-inventory.md
```

Expected: `271`

逐条检查清册里每一行的处置都已落实：`新建词根卡` / `新建词组卡` / `抽出词组卡` 的目标词形都能在新 `DATA` 里搜到，`并入 X` 的原词形都能在某张词根卡的 `der[].w` 或 `syn` 里搜到。抽查 10 条 `并入` 行确认。

- [ ] **Step 5: 删除 OLD 数组**

删掉 `index.html` 里从注释行 `// 旧格式词库，迁移期间保留供抄写…` 到 `const OLD = [` 整个数组及其收尾 `];` 的全部内容。新 `DATA` 成为文件里唯一的词库。

Run: `grep -c 'const OLD' index.html`
Expected: `0`

Run: `node tools/check-data.mjs`
Expected: 张数与 Step 3 相同（删 `OLD` 不该影响 `DATA`）

- [ ] **Step 6: 更新 README**

`README.md` 的「怎么用」一节，把这一行：

```markdown
- 点击卡片，或按空格键，翻面查看中文释义、词根、常见搭配、辨析和例句
- 用顶部的分类标签筛选词库
```

改成：

```markdown
- 点击卡片，或按空格键翻面。词根卡的背面是词性、1~2 个重要衍生词（各配一个用例）、
  辨析和例句；词组卡的背面是逐词直译、用法提示和例句
- 顶部有两行标签：上面一行按卡片类型（词根 / 词组）筛，下面一行按分类筛，两者叠加生效
```

在「文件说明」一节末尾追加：

```markdown
- `tools/check-data.mjs` — 词库校验脚本，改完词库跑 `node tools/check-data.mjs`
- `docs/superpowers/` — 设计文档、实施计划、迁移清册
```

在「本地开发」一节末尾追加：

```markdown
往词库里加词的规范见桌面的《词库导出规则.md》。加完跑一次校验：

```bash
node tools/check-data.mjs
node --test tools/
```
```

- [ ] **Step 7: 完整浏览器手测**

Run: `python3 -m http.server 8000`

先在浏览器开发者工具的 Console 里清掉旧状态：`localStorage.clear()`，刷新。然后逐项确认：

- 类型行计数 = 校验脚本报的词根卡 / 词组卡数
- 「全部」下从头翻到尾不报错（Console 无红色报错），随机抽 15 张看背面
- 类型 × 分类叠加筛选正常，切换时选中态互不清除
- ⇄ 打乱后仍能正常翻卡
- 「记住了」→ 刷新 → 进度还在；「已掌握列表」里能看到、能移出
- 「清空进度」能清干净
- 同步弹窗填一个新同步码，能连上并显示「已连接」；换个浏览器窗口填同一个码，进度能同步过去

- [ ] **Step 8: 提交**

```bash
git add index.html README.md
git commit -m "Migrate deck entries 221-271 and drop the legacy deck

Completes the migration: the OLD array is removed and the new root/phrase
DATA is the only deck in the file. README now describes both card types
and the two filter rows."
```

---

### Task 10: 桌面《词库导出规则.md》

给以后往词库里加词用的规范。写到 Windows 桌面，不进 git 仓库。

**Files:**
- Create: `/mnt/c/Users/zhang/OneDrive/桌面/词库导出规则.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-07-root-card-redesign-design.md` 的「数据模型」「词性标注表」「衍生词重要度排序判据」「词组卡的收录门槛」四节
- Produces: 桌面文档，不被任何代码引用

- [ ] **Step 1: 确认桌面路径可写**

Run: `touch "/mnt/c/Users/zhang/OneDrive/桌面/.write-test" && rm "/mnt/c/Users/zhang/OneDrive/桌面/.write-test" && echo writable`
Expected: `writable`

若失败，改写到 `/mnt/c/Users/zhang/Desktop/` 并在完成汇报里说明换了路径。

- [ ] **Step 2: 写文档**

创建 `/mnt/c/Users/zhang/OneDrive/桌面/词库导出规则.md`，包含以下九节：

1. **这份文档管什么** — 一段话：往 kartu-kosakata 词库加词时的取词与填写规范。词库在 `index.html` 的 `const DATA` 里。

2. **两种卡片，怎么选** — 词根卡记「一个词根 + 它最值钱的 1~2 个衍生词」；词组卡记「拆开看不出意思的固定搭配」。一个新词进来先问：它是不是词根？不是就还原到词根。

3. **核心规矩：以词根取词，不以派生词取词** — 遇到生词先剥词缀还原到词根（`me-/meN-`、`ber-`、`pe-/peN-`、`-an`、`-kan`、`-i`、`se-`、`ter-`、`-lah`），再查词库里这个词根卡在不在。在 → 考虑要不要用这个新词替换掉现有 `der` 里较弱的一条；不在 → 新建词根卡，把这个生词作为第一条 `der`。**永远不要为一个派生词单独建卡。** 注意假词缀：`terjun`、`berat`、`bertih` 里的 `ter-`/`ber-` 不是词缀，剥错了就查无此根。

4. **词性标注表** — 逐字抄设计文档「词性标注表」一节：`动词根` / `名词` / `形容词` / `副词` / `连词` / `介词` / `数词` / `代词` / `量词` / `词缀`，不单用的加「（不单用）」，外来词照常标词性、`der` 留空。`词缀` 用于卡片教的就是这个词缀本身的情形（`-an（约数）`），这类卡永远带「（不单用）」。

5. **衍生词怎么挑（最多 2 个）** — 逐字抄设计文档的四条判据：①用户实际语境（教会讲道、印尼工厂采购、日常）里频率高的优先；②与词根本义偏离最大的优先，偏离小的能猜出来不值得占位；③优先选不同词缀家族的（一个 `meN-` 动词 + 一个 `pe-/-an` 名词），不要两个都是 `meN-` 系；④已经独立成词、词典单列词条的优先。配一组正反例：`ajar` 选 `mengajar` + `ajaran`（一动一名，`ajaran` 教义偏离最大）而不是 `mengajar` + `mengajarkan`（同一词缀家族，意思几乎重叠）。

6. **固定搭配怎么算够格** — 逐字抄设计文档的收录门槛：整体意思不能由逐词直译推出，或搭配固定到换词就错。正例 `air terjun`（水+跳下=瀑布）、`gempa bumi`、`berat hati`（重+心=不情愿）、`satu demi satu`、`jurang pemisah`；反例 `mendengarkan musik`（听音乐，自由组合，不收）、`pabrik sepatu`（鞋厂，自由组合，不收）。

7. **两套字段表** — 逐字抄设计文档「词根卡」和「词组卡」两节的字段表，含必填标记和说明。特别标出：衍生词的构成式（`ber- + ajar`）**不写进卡片**；`ex` 用竖线分中印；`der[].ex` 不带竖线。

8. **完整示例** — 词根卡和词组卡各一张，用设计文档里的 `ajar` 和 `air terjun`，带完整字段。

9. **入库自检清单** — 每条前面带 `- [ ]`：
   - `t` 只能是 `"root"` 或 `"phrase"`
   - 词根卡的 `w` 是裸词根，不带任何词缀
   - `pos` 填了，取值在词性表里
   - `der` 不超过 2 条，每条 `w`/`zh`/`ex` 齐全
   - `der[].ex` 是词组或短例句，**不带竖线**
   - 卡片没有残留旧字段 `root` / `coll`
   - `ex` 恰好一个竖线，左印尼语右中文，两侧非空
   - 词组卡的 `zh` 不等于逐词直译之和（等于的话说明不够格收录）
   - 词组卡填了 `lit`，没有 `der`
   - id（`${t}:${w 小写、空格转连字符}`）与现有卡不冲突；同形异义加 `n:1` / `n:2`
   - 跑 `node tools/check-data.mjs` 通过

- [ ] **Step 3: 验证文档能用**

拿一个不在词库里的新词走一遍流程，检验文档是否自洽、有没有指令缺口。用 `mempersiapkan`（预备）：

- 按第 3 节剥词缀：`meN- + per- + siap + -kan` → 词根 `siap`
- 按第 4 节定词性：`siap` 是形容词（准备好的）
- 按第 5 节挑 der：`mempersiapkan`（预备某事，偏离大）+ `persiapan`（准备工作，名词、不同词缀家族）
- 按第 7 节填完整卡片
- 按第 9 节逐条自检

走不通或某一步文档没说清，回 Step 2 补。

- [ ] **Step 4: 确认落盘**

Run: `ls -l "/mnt/c/Users/zhang/OneDrive/桌面/词库导出规则.md" && wc -l "/mnt/c/Users/zhang/OneDrive/桌面/词库导出规则.md"`
Expected: 文件存在，行数 > 100

- [ ] **Step 5: 提交**

桌面文档不进仓库。本任务无 git 改动，跳过提交。

Run: `git status --short`
Expected: 空输出（工作区干净）

---

## 自检记录

**Spec 覆盖：**

| 设计文档小节 | 对应任务 |
|---|---|
| 数据模型 · 词根卡 | Task 1（校验规则）、Task 3（渲染与样例） |
| 数据模型 · 词性标注表 | Task 2（清册的词性列）、Task 10（第 4 节） |
| 数据模型 · 词组卡 | Task 1、Task 3 |
| 词库迁移 六条规则 | Task 2（判定）、Task 5-9（执行） |
| 应用改动 · 卡片 id | Task 3 Step 3 |
| 应用改动 · 筛选 | Task 4 |
| 应用改动 · 渲染 | Task 3 Step 4 |
| 应用改动 · 已掌握列表 | Task 3 Step 3（`Number()` 修复）、Step 6 手测 |
| 桌面文档 八项内容 | Task 10 Step 2 的九节 |
| 测试 · 数据自检脚本 | Task 1（并入库为常驻工具，非临时脚本——比设计文档写的更进一步） |
| 测试 · 浏览器手测 | Task 3 Step 6、Task 4 Step 7、Task 5-9 Step 5、Task 9 Step 7 |
| 测试 · Firebase 同步 | Task 9 Step 7 最后一项 |
| 分阶段 ①②③ | ①=Task 1/3/4，②=Task 2/5-9，③=Task 10 |

**与设计文档的一处偏离：** 设计文档说校验脚本是「临时，不入库」，本计划把它作为常驻工具提交到 `tools/`。理由是这个项目没有测试框架，迁移之后每次加词都需要同一个闸门，Task 10 的自检清单最后一条也依赖它存在。

**类型一致性：** `cardId` 在 `tools/check-data.mjs`（Task 1）和 `index.html`（Task 3）各有一份实现，两处的 slug 规则和 `n` 后缀逻辑逐字相同。`extractData` / `validateCard` / `validateDeck` 的签名在 Task 1 定义，Task 2 和 Task 5-9 的核数脚本只用 `extractData`。`inType` / `inCat` / `types` / `TYPE_LABEL` 在 Task 4 定义并只在 Task 4 使用。`render()` 在 Task 3 定义、Task 4 Step 4 修改其空状态分支，两处引用的 `TYPE_LABEL` 均来自 Task 4 Step 3。
