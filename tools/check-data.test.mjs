import test from "node:test";
import assert from "node:assert/strict";
import { extractData, cardId, validateCard, validateDeck, lintDeck, CATS } from "./check-data.mjs";

const goodRoot = {
  t: "root", w: "ajar", pos: "动词根（不单用）", p: "a-jar 阿-乍",
  zh: "教导", c: ["动词","教会"],
  der: [
    { w: "mengajar", zh: "教、授课", ex: "mengajar di sekolah 在学校教书" },
    { w: "ajaran", zh: "教义、道理", ex: "ajaran sesat 异端" }
  ],
  syn: "belajar 学 / mengajar 教，一根两向",
  ex: "Yesus mengajar orang banyak.|耶稣教导众人。"
};

const goodPhrase = {
  t: "phrase", w: "air terjun", p: "a-ir ter-jun", zh: "瀑布", c: ["名词","生活"],
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

test("der 超过 4 条报错", () => {
  const der = [
    ...goodRoot.der,
    { w: "pelajar", zh: "学生", ex: "pelajar SMA 高中生" },
    { w: "pelajaran", zh: "功课", ex: "pelajaran hari ini 今天的功课" },
    { w: "pengajar", zh: "教师", ex: "pengajar sekolah minggu 主日学老师" }
  ];
  const errs = validateCard({ ...goodRoot, der }, "#1");
  assert.equal(errs.filter(e => /der 最多 4 条/.test(e)).length, 1);
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

test("lintDeck：ex 含 w 本身不报", () => {
  const card = { t: "root", w: "ajar", der: [], ex: "Yesus mengajar orang banyak.|耶稣教导众人。" };
  assert.deepEqual(lintDeck([card]), []);
});

test("lintDeck：ex 只含 der[].w 也不报（meN- 同化后词根本身不在句中）", () => {
  const card = {
    t: "root", w: "pasok",
    der: [{ w: "memasok", zh: "供应", ex: "memasok bahan baku 供应原料" }],
    ex: "Pabrik itu memasok kain ke banyak merek lokal.|那家工厂给很多本土品牌供应布料。"
  };
  assert.deepEqual(lintDeck([card]), []);
});

test("lintDeck：ex 既没有 w 也没有 der[].w 时报一条", () => {
  const card = { t: "root", w: "metode", der: [], ex: "Bagaimana cara berdoa yang benar?|正确祷告的方式是什么？" };
  const warnings = lintDeck([card]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /metode/);
});

test("lintDeck：大小写不敏感匹配", () => {
  const card = { t: "root", w: "Bapa", der: [], ex: "Bapa kami yang di sorga.|我们在天上的父。" };
  assert.deepEqual(lintDeck([card]), []);
  const card2 = { t: "root", w: "bapa", der: [], ex: "BAPA kami yang di sorga.|我们在天上的父。" };
  assert.deepEqual(lintDeck([card2]), []);
});

test("lintDeck：只在中文半边出现不算命中，仍要报", () => {
  const card = { t: "root", w: "metode", der: [], ex: "Bagaimana cara berdoa yang benar?|正确的方法是什么，metode 是什么？" };
  const warnings = lintDeck([card]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /metode/);
});

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
