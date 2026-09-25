# 用 Sastrawi 把词频表里每个词还原成词根，按词根累计频次排序。
# 只收 Sastrawi 词根表里有的词根，过滤掉人名、口语缩写等噪音。
import collections
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
roots = set(l.strip() for l in open('kata-dasar.txt') if l.strip())
stem = StemmerFactory().create_stemmer().stem
score = collections.Counter(); forms = collections.defaultdict(list)
for line in open('id_50k.txt'):
    w, n = line.split()
    if not w.isalpha() or len(w) < 2: continue
    r = stem(w)
    if r in roots and len(r) >= 2:
        score[r] += int(n); forms[r].append(w)
with open('roots-ranked.tsv', 'w') as f:
    for r, n in score.most_common():
        f.write(f"{r}\t{n}\t{','.join(forms[r][:6])}\n")
print(len(score))
