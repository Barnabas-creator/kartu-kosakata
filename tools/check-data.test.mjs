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
