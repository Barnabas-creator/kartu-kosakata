# 多标签分类 + 两栏衍生词 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 312 张卡的单值分类改成十标签多值制，去掉词根/词组类型筛选，并把衍生词上限从 2 提到 4、背面改两栏容纳它们。

**Architecture:** 单文件应用 `index.html`，词库内联在 `DATA` 数组。改动三层：校验脚本收数组型 `c` 与新上限；应用层删类型筛选行、`inCat` 改成标签命中、衍生词区改 CSS 网格；词库内容分两步重打标签（机械部分脚本批改，判断部分人工），再过一遍补衍生词。

**Tech Stack:** 原生 HTML/CSS/ES module，Firebase Firestore v10.14.1（CDN，仅同步进度），Node 22 内置 `node:test`。

设计文档：`docs/superpowers/specs/2026-08-11-multi-label-categories-design.md`

## Global Constraints

- 纯前端单文件，**不引入构建步骤、不引入任何 npm 依赖、不创建 `package.json`**。`tools/` 只用 Node 22 内置模块。
- 分类标签是封闭列表，顺序固定：`名词` `动词` `形容词` `虚词` `高频` `工作` `教会` `生活` `辨音` `其他`。
- `c` 是非空字符串数组，元素取自上表且不重复。`其他` 不与任何其他标签共存。
- 词性组（名词/动词/形容词/虚词）每张卡**恰好一个**。
- `der` 最多 **4** 条。`der[].ex` 不带竖线。
- `ex` 格式 `印尼语|中文`，恰好一个竖线，两侧非空，印尼语半边含 `w` 或某个 `der[].w`。
- **构成式不上卡**：任何字段都不得出现 `ber- + ajar`、`meN-…-kan`、`ke-…-an`。教构词规律用真实词形。
- **只改硬错误，用户写的其余内容一律保留。**
- 测试命令是 `node --test tools/*.test.mjs`（裸目录形式在本机 Node 上失败）。
- git commit message 用正常英文。

---

### Task 1: 校验脚本收多标签与新上限

**Files:**
- Modify: `tools/check-data.mjs`
- Modify: `tools/check-data.test.mjs`

**Interfaces:**
- Produces: `CATS`（导出的十标签常量数组，供后续任务与脚本引用）；`validateCard` 对 `c` 的新规则；`der` 上限 4

- [ ] **Step 1: 写失败的测试**

在 `tools/check-data.test.mjs` 的 import 行加入 `CATS`，并追加：

```js
test("CATS 是十个标签，顺序固定", () => {
  assert.deepEqual(CATS, ["名词","动词","形容词","虚词","高频","工作","教会","生活","辨音","其他"]);
});

test("c 是合法数组时零错误", () => {
  assert.deepEqual(validateCard({ ...goodRoot, c: ["动词","教会"] }, "#1"), []);
});

test("c 是字符串报错", () => {
  const errs = validateCard({ ...goodRoot, c: "教会" }, "#1");
  assert.equal(errs.filter(e => /c 必须是非空数组/.test(e)).length, 1);
});

test("c 是空数组报错", () => {
  const errs = validateCard({ ...goodRoot, c: [] }, "#1");
  assert.equal(errs.filter(e => /c 必须是非空数组/.test(e)).length, 1);
});

test("c 含表外值报错", () => {
  const errs = validateCard({ ...goodRoot, c: ["动词","地形"] }, "#1");
  assert.equal(errs.filter(e => /不在分类表内/.test(e)).length, 1);
});

test("c 有重复值报错", () => {
  const errs = validateCard({ ...goodRoot, c: ["动词","动词"] }, "#1");
  assert.equal(errs.filter(e => /重复/.test(e)).length, 1);
});

test("其他 与别的标签共存报错", () => {
  const errs = validateCard({ ...goodRoot, c: ["动词","其他"] }, "#1");
  assert.equal(errs.filter(e => /其他.*不能与/.test(e)).length, 1);
});

test("只有 其他 一个标签合法", () => {
  assert.deepEqual(validateCard({ ...goodRoot, c: ["其他"] }, "#1"), []);
});

test("der 4 条合法，5 条报错", () => {
  const four = [
    { w: "mengajar", zh: "教", ex: "mengajar di sekolah 在学校教书" },
    { w: "ajaran", zh: "教义", ex: "ajaran sesat 异端" },
    { w: "pelajar", zh: "学生", ex: "pelajar SMA 高中生" },
    { w: "pelajaran", zh: "功课", ex: "pelajaran hari ini 今天的功课" }
  ];
  assert.deepEqual(validateCard({ ...goodRoot, c: ["动词","教会"], der: four }, "#1"), []);
  const five = [...four, { w: "pengajar", zh: "教师", ex: "pengajar sekolah minggu 主日学老师" }];
  const errs = validateCard({ ...goodRoot, c: ["动词","教会"], der: five }, "#1");
  assert.equal(errs.filter(e => /der 最多 4 条/.test(e)).length, 1);
});
```

