# 圣经词根：AYT 全文分词 → 剔除专名（大写出现占七成以上的词，如 Habel、Yerusalem）
# → Sastrawi 还原词根 → 只收词根表里有的 → 按圣经内累计频次排序。
import collections, glob, re
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
roots = set(l.strip() for l in open('kata-dasar.txt') if l.strip())
stem = StemmerFactory().create_stemmer().stem
cap = collections.Counter(); tot = collections.Counter()
for f in sorted(glob.glob('ayt/indayt_*_read.txt')):
    if '_000_' in f: continue
    for line in open(f, encoding='utf-8-sig').read().split('\n')[2:]:
        for i, w in enumerate(re.findall(r"[A-Za-z]+(?:-[A-Za-z]+)*", line)):
            lw = w.lower(); tot[lw] += 1
            if w[0].isupper() and w != 'TUHAN': cap[lw] += 1
score = collections.Counter(); forms = collections.defaultdict(list)
for w, n in tot.items():
    if len(w) < 2 or cap[w] / n > 0.7: continue
    r = stem(w)
    if r in roots and len(r) >= 2:
        score[r] += n; forms[r].append(w)
with open('bible-roots-ranked.tsv', 'w') as f:
    for r, n in score.most_common():
        f.write(f"{r}\t{n}\t{','.join(sorted(forms[r], key=lambda x: -tot[x])[:6])}\n")
print(len(score))