同时把测试文件顶部 `goodRoot` 和 `goodPhrase` 的 `c` 从字符串改成数组：`c: ["动词","教会"]` 和 `c: ["名词","生活"]`。

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tools/*.test.mjs`
Expected: FAIL，`CATS` 未导出，且 `c` 数组被旧的 `needText` 判为「字段 c 缺失或为空」

- [ ] **Step 3: 改实现**

在 `tools/check-data.mjs` 顶部常量区加：

```js
export const CATS = ["名词","动词","形容词","虚词","高频","工作","教会","生活","辨音","其他"];
const CAT_SET = new Set(CATS);
```

把 `validateCard` 里的这一行：

```js
  for (const f of ["w", "p", "zh", "c", "ex"]) needText(card, f, errs, where);
```

改成：

```js
  for (const f of ["w", "p", "zh", "ex"]) needText(card, f, errs, where);
  if (!Array.isArray(card.c) || card.c.length === 0) {
    errs.push(`${where}：c 必须是非空数组`);
  } else {
    const seen = new Set();
    for (const v of card.c) {
      if (!CAT_SET.has(v)) errs.push(`${where}：分类 ${JSON.stringify(v)} 不在分类表内`);
      if (seen.has(v)) errs.push(`${where}：分类 ${v} 重复`);
      seen.add(v);
    }
    if (card.c.includes("其他") && card.c.length > 1) {
      errs.push(`${where}：其他 是兜底标签，不能与别的标签共存`);
    }
  }
```

把 der 上限那一行：

```js
      if (der.length > 2) errs.push(`${where}：der 最多 2 条，实际 ${der.length} 条`);
```

改成：

```js
      if (der.length > 4) errs.push(`${where}：der 最多 4 条，实际 ${der.length} 条`);
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tools/*.test.mjs`
Expected: PASS，33 个 test 全绿（原 24 + 新 9）

- [ ] **Step 5: 确认 CLI 对当前词库报错**

Run: `node tools/check-data.mjs; echo "exit=$?"`
Expected: 312 条 `c 必须是非空数组`，`exit=1`。这是正确的——词库还没改成数组。

- [ ] **Step 6: 提交**

```bash
git add tools/check-data.mjs tools/check-data.test.mjs
git commit -m "Accept a category set per card and raise the derived-word cap

Categories become a closed list of ten labels applied as an array, so a
card can be both a noun and a church word. 其他 is a fallback and cannot
share a card with a real label. The derived-word cap rises to four."
```

---

### Task 2: 应用层——删类型筛选、标签命中、两栏衍生词

**Files:**
- Modify: `index.html:147-150`（`.der` 样式改网格）
- Modify: `index.html:243`（删 `#types` 容器）
- Modify: `index.html:1716-1717`（删 `let type`）
- Modify: `index.html:1784-1815`（删 `TYPE_LABEL`/`inType`/`types`，改 `inCat`/`cats`/`filter`）
- Modify: `index.html:1822`（空状态 scope）
- Modify: `index.html:1840-1841`（`tagF`/`tagB` 显示数组）
- Modify: `index.html:1849-1851`（衍生词区包一层网格容器）
- Modify: `index.html:1933`（初始化调用）

**Interfaces:**
- Consumes: Task 1 的 `CATS` 顺序（应用内需重复一份同样的十标签数组——`index.html` 是独立单文件，不能 import `tools/`，与既有的 `cardId` 双份实现同理）
- Produces: `CATS` 常量、`inCat(d)` 按标签命中、`.der-grid` 布局

- [ ] **Step 1: 衍生词区改两栏网格**

把第 147-150 行的 `.der` 四条规则替换为：

```css
  .der-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0 14px; }
  .der { padding: 9px 0; border-top: 1px solid var(--paper-2); font-size: 14px; line-height: 1.5; }
  .der .dw { display: block; font-weight: 600; color: var(--ink); word-break: break-word; }
  .der .dz { display: block; color: var(--ink); }
  .der .dx { display: block; margin-top: 2px; font-size: 12.5px; color: var(--moss); }
```

`auto-fit` + `minmax(150px, 1fr)` 让窄视口自动落回单栏，不写死两栏也不需要媒体查询。词形从原来的左侧固定宽改成独占一行——两栏下横向空间只有一半，并排放不下。

- [ ] **Step 2: 删类型筛选行的容器**

第 243 行：

```html
  <div class="controls" id="types"></div>
```

整行删除。保留下一行的 `#cats`。

- [ ] **Step 3: 删 `type` 状态**

第 1717 行 `let type = "全部";` 整行删除。

- [ ] **Step 4: 重写筛选**

把第 1784-1815 行（从 `const TYPE_LABEL` 到 `filter()` 结束）整块替换为：

```js
const CATS = ["名词","动词","形容词","虚词","高频","工作","教会","生活","辨音","其他"];

function inCat(d){ return cat === "全部" || d.c.includes(cat); }

function cats(){
  $("cats").innerHTML = ["全部", ...CATS].map(c=>{
    const n = c === "全部" ? DATA.length : DATA.filter(d=>d.c.includes(c)).length;
    return `<button class="chip ${c===cat?'on':''}" data-c="${c}">${c} ${n}</button>`;
  }).join("");
  $("cats").querySelectorAll(".chip").forEach(b=>{
    b.onclick = ()=>{ cat = b.dataset.c; filter(); cats(); };
  });
}

function filter(){
  view = deck.filter(d => inCat(d) && !known.has(d.id));
  idx = 0; render();
}
```

分类 chip 的列表改成固定十个，不再从 `DATA` 动态推——顺序是设计的一部分，计数为 0 的标签也保持可见可点。

- [ ] **Step 5: 空状态去掉 type 拼接**

在 `render()` 的空状态分支里，把：

```js
    const scope = type === "全部" ? cat : `${TYPE_LABEL[type]} · ${cat}`;
    $("tagF").textContent = scope;
    $("tagB").textContent = scope;
```

改成：

```js
    $("tagF").textContent = cat;
    $("tagB").textContent = cat;
```

同一分支里 `const inScope = deck.some(d => inCat(d) && inType(d));` 改成 `const inScope = deck.some(inCat);`

- [ ] **Step 6: 卡面标签显示数组**

把：

```js
  $("tagF").textContent = d.c;
  $("tagB").textContent = d.c;
```

改成：

```js
  const tag = d.c.slice(0, 2).join(" · ");
  $("tagF").textContent = tag;
  $("tagB").textContent = tag;
```

- [ ] **Step 7: 衍生词包进网格容器**

把 `render()` 里的衍生词拼接：

```js
      + (d.der || []).map(x =>
          `<div class="der"><span class="dw">${x.w}</span><span class="dz">${x.zh}<span class="dx">${x.ex}</span></span></div>`
        ).join("")
```

改成：

```js
      + ((d.der || []).length
          ? `<div class="der-grid">` + d.der.map(x =>
              `<div class="der"><span class="dw">${x.w}</span><span class="dz">${x.zh}</span><span class="dx">${x.ex}</span></div>`
            ).join("") + `</div>`
          : "")
```

注意 `dz` 和 `dx` 从嵌套改成平级——两栏下三者各占一行。

- [ ] **Step 8: 初始化去掉 `types()`**

第 1933 行 `types(); cats(); filter();` 改成 `cats(); filter();`

- [ ] **Step 9: 手改三张卡验证通路**

把 `DATA` 里的 `root:ajar`、`root:musik`、`phrase:air-terjun` 三张卡的 `c` 改成数组，并给 `ajar` 补满 4 个衍生词：

```js
 {t:"root",w:"ajar",pos:"动词根（不单用）",p:"a-jar 阿-乍",zh:"教导",c:["动词","教会"],
  der:[{w:"mengajar",zh:"教、授课",ex:"mengajar di sekolah 在学校教书"},
       {w:"ajaran",zh:"教义、道理",ex:"ajaran sesat 异端"},
       {w:"pelajar",zh:"学生",ex:"pelajar SMA 高中生"},
       {w:"pelajaran",zh:"功课、课程",ex:"pelajaran hari ini 今天的功课"}],
```

`musik` 的 `c` 改 `["名词","教会"]`，`air terjun` 的改 `["名词","生活"]`。其余 309 张先不动。

- [ ] **Step 10: 校验（此时应只剩未迁移卡片的错误）**

Run: `node tools/check-data.mjs 2>&1 | tail -3`
Expected: 309 条 `c 必须是非空数组`（三张手改的不再报错）

Run: `node --test tools/*.test.mjs`
Expected: 33/33 通过

- [ ] **Step 11: 浏览器验证**

Run: `python3 -m http.server 8000`（后台），用 playwright-core + 缓存的 Chromium 驱动（MCP Playwright 的 chrome 二进制在本机缺失；既有做法见 `.superpowers/sdd/2026-08-07-root-card-redesign/task-3-report.md`）。

逐项确认：

- 顶部只剩一行分类标签，十个 + 「全部」，顺序为 名词/动词/形容词/虚词/高频/工作/教会/生活/辨音/其他
- 点「动词」只剩 `ajar`；点「名词」剩 `musik` 和 `air terjun`；点计数为 0 的标签显示「这个组合下没有卡片」
- `ajar` 背面：词性行 → 4 条衍生词排成两栏两行 → 辨析 → 例句；辨析和例句各占整行
- 在 390×844 窄视口下衍生词自动落回单栏，卡片不横向滚动、不裁切
- 卡面标签显示 `动词 · 教会`
- 翻面、上一张下一张、打乱、记住了、清空进度均正常

- [ ] **Step 12: 提交**

```bash
git add index.html
git commit -m "Filter by category set and lay derived words out in two columns

The root/phrase filter row is gone; the type still drives which template
renders a card back, but it is no longer something to filter on. Category
chips now come from the fixed ten-label list rather than from whatever the
deck happens to contain, so the order is stable and an empty label stays
clickable. Derived words sit in an auto-fitting grid that falls back to
one column on a narrow viewport."
```

---

### Task 3: 机械重打标签

312 张里绝大部分的新标签能从现有 `pos` 与 `c` 推出来。这一步用脚本批改能确定的部分，把需要判断的挑出来留给 Task 4。

**Files:**
- Create: `tools/retag.mjs`（一次性迁移脚本，本任务后删除）
- Modify: `index.html`（`DATA` 的 `c` 字段）

**Interfaces:**
- Consumes: Task 1 的 `CATS`、Task 2 定下的数组格式
- Produces: 全部 312 张的 `c` 已是数组；需人工判断的清单写到 `.superpowers/sdd/2026-08-11-multi-label-categories/needs-judgment.md`

- [ ] **Step 1: 写迁移脚本**

创建 `tools/retag.mjs`：

```js
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
```

- [ ] **Step 2: 跑脚本**

Run: `mkdir -p .superpowers/sdd/2026-08-11-multi-label-categories && node tools/retag.mjs`
Expected: 打印两个数字，并生成 `needs-judgment.md`

若「已改写」少于「可机械判定」，说明正则没匹配上某些卡（`c` 不在同一行、或词形含正则元字符）——逐个查出来手改，不要放过差额。

- [ ] **Step 3: 校验**

Run: `node tools/check-data.mjs 2>&1 | tail -3`
Expected: 剩余错误数 = Task 3 判定为「需人工」的张数（那些卡的 `c` 还是字符串）

Run: `node --test tools/*.test.mjs`
Expected: 33/33

- [ ] **Step 4: 抽查 10 张**

从改过的卡里随机抽 10 张，逐张确认新标签合理：词性标签与 `pos` 一致，场景标签与旧分类一致，没有把 `词缀` 这类旧值漏成新标签。

- [ ] **Step 5: 提交**

```bash
git add index.html tools/retag.mjs .superpowers 2>/dev/null; git add index.html tools/retag.mjs
git commit -m "Derive the mechanical part of every card's category set

A root card's word-class label follows from the part of speech it already
carries, and the four context labels that survive the redesign carry over
unchanged. What is left needs a human: phrase cards have no part of speech,
and the retired categories have no mechanical destination."
```

---

### Task 4: 人工判定剩余分类

**Files:**
- Read: `.superpowers/sdd/2026-08-11-multi-label-categories/needs-judgment.md`
- Modify: `index.html`（剩余卡片的 `c`）
- Delete: `tools/retag.mjs`（一次性脚本，用完即删）

**Interfaces:**
- Consumes: Task 3 产出的清单
- Produces: 312 张的 `c` 全部合法

- [ ] **Step 1: 读清单**

读 `needs-judgment.md`。两类：**79 张词组卡**（没有 `pos`，词性标签要按词组整体判）和**旧分类无对应的词根卡**（口语/语法/动作/地形/身体/学习/正式/形容词）。

- [ ] **Step 2: 逐张判定并改写**

词性标签按词组**整体**的词性给：

| 词组 | 释义 | 词性标签 |
|---|---|---|
| `air terjun` | 瀑布 | 名词 |
| `menyangkal diri` | 舍己 | 动词 |
| `berat hati` | 不情愿 | 形容词 |
| `oleh karena itu` | 因此 | 虚词 |

场景标签按**这个词什么时候用得着**给，判不出来就不给——只有词性标签是允许的，不必强行凑。旧分类的去向参考：

- `口语` / `语法` → 多为高频虚词，`["虚词","高频"]`
- `地形`（bukit / lereng / jurang）→ `名词`，场景看例句落在教会还是生活
- `身体`（badan / lemas）→ `名词` 或 `形容词` + `生活`
- `学习`（kosakata）→ `名词` + `高频`
- `动作` → 对应词性 + 场景
- `正式` → 对应词性，场景按实际用处
- 旧 `形容词` 分类 → 词性标签 `形容词`，场景另判

词性组每张卡**恰好一个**。词性和场景都安不上的给 `["其他"]`，且不与别的标签共存。

- [ ] **Step 3: 校验**

Run: `node tools/check-data.mjs`
Expected: `OK：312 张卡片全部通过校验`，零提示

Run: `node --test tools/*.test.mjs`
Expected: 33/33

- [ ] **Step 4: 打印标签分布复核**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8"));
  m.CATS.forEach(c => console.log(c.padEnd(4), d.filter(x => x.c.includes(c)).length));
  const noPos = d.filter(x => !x.c.some(c => ["名词","动词","形容词","虚词"].includes(c)) && !x.c.includes("其他"));
  console.log("缺词性标签且非其他：", noPos.map(x => x.w).join(" ") || "无");
  const multi = d.filter(x => x.c.filter(c => ["名词","动词","形容词","虚词"].includes(c)).length > 1);
  console.log("多个词性标签：", multi.map(x => `${x.w}(${x.c.join("/")})`).join(" ") || "无");
});'
```

Expected: 十个标签各有计数；「缺词性标签且非其他」为空；「多个词性标签」为空或极少数刻意为之的（`pos` 是 `名词·形容词` 这类复合的）。`其他` 的数量应当很小——它是兜底不是垃圾桶，超过 20 张就回头看是不是判懒了。

- [ ] **Step 5: 删迁移脚本**

Run: `git rm tools/retag.mjs`

- [ ] **Step 6: 提交**

```bash
git add index.html
git commit -m "Label the cards no rule could reach

Phrase cards get the word class of the phrase as a whole, so filtering
for nouns turns up air terjun beside bukit. The retired categories are
resolved one card at a time; where neither a word class nor a context
fits, 其他 carries it alone."
```

---

### Task 5: 补衍生词（前半，词根卡 1-116）

上限提到 4 之后，111 张放满 2 条的卡与部分只有 1 条的卡值得回头补。这一步覆盖 `DATA` 里前 116 张词根卡。

**Files:**
- Modify: `index.html`（词根卡的 `der` 与 `syn`）

**Interfaces:**
- Consumes: Task 1 的 der 上限 4、Task 2 的两栏渲染
- Produces: 前半词根卡的 `der` 已按新上限补充

- [ ] **Step 1: 列出本批卡片**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8")).filter(x => x.t === "root");
  d.slice(0, 116).forEach((c, i) => console.log(`${i+1}\t${c.w}\t${(c.der||[]).length}\t${c.zh}`));
});'
```

- [ ] **Step 2: 逐张判断能否补**

对每张卡，问：**这个词根还有没有第 3、第 4 个值得背的衍生词？**

选取判据（沿用上一轮，不变）：

1. 用户实际语境（教会讲道、印尼工厂采购、日常生活）里频率高的优先
2. 与词根本义**偏离最大**的优先——偏离小的能猜出来，不值得占位
3. 优先补**不同词缀家族**的（已有 `meN-` 动词和 `pe-/-an` 名词时，补 `ber-` 或 `ter-` 形）
4. 已经独立成词、词典单列词条的优先

补进来的每条都要 `w`/`zh`/`ex` 齐全，`ex` 是词组或短例句、**不带竖线**。

**不必凑满 4 个。** 外来词、虚词、本来就不派生的词根保持 `der:[]`。还常用但排不进 4 个的，在 `syn` 里提一句；不常见的直接略过。

**已有的 der 条目不要动**——它们是上一轮按重要度选定的，本步只做追加。

- [ ] **Step 3: 校验**

Run: `node tools/check-data.mjs`
Expected: `OK：312 张卡片全部通过校验`，零提示

若出现 `der 最多 4 条` 报错，说明某张补过头了，删掉最弱的一条。

- [ ] **Step 4: 浏览器抽查 5 张**

挑本批里补到 4 条的 5 张，在桌面与 390×844 两个视口确认：两栏排布正常、不裁切、不横向滚动、辨析与例句仍占整行。

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "Add third and fourth derived words to the first half of the roots"
```

---

### Task 6: 补衍生词（后半，词根卡 117 起）

**Files:**
- Modify: `index.html`（词根卡的 `der` 与 `syn`）

**Interfaces:**
- Consumes: Task 1 的 der 上限 4、Task 2 的两栏渲染
- Produces: 全部词根卡的 `der` 已按新上限补充

- [ ] **Step 1: 列出本批卡片**

Run:

```bash
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8")).filter(x => x.t === "root");
  d.slice(116).forEach((c, i) => console.log(`${i+117}\t${c.w}\t${(c.der||[]).length}\t${c.zh}`));
});'
```

- [ ] **Step 2: 逐张判断能否补**

判据与 Task 5 Step 2 逐字相同：

1. 用户实际语境（教会讲道、印尼工厂采购、日常生活）里频率高的优先
2. 与词根本义**偏离最大**的优先
3. 优先补**不同词缀家族**的
4. 已经独立成词、词典单列词条的优先

补进来的每条 `w`/`zh`/`ex` 齐全，`ex` 不带竖线。不必凑满 4 个。已有的 der 条目不要动。

- [ ] **Step 3: 校验**

Run: `node tools/check-data.mjs`
Expected: `OK：312 张卡片全部通过校验`，零提示

- [ ] **Step 4: 浏览器抽查 5 张**

同 Task 5 Step 4。

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "Add third and fourth derived words to the remaining roots"
```

---

### Task 7: 收尾——README、全库复核、完整手测

**Files:**
- Modify: `README.md`
- Read: `index.html`

**Interfaces:**
- Consumes: 前六个任务的全部产出
- Produces: 可发布状态

- [ ] **Step 1: 更新 README**

「怎么用」一节里描述筛选的那一行，改成：

```markdown
- 顶部一行标签按分类筛选，一张卡可以带多个分类（比如 bumi 同时是「名词」和「教会」）
```

删掉描述类型筛选行的内容（如果有）。词根卡背面的描述改成「词性、最多 4 个重要衍生词（各配一个用例）、辨析和例句」。

- [ ] **Step 2: 全库复核**

Run:

```bash
node tools/check-data.mjs
node --test tools/*.test.mjs
node -e '
import("./tools/check-data.mjs").then(async m => {
  const { readFileSync } = await import("node:fs");
  const d = m.extractData(readFileSync("index.html", "utf8"));
  m.CATS.forEach(c => console.log(c.padEnd(4), d.filter(x => x.c.includes(c)).length));
  const r = d.filter(x => x.t === "root");
  [0,1,2,3,4].forEach(k => console.log(`der ${k} 条: ${r.filter(x => (x.der||[]).length === k).length} 张`));
});'
```

Expected: 312 张零错误零提示；33/33；十个标签计数打印；der 分布中 3、4 条的卡片数量明显大于零（否则 Task 5/6 白做了，回头查）。

- [ ] **Step 3: 完整浏览器手测**

先在 Console 里 `localStorage.clear()` 再刷新，然后逐项确认：

- 顶部只有一行标签，十个 + 「全部」，顺序正确，计数与 Step 2 打印的一致
- 逐个点十个标签，筛选结果正确；计数为 0 的标签点下去显示「这个组合下没有卡片」
- 从头翻到尾无 Console 报错，随机抽 15 张看背面
- 补到 4 条衍生词的卡在桌面与 390×844 都不裁切、不横向滚动
- ⇄ 打乱、「记住了」→ 刷新 → 进度还在、「已掌握列表」能看能移出、「清空进度」能清干净
- 同步弹窗填一个新同步码能连上；另开一个浏览器上下文填同一个码，进度能同步

- [ ] **Step 4: 提交**

```bash
git add README.md
git commit -m "Describe the category set and the four-derivation card back"
```

---

## 自检记录

**Spec 覆盖：**

| 设计文档小节 | 对应任务 |
|---|---|
| 分类体系 · 十标签 | Task 1（`CATS` 与校验）、Task 2（筛选行） |
| 分类体系 · 词性标签怎么定 | Task 3（词根卡机械映射）、Task 4（词组卡人工判） |
| 分类体系 · 场景标签怎么定 | Task 3（228 张沿用）、Task 4（83 张人工判） |
| 分类体系 · 兜底规则 | Task 1（`其他` 互斥校验）、Task 4 Step 4（数量复核） |
| 数据模型改动 · `c` 数组 | Task 1、Task 3、Task 4 |
| 数据模型改动 · der 上限 4 | Task 1、Task 5、Task 6 |
| 卡片背面两栏 | Task 2 Step 1/7 |
| 筛选改动 | Task 2 Step 2/3/4/5/8 |
| 词库迁移 | Task 3、Task 4、Task 5、Task 6 |
| 测试 | 各任务的校验步 + Task 7 Step 2/3 |
| 分阶段 ①②③ | ①=Task 1/2，②=Task 3-6，③=桌面文档（已先行完成，见下） |

**与设计文档的一处偏离：** 设计文档把桌面《词库导出规则.md》列为阶段 3，本计划没有为它设任务——该文档已按新分类体系重写并落盘（用户要求精简为「给对话 AI 导词库用」的版本，删去全部设计理由）。Task 7 不需要再动它。

**类型一致性：** `CATS` 在 `tools/check-data.mjs`（Task 1 导出）和 `index.html`（Task 2 内联）各有一份，十个字符串与顺序必须逐字相同——与既有的 `cardId` 双份实现同理，原因也相同（单文件应用不能 import `tools/`）。`inCat(d)` 在 Task 2 定义后，Task 2 Step 5 的空状态分支与 `filter()` 共用。`extractData` / `validateCard` / `CATS` 的签名在 Task 1 定义，Task 3、4、7 的脚本只消费它们。
