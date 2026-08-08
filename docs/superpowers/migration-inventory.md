# 词库迁移清册

271 条原卡的逐条处置。五个迁移批次都以这张表为准，不要在批次里临时改判——
要改先改这张表。

## 处置类型

- `新建词根卡` — 原卡本身就是词根，直接转 `t:"root"`
- `并入 <词根>` — 原卡是派生词，降级成目标词根卡的一条 `der`
- `新建词组卡` — 原卡本身就是固定搭配，转 `t:"phrase"`
- `抽出词组卡：<词组>` — 原卡的 `coll` 和 `syn` 里够格的固定搭配，另立词组卡（可多个）。
  `syn` 是辨析散文，固定搭配埋在句子里，是读出来的、不是按分隔符切出来的。
  本表把这一项记在最后一列「抽出的词组卡」里：只写词组本身，多个用 ` / ` 分隔；
  同一个词组已被别的行立过时写成 `air terjun（已由 #13 立）`，不重复立卡。
- `丢弃` — 与其他卡完全重叠，无独立价值（本轮没有用到这一类）

## 列的读法

- **目标词根** — 该行最终落到哪张卡上。`新建词根卡` 行填词根本身；`并入` 行填目标词根，
  后面用 `（补建）` 标出「原库里没有这个裸词根的卡，需要新建，`p`/`zh`/`ex` 要现写，
  不能从本行原卡照抄」，用 `（#N）` 标出目标词根来自哪张原卡；
  `新建词组卡` 行填词组本身。
- **词性** — 只有 `新建词根卡` 行填，取值见设计文档《词性标注表》。
- **拟选 der** — 只有 `新建词根卡` 行填，最多 2 个。落选的派生词写在括号里，
  标明降级到 `syn`。`并入` 行一律 `—`，它的去向看目标词根那一行。
- **抽出的词组卡** — 见上方 `抽出词组卡：<词组>`。

补建的词根卡（原库无对应条目的裸词根）不占本表的行，单列在下面《补建的词根卡》一节，
本表始终是 271 行、一行一条原卡、保持原始顺序。

## 清册

| # | 原词形 | 分类 | 处置 | 目标词根 | 词性 | 拟选 der | 抽出的词组卡 |
|---|---|---|---|---|---|---|---|
| 1 | musik | 教会 | 新建词根卡 | musik | 名词 | —（外来词） | alat musik / musik rohani |
| 2 | lalu | 语法 | 新建词根卡 | lalu | 副词·连词 | — | minggu lalu |
| 3 | kali terakhir | 高频 | 新建词组卡 | kali terakhir | — | — | — |
| 4 | diam | 高频 | 新建词根卡 | diam | 动词根 | berdiam（居留、静处） | — |
| 5 | demi | 正式 | 新建词根卡 | demi | 介词 | — | satu demi satu / hari demi hari |
| 6 | mengatakan | 高频 | 并入 kata | kata（补建） | — | — | — |
| 7 | mengusir | 教会 | 并入 usir | usir（补建） | — | — | — |
| 8 | lereng | 地形 | 新建词根卡 | lereng | 名词 | — | — |
| 9 | bukit | 地形 | 新建词根卡 | bukit | 名词 | — | Khotbah di Bukit |
| 10 | sejumlah | 高频 | 并入 jumlah | jumlah（补建） | — | — | — |
| 11 | suruhlah | 语法 | 并入 suruh | suruh（补建） | — | — | — |
| 12 | mengabulkan | 教会 | 并入 kabul | kabul（补建） | — | — | — |
| 13 | terjun | 动作 | 新建词根卡 | terjun | 动词根 | — | air terjun / terjun payung |
| 14 | tepi | 地形 | 新建词根卡 | tepi | 名词 | — | — |
| 15 | jurang | 地形 | 新建词根卡 | jurang | 名词 | — | jurang pemisah |
| 16 | lemas | 身体 | 新建词根卡 | lemas | 形容词 | — | mati lemas |
| 17 | menceritakan | 词缀 | 并入 cerita | cerita（#115） | — | — | — |
| 18 | mendesak | 高频 | 并入 desak | desak（补建） | — | — | — |
| 19 | menghitung | 高频 | 并入 hitung | hitung（补建） | — | — | — |
| 20 | bumi | 教会 | 新建词根卡 | bumi | 名词 | — | gempa bumi |
| 21 | marah | 高频 | 新建词根卡 | marah | 形容词 | memarahi（责骂）/ kemarahan（愤怒） | — |
| 22 | pabrik | 工作 | 新建词根卡 | pabrik | 名词 | —（外来词） | — |
| 23 | pemasok | 工作 | 并入 pasok | pasok（补建） | — | — | — |
| 24 | berat | 辨音 | 新建词根卡 | berat | 形容词 | — | berat hati（已由 #62 立） |
| 25 | dosa | 教会 | 新建词根卡 | dosa | 名词 | berdosa（有罪的） | — |
| 26 | kosakata | 学习 | 新建词根卡 | kosakata | 名词 | — | — |
| 27 | metode | 高频 | 新建词根卡 | metode | 名词 | —（外来词） | — |
| 28 | sejak | 高频 | 新建词根卡 | sejak | 介词 | — | — |
| 29 | begini | 口语 | 新建词根卡 | begini | 副词 | — | kalau begitu |
| 30 | bareng | 口语 | 新建词根卡 | bareng | 副词 | barengan（一块儿） | — |
| 31 | yuk | 口语 | 新建词根卡 | yuk | 副词 | — | — |
| 32 | urutan | 高频 | 并入 urut | urut（补建） | — | — | — |
| 33 | revisi | 工作 | 新建词根卡 | revisi | 名词 | merevisi（修订） | — |
| 34 | berharap | 教会 | 并入 harap | harap（补建） | — | — | — |
| 35 | mendoakan | 教会 | 并入 doa | doa（补建） | — | — | — |
| 36 | melompat | 动作 | 并入 lompat | lompat（补建） | — | — | — |
| 37 | menyanyikan | 教会 | 并入 nyanyi | nyanyi（补建） | — | — | — |
| 38 | Bapa | 教会 | 新建词根卡 | Bapa | 名词 | — | — |
| 39 | tebu | 生活 | 新建词根卡 | tebu | 名词 | — | — |
| 40 | menebus | 教会 | 并入 tebus | tebus（补建） | — | — | — |
| 41 | harus | 语法 | 新建词根卡 | harus | 副词 | seharusnya（本应该，含遗憾） | — |
| 42 | sebaiknya | 语法 | 并入 baik | baik（补建） | — | — | — |
| 43 | hanya | 口语 | 新建词根卡 | hanya | 副词 | — | — |
| 44 | kendala | 工作 | 新建词根卡 | kendala | 名词 | terkendala（受阻） | — |
| 45 | kehendak | 教会 | 并入 hendak | hendak（补建） | — | — | — |
| 46 | peringatan | 教会 | 并入 ingat | ingat（补建） | — | — | — |
| 47 | meningkat | 高频 | 并入 tingkat | tingkat（补建） | — | — | — |
| 48 | perintah | 教会 | 新建词根卡 | perintah | 名词 | memerintah（统治）/ pemerintahan（治理、政权）（落选：pemerintah 政府，降级到 syn） | Sepuluh Perintah Allah |
| 49 | angin | 生活 | 新建词根卡 | angin | 名词 | — | masuk angin |
| 50 | puncak | 地形 | 新建词根卡 | puncak | 名词 | memuncak（达到顶点） | — |
| 51 | dingin | 辨音 | 新建词根卡 | dingin | 形容词 | kedinginan（冷得受不了） | — |
| 52 | ingin | 辨音 | 新建词根卡 | ingin | 动词根 | keinginan（愿望） | keinginan daging |
| 53 | mungkin | 辨音 | 新建词根卡 | mungkin | 副词 | kemungkinan（可能性） | — |
| 54 | bening | 形容词 | 新建词根卡 | bening | 形容词 | — | — |
| 55 | lirik | 教会 | 新建词根卡 | lirik | 名词 | —（外来词） | — |
| 56 | bait | 教会 | 新建词根卡 | bait | 名词 | — | — |
| 57 | himne | 教会 | 新建词根卡 | himne | 名词 | —（外来词） | — |
| 58 | poster | 工作 | 新建词根卡 | poster | 名词 | —（外来词） | warta jemaat |
| 59 | disebarkan | 动作 | 并入 sebar | sebar（补建） | — | — | — |
| 60 | buku harian | 学习 | 新建词组卡 | buku harian | — | — | — |
| 61 | penutupan | 教会 | 并入 tutup | tutup（补建） | — | — | — |
| 62 | berat hati | 高频 | 新建词组卡 | berat hati | — | — | — |
| 63 | kangen | 口语 | 新建词根卡 | kangen | 动词根 | — | — |
| 64 | bertumbuh | 教会 | 并入 tumbuh | tumbuh（补建） | — | — | — |
| 65 | merintis | 教会 | 并入 rintis | rintis（补建） | — | — | menanam gereja |
| 66 | menginjili | 教会 | 并入 Injil | Injil（补建） | — | — | — |
| 67 | menikmati | 高频 | 并入 nikmat | nikmat（补建） | — | — | — |
| 68 | kebersamaan | 教会 | 并入 sama | sama（#178） | — | — | — |
| 69 | samping | 高频 | 新建词根卡 | samping | 名词 | — | di samping itu |
| 70 | polsek | 生活 | 新建词根卡 | polsek | 名词 | —（缩写词） | — |
| 71 | ada apa | 口语 | 新建词组卡 | ada apa | — | — | — |
| 72 | apa saja | 口语 | 新建词组卡 | apa saja | — | — | — |
| 73 | toh | 口语 | 新建词根卡 | toh | 副词 | — | — |
| 74 | gak usah | 口语 | 新建词组卡 | gak usah | — | — | — |
| 75 | seandainya | 语法 | 并入 andai | andai（补建） | — | — | — |
| 76 | kebahagiaan | 形容词 | 并入 bahagia | bahagia（补建） | — | — | — |
| 77 | yaitu | 语法 | 新建词根卡 | yaitu | 连词 | — | — |
| 78 | tadi | 高频 | 新建词根卡 | tadi | 副词 | — | — |
| 79 | salah paham | 高频 | 新建词组卡 | salah paham | — | — | — |
| 80 | cuti | 工作 | 新建词根卡 | cuti | 名词 | — | — |
| 81 | bos | 工作 | 新建词根卡 | bos | 名词 | —（外来词） | — |
| 82 | darat | 地形 | 新建词根卡 | darat | 名词 | mendarat（着陆） | tanah air |
| 83 | pindah | 生活 | 新建词根卡 | pindah | 动词根 | memindahkan（把…搬走）/ perpindahan（迁移） | — |
| 84 | total | 高频 | 新建词根卡 | total | 名词 | —（外来词） | — |
| 85 | selain itu | 语法 | 新建词组卡 | selain itu | — | — | di samping itu（已由 #69 立） |
| 86 | mengerjakan | 工作 | 并入 kerja | kerja（补建） | — | — | — |
| 87 | kerasukan | 教会 | 并入 rasuk | rasuk（补建） | — | — | — |
| 88 | waras | 身体 | 新建词根卡 | waras | 形容词 | kewarasan（理智） | — |
| 89 | berkeliaran | 动作 | 并入 keliar | keliar（补建） | — | — | — |
| 90 | pekuburan | 地形 | 并入 kubur | kubur（补建） | — | — | — |
| 91 | memberitakan | 教会 | 并入 berita | berita（补建） | — | — | — |
| 92 | menular | 身体 | 并入 tular | tular（补建） | — | — | — |
| 93 | ditolak | 高频 | 并入 tolak | tolak（补建） | — | — | — |
| 94 | tersembunyi | 教会 | 并入 sembunyi | sembunyi（补建） | — | — | — |
| 95 | malah | 口语 | 新建词根卡 | malah | 副词 | — | — |
| 96 | mencapai | 高频 | 并入 capai | capai（补建） | — | — | — |
| 97 | mengikat | 动作 | 并入 ikat | ikat（补建） | — | — | — |
| 98 | memperbarui | 高频 | 并入 baru | baru（补建） | — | — | — |
| 99 | berkenan | 教会 | 并入 kenan | kenan（补建） | — | — | — |
| 100 | persoalan | 高频 | 并入 soal | soal（补建） | — | — | — |
| 101 | pemerintahan | 正式 | 并入 perintah | perintah（#48） | — | — | — |
| 102 | segenap | 教会 | 并入 genap | genap（补建） | — | — | — |
| 103 | mengucapkan | 高频 | 并入 ucap | ucap（补建） | — | — | — |
| 104 | bersalaman | 教会 | 并入 salam | salam（补建） | — | — | — |
| 105 | mencurahkan | 教会 | 并入 curah | curah（补建） | — | — | — |
| 106 | berkumpul | 教会 | 并入 kumpul | kumpul（补建） | — | — | — |
| 107 | beranda | 生活 | 新建词根卡 | beranda | 名词 | — | — |
| 108 | badan | 身体 | 新建词根卡 | badan | 名词 | — | badan usaha |
| 109 | tunjukkan | 高频 | 并入 tunjuk | tunjuk（补建） | — | — | — |
| 110 | terbiasa | 高频 | 并入 biasa | biasa（补建） | — | — | — |
| 111 | alasan | 高频 | 并入 alas | alas（补建） | — | — | — |
| 112 | sesuatu | 高频 | 并入 suatu | suatu（补建） | — | — | — |
| 113 | sebab | 语法 | 新建词根卡 | sebab | 连词 | — | oleh sebab itu / oleh karena itu |
| 114 | dibentuk | 教会 | 并入 bentuk | bentuk（补建） | — | — | — |
| 115 | cerita | 高频 | 新建词根卡 | cerita | 名词 | menceritakan（讲述、叙述）/ bercerita（讲故事） | panjang ceritanya |
| 116 | melarang | 高频 | 并入 larang | larang（补建） | — | — | — |
| 117 | membahas | 学习 | 并入 bahas | bahas（补建） | — | — | — |
| 118 | menjamah | 教会 | 并入 jamah | jamah（补建） | — | — | — |
| 119 | tersentuh | 高频 | 并入 sentuh | sentuh（补建） | — | — | — |
| 120 | dicemari | 词缀 | 并入 cemar | cemar（#188） | — | — | — |
| 121 | penampilan | 高频 | 并入 tampil | tampil（补建） | — | — | — |
| 122 | ciri | 高频 | 新建词根卡 | ciri | 名词 | — | — |
| 123 | sifat | 高频 | 新建词根卡 | sifat | 名词 | bersifat（具有…性质） | — |
| 124 | memburuk | 高频 | 并入 buruk | buruk（补建） | — | — | — |
| 125 | bertindak | 工作 | 并入 tindak | tindak（补建） | — | — | — |
| 126 | justru | 语法 | 新建词根卡 | justru | 副词 | — | — |
| 127 | menyerang | 动作 | 并入 serang | serang（补建） | — | — | serangan jantung |
| 128 | kendali | 高频 | 新建词根卡 | kendali | 名词 | mengendalikan（控制、克制）/ terkendali（受控的） | aman terkendali |
| 129 | perakitan | 工作 | 并入 rakit | rakit（补建） | — | — | — |
| 130 | khotbah | 教会 | 新建词根卡 | khotbah | 名词 | berkhotbah（讲道）/ pengkhotbah（讲道者） | — |
| 131 | memimpin | 教会 | 并入 pimpin | pimpin（补建） | — | — | membawakan acara |
| 132 | pasal | 教会 | 新建词根卡 | pasal | 名词 | — | Perjanjian Lama / Perjanjian Baru |
| 133 | cuaca | 生活 | 新建词根卡 | cuaca | 名词 | — | — |
| 134 | potong rambut | 生活 | 新建词组卡 | potong rambut | — | — | — |
| 135 | makan malam | 生活 | 新建词组卡 | makan malam | — | — | — |
| 136 | masuk kerja | 工作 | 新建词组卡 | masuk kerja | — | — | pulang kerja / keluar dari kerja |
| 137 | perasaan | 高频 | 并入 rasa | rasa（补建） | — | — | — |
| 138 | bunuh | 高频 | 新建词根卡 | bunuh | 动词根 | membunuh（杀害）/ pembunuhan（谋杀） | — |
| 139 | dukung | 高频 | 新建词根卡 | dukung | 动词根 | mendukung（支持）/ dukungan（支持，名词）（落选：pendukung 支持者，降级到 syn） | — |
| 140 | hormat | 高频 | 新建词根卡 | hormat | 动词根 | menghormati（尊敬）/ kehormatan（荣誉、尊严） | — |
| 141 | kalah | 高频 | 新建词根卡 | kalah | 动词根 | mengalahkan（战胜）/ kekalahan（失败） | — |
| 142 | boros | 生活 | 新建词根卡 | boros | 形容词 | memboroskan（浪费掉）/ pemboros（挥霍者） | — |
| 143 | pegang | 高频 | 新建词根卡 | pegang | 动词根 | memegang（握住、持守）/ berpegang（依靠、坚守）（落选：pegangan 扶手、依靠，降级到 syn） | — |
| 144 | sadar | 高频 | 新建词根卡 | sadar | 形容词 | menyadari（意识到）/ kesadaran（意识、觉悟） | — |
| 145 | tangkap | 高频 | 新建词根卡 | tangkap | 动词根 | menangkap（抓住、逮捕）/ tertangkap（被逮住）（落选：penangkapan 逮捕，降级到 syn） | — |
| 146 | tegur | 高频 | 新建词根卡 | tegur | 动词根 | menegur（责备、提醒）/ teguran（责备，名词） | menegur sapa |
| 147 | anggap | 高频 | 新建词根卡 | anggap | 动词根 | menganggap（认为）/ anggapan（看法、观点） | — |
| 148 | andal | 高频 | 新建词根卡 | andal | 形容词 | mengandalkan（依靠、指望）/ andalan（依靠对象、主力） | — |
| 149 | batas | 高频 | 新建词根卡 | batas | 名词 | membatasi（限制）/ terbatas（有限的）（落选：perbatasan 边境，降级到 syn） | — |
| 150 | derita | 教会 | 新建词根卡 | derita | 名词 | menderita（受苦）/ penderitaan（苦难） | menderita sengsara（已由 #260 立） |
| 151 | ganggu | 高频 | 新建词根卡 | ganggu | 动词根 | mengganggu（打扰）/ gangguan（干扰、故障） | — |
| 152 | gantung | 高频 | 新建词根卡 | gantung | 动词根 | tergantung（取决于）/ bergantung（依靠）（落选：menggantungkan 使依赖，降级到 syn） | — |
| 153 | hakim | 教会 | 新建词根卡 | hakim | 名词 | menghakimi（论断、审判）/ kehakiman（司法） | — |
| 154 | hancur | 高频 | 新建词根卡 | hancur | 形容词 | menghancurkan（摧毁）/ kehancuran（毁灭） | — |
| 155 | hindar | 高频 | 新建词根卡 | hindar | 动词根（不单用） | menghindari（避免）/ terhindar（幸免于） | — |
| 156 | korban | 教会 | 新建词根卡 | korban | 名词 | berkorban（牺牲）/ pengorbanan（牺牲，名词） | korban jiwa |
| 157 | langgar | 教会 | 新建词根卡 | langgar | 动词根 | melanggar（违反）/ pelanggaran（过犯、违规） | — |
| 158 | layan | 教会 | 新建词根卡 | layan | 动词根（不单用） | melayani（服事）/ pelayanan（事工、服事）（落选：pelayan 服务员，降级到 syn） | — |
| 159 | libat | 高频 | 新建词根卡 | libat | 动词根（不单用） | terlibat（卷入、参与）/ melibatkan（使…参与）（落选：keterlibatan 参与度，降级到 syn） | — |
| 160 | musnah | 教会 | 新建词根卡 | musnah | 动词根 | memusnahkan（消灭）/ kemusnahan（毁灭） | — |
| 161 | paksa | 高频 | 新建词根卡 | paksa | 动词根 | terpaksa（被迫）/ memaksa（强迫）（落选：paksaan 强迫，降级到 syn） | — |
| 162 | soalnya | 口语 | 并入 soal | soal（补建）（已由批次 2 建） | — | — | — |
| 163 | surat tugas | 工作 | 新建词组卡 | surat tugas | — | — | surat jalan |
| 164 | contohnya | 高频 | 并入 contoh | contoh（补建） | — | — | — |
| 165 | kedip-kedip | 工作 | 并入 kedip | kedip（补建） | — | — | — |
| 166 | pakai | 高频 | 新建词根卡 | pakai | 动词根 | memakai（使用，正式） | — |
| 167 | guna | 高频 | 新建词根卡 | guna | 名词 | menggunakan（使用）/ berguna（有用的） | — |
| 168 | nasi campur | 生活 | 新建词组卡 | nasi campur | — | — | — |
| 169 | nasi kari | 生活 | 新建词组卡 | nasi kari | — | — | — |
| 170 | tuang | 动作 | 新建词根卡 | tuang | 动词根 | menuangkan（倾倒，正式） | — |
| 171 | stasiun | 生活 | 新建词根卡 | stasiun | 名词 | —（外来词） | — |
| 172 | serlok | 口语 | 新建词根卡 | serlok | 名词 | —（口语缩写） | — |
| 173 | Chindo | 口语 | 新建词根卡 | Chindo | 名词 | —（口语缩写） | — |
| 174 | otw | 口语 | 新建词根卡 | otw | 动词根 | —（英语缩写） | — |
| 175 | -an（约数） | 词缀 | 新建词根卡 | -an | 词缀（不单用） | puluhan（数十、几十）/ ribuan（数千、几千） | — |
| 176 | keuangan | 工作 | 并入 uang | uang（补建） | — | — | — |
| 177 | paket | 生活 | 新建词根卡 | paket | 名词 | —（外来词） | — |
| 178 | sama | 口语 | 新建词根卡 | sama | 形容词·介词 | bersama（一起）/ kebersamaan（相聚、同在感） | — |
| 179 | apa | 高频 | 新建词根卡 | apa | 代词 | — | apa kabar / apa saja（已由 #72 立） |
| 180 | bahan | 工作 | 新建词根卡 | bahan | 名词 | — | bahan baku |
| 181 | materai | 工作 | 新建词根卡 | materai | 名词 | — | — |
| 182 | tray | 生活 | 新建词根卡 | tray | 名词 | —（外来词） | — |
| 183 | dusta | 教会 | 新建词根卡 | dusta | 名词 | berdusta（说谎）/ mendustai（欺骗某人） | saksi dusta |
| 184 | memperbaharui | 工作 | 并入 baru | baru（补建）（已由批次 2 建） | — | — | — |
| 185 | menemui | 动作 | 并入 temu | temu（补建） | — | — | jalan buntu |
| 186 | sesat | 教会 | 新建词根卡 | sesat | 形容词 | tersesat（迷路）/ menyesatkan（使人走迷） | ajaran sesat |
| 187 | demikian | 语法 | 新建词根卡 | demikian | 副词 | — | dengan demikian / sedemikian rupa |
| 188 | cemar | 形容词 | 新建词根卡 | cemar | 形容词 | tercemar（被污染的）/ mencemari（污染…）（落选：pencemaran 污染、dicemari 被玷污，降级到 syn） | — |
| 189 | macam | 高频 | 新建词根卡 | macam | 名词 | bermacam-macam（各式各样）/ semacam（一种、类似于） | jangan macam-macam |
| 190 | serakah | 形容词 | 新建词根卡 | serakah | 形容词 | keserakahan（贪婪、贪欲）/ menyerakahi（独吞、侵占） | — |
| 191 | menyerakahi | 动作 | 并入 serakah | serakah（#190） | — | — | — |
| 192 | keserakahan | 教会 | 并入 serakah | serakah（#190） | — | — | — |
| 193 | hawa nafsu | 教会 | 新建词组卡 | hawa nafsu | — | — | — |
| 194 | nafsu | 高频 | 新建词根卡 | nafsu | 名词 | bernafsu（充满欲望的、渴望的）（落选：menafsukan 非规范用法，降级到 syn） | nafsu makan |
| 195 | bernafsu | 形容词 | 并入 nafsu | nafsu（#194） | — | — | — |
| 196 | menafsukan | 辨音 | 并入 nafsu | nafsu（#194） | — | — | menggugah selera |
| 197 | terbuai | 高频 | 并入 buai | buai（补建） | — | — | hawa nafsu（已由 #193 立） |
| 198 | mengendalikan | 动作 | 并入 kendali | kendali（#128） | — | — | hawa nafsu（已由 #193 立） |
| 199 | pembawaan | 形容词 | 并入 bawa | bawa（补建） | — | — | terbawa suasana |
| 200 | tumpul | 形容词 | 新建词根卡 | tumpul | 形容词 | menumpulkan（使变钝）（落选：tumpel 方言变体，降级到 syn） | — |
| 201 | tumpel | 口语 | 并入 tumpul | tumpul（#200） | — | — | — |
| 202 | bodoh | 形容词 | 新建词根卡 | bodoh | 形容词 | membodohi（愚弄别人）/ kebodohan（愚蠢） | masa bodoh |
| 203 | kesempatan | 高频 | 并入 sempat | sempat（补建） | — | — | — |
| 204 | anggota | 高频 | 新建词根卡 | anggota | 名词 | — | anggota tubuh |
| 205 | iblis | 教会 | 新建词根卡 | iblis | 名词 | —（阿拉伯语借词） | tipu daya |
| 206 | dupa | 教会 | 新建词根卡 | dupa | 名词 | pendupaan（香炉；献香礼） | — |
| 207 | pendupaan | 教会 | 并入 dupa | dupa（#206） | — | — | — |
| 208 | hewan | 生活 | 新建词根卡 | hewan | 名词 | kehewanan（兽性、动物性） | — |
| 209 | kehewanan | 形容词 | 并入 hewan | hewan（#208） | — | — | — |
| 210 | jinak | 形容词 | 新建词根卡 | jinak | 形容词 | menjinakkan（驯服；拆除） | — |
| 211 | menjinakkan | 动作 | 并入 jinak | jinak（#210） | — | — | menjinakkan bom |
| 212 | peraturan | 工作 | 并入 atur | atur（补建） | — | — | — |
| 213 | sah | 工作 | 新建词根卡 | sah | 形容词 | mengesahkan（批准使生效） | — |
| 214 | pimpinan | 工作 | 并入 pimpin | pimpin（补建） | — | — | — |
| 215 | tunda | 工作 | 新建词根卡 | tunda | 动词根 | menunda（推迟、延期） | — |
| 216 | terlambat | 高频 | 并入 lambat | lambat（补建） | — | — | — |
| 217 | secepatnya | 高频 | 并入 cepat | cepat（补建） | — | — | — |
| 218 | tagihan | 工作 | 并入 tagih | tagih（补建） | — | — | — |
| 219 | persetujuan | 工作 | 并入 setuju | setuju（补建） | — | — | — |
| 220 | stabil | 形容词 | 新建词根卡 | stabil | 形容词 | kestabilan（稳定性） | — |
| 221 | cair | 工作 | 新建词根卡 | cair | 形容词 | mencairkan（拨款、提现；使融化）/ pencairan（放款、提现流程） | dana cair |
| 222 | pencairan | 工作 | 并入 cair | cair（#221） | — | — | — |
| 223 | kwitansi | 工作 | 新建词根卡 | kwitansi | 名词 | —（外来词） | — |
| 224 | nota | 工作 | 新建词根卡 | nota | 名词 | —（外来词） | faktur pajak（已由 #225 立） |
| 225 | faktur | 工作 | 新建词根卡 | faktur | 名词 | —（外来词） | faktur pajak |
| 226 | pajak | 工作 | 新建词根卡 | pajak | 名词 | perpajakan（税务领域） | bea cukai |
| 227 | modal | 工作 | 新建词根卡 | modal | 名词 | bermodal（有本钱的） | modal nekat |
| 228 | untung | 工作 | 新建词根卡 | untung | 名词 | beruntung（幸运的）/ keuntungan（利润；好处） | untung saja |
| 229 | keuntungan | 工作 | 并入 untung | untung（#228） | — | — | — |
| 230 | rugi | 工作 | 新建词根卡 | rugi | 形容词 | merugikan（使受损）/ kerugian（亏损、损失） | — |
| 231 | kerugian | 工作 | 并入 rugi | rugi（#230） | — | — | ganti rugi |
| 232 | biaya | 工作 | 新建词根卡 | biaya | 名词 | membiayai（出资、资助） | — |
| 233 | potongan | 工作 | 并入 potong | potong（补建） | — | — | — |
| 234 | persentase | 工作 | 新建词根卡 | persentase | 名词 | —（外来词） | — |
| 235 | akuntansi | 工作 | 新建词根卡 | akuntansi | 名词 | —（外来词） | — |
| 236 | akuntan | 工作 | 新建词根卡 | akuntan | 名词 | —（外来词） | — |
| 237 | finansial | 工作 | 新建词根卡 | finansial | 形容词 | —（外来词） | — |
| 238 | mengaudit | 工作 | 并入 audit | audit（补建） | — | — | — |
| 239 | titip | 高频 | 新建词根卡 | titip | 动词根 | menitipkan（托付）/ titipan（寄存物、代转的东西） | — |
| 240 | titipan | 高频 | 并入 titip | titip（#239） | — | — | — |
| 241 | resi | 生活 | 新建词根卡 | resi | 名词 | —（外来词） | surat jalan（已由 #163 立） |
| 242 | kurir | 生活 | 新建词根卡 | kurir | 名词 | —（外来词） | — |
| 243 | pengirim | 工作 | 并入 kirim | kirim（补建） | — | — | — |
| 244 | penerimaan | 工作 | 并入 terima | terima（补建） | — | — | — |
| 245 | ambil | 高频 | 新建词根卡 | ambil | 动词根 | mengambil（拿、取）/ pengambilan（提货、领取） | — |
| 246 | pengambilan | 工作 | 并入 ambil | ambil（#245） | — | — | — |
| 247 | pembayaran | 工作 | 并入 bayar | bayar（补建） | — | — | — |
| 248 | tanda tangan | 工作 | 新建词组卡 | tanda tangan | — | — | — |
| 249 | hubungi | 高频 | 并入 hubung | hubung（补建） | — | — | — |
| 250 | pinjam | 高频 | 新建词根卡 | pinjam | 动词根 | meminjamkan（借出给别人）/ pinjaman（贷款）（落选：meminjam 借用，降级到 syn） | — |
| 251 | kembalikan | 动作 | 并入 kembali | kembali（补建） | — | — | — |
| 252 | tanggung jawab | 工作 | 新建词组卡 | tanggung jawab | — | — | — |
| 253 | sekelompok | 语法 | 并入 kelompok | kelompok（补建） | — | — | — |
| 254 | hadirat | 教会 | 并入 hadir | hadir（补建） | — | — | — |
| 255 | taat | 教会 | 新建词根卡 | taat | 形容词 | menaati（遵守）/ ketaatan（顺服） | — |
| 256 | menyangkal | 教会 | 并入 sangkal | sangkal（补建） | — | — | menyangkal diri |
| 257 | memikul | 教会 | 并入 pikul | pikul（补建） | — | — | memikul salib / menanggung dosa |
| 258 | pengakuan | 教会 | 并入 aku | aku（补建） | — | — | Pengakuan Iman Rasuli |
| 259 | Khalik | 教会 | 新建词根卡 | Khalik | 名词 | —（阿拉伯语借词） | — |
| 260 | sengsara | 教会 | 新建词根卡 | sengsara | 名词 | kesengsaraan（苦难） | menderita sengsara |
| 261 | bangkit | 教会 | 新建词根卡 | bangkit | 动词根 | membangkitkan（使复活、激起）/ kebangkitan（复活） | — |
| 262 | pula | 语法 | 新建词根卡 | pula | 副词 | — | — |
| 263 | nats | 教会 | 新建词根卡 | nats | 名词 | —（外来词） | — |
| 264 | mengerikan | 形容词 | 并入 ngeri | ngeri（补建） | — | — | takut akan Tuhan |
| 265 | merupakan | 语法 | 并入 rupa | rupa（补建） | — | — | — |
| 266 | dihuni | 生活 | 并入 huni | huni（补建） | — | — | — |
| 267 | memberontak | 教会 | 并入 berontak | berontak（补建） | — | — | — |
| 268 | seberang | 地形 | 新建词根卡 | seberang | 名词 | menyeberang（过马路、横渡）/ penyeberangan（渡口、人行横道） | — |
| 269 | turut | 高频 | 新建词根卡 | turut | 动词根 | menurut（根据、依照）/ menuruti（迁就、纵容）（落选：berturut-turut 连续地，降级到 syn） | — |
| 270 | terlebih lagi | 语法 | 新建词组卡 | terlebih lagi | — | — | terlebih dahulu |
| 271 | menyelesaikan | 高频 | 并入 selesai | selesai（补建） | — | — | — |

## 补建的词根卡（原库无对应条目）

上表里 `并入 X` 的 X，有 89 个在原库 271 条里**没有**自己的卡。这些词根卡要新建，
`p`（音节切分+谐音）、`zh`（词根本义）、`ex`（例句）三项**必须现写**，不能从派生词
原卡照抄——派生词的读音、释义、例句都不是词根的。`c`（分类）沿用来源原卡的分类，
`syn` 由来源原卡的 `syn` 上提。

| 词根 | 词性 | 拟选 der | 来源原卡 | 备注 |
|---|---|---|---|---|
| kata | 名词 | mengatakan（说出、讲述）/ berkata（说道，后接引语） | #6 | — |
| usir | 动词根（不单用） | mengusir（驱赶、驱逐） | #7 | — |
| jumlah | 名词 | sejumlah（若干、一些） | #10 | ⚠️ 与 total 的分工上提到 syn |
| suruh | 动词根 | menyuruh（吩咐、差遣） | #11 | 落选：suruhlah（-lah 柔和祈使语气，降级到 syn） |
| kabul | 动词根（不单用） | mengabulkan（应允、准许）/ terkabul（实现了） | #12 | — |
| desak | 动词根 | mendesak（催逼；紧急的）/ terdesak（走投无路） | #18 | — |
| hitung | 动词根 | menghitung（计算、数）/ perhitungan（计算，名词） | #19 | — |
| pasok | 动词根 | pemasok（供应商）/ memasok（供应） | #23 | 落选：pasokan 供应量（降级到 syn） |
| urut | 动词根 | urutan（顺序、次序）/ mengurutkan（排序） | #32 | 落选：berurutan 按顺序（降级到 syn） |
| harap | 动词根 | berharap（盼望、仰望）/ pengharapan（盼望，属灵） | #34 | ⚠️ mengharapkan 要接宾语，上提到 syn |
| doa | 名词 | berdoa（祷告，不及物）/ mendoakan（为…祷告） | #35 | 口诀 ber- 自己做 / me-…-kan 对着谁做，上提到 syn |
| lompat | 动词根 | melompat（跳、跳跃） | #36 | — |
| nyanyi | 动词根（不单用） | menyanyi（唱歌，不及物）/ menyanyikan（唱某首歌） | #37 | — |
| tebus | 动词根（不单用） | menebus（救赎、赎回）/ Penebus（救赎主） | #40 | ⚠️ 与 tebu 甘蔗只差一字母，上提到 syn |
| baik | 形容词 | sebaiknya（最好、建议）/ memperbaiki（修好、改善） | #42 | — |
| hendak | 副词 | kehendak（旨意、意愿） | #45 | 书面/圣经语体的「想要」 |
| ingat | 动词根 | peringatan（纪念；警告）/ mengingatkan（提醒） | #46 | 落选：memperingati 纪念、teringat 突然想起（降级到 syn） |
| tingkat | 名词 | meningkat（上升、增加）/ peningkatan（提升） | #47 | 落选：meningkatkan 提高某物（降级到 syn） |
| sebar | 动词根（不单用） | menyebarkan（传播、散布）/ disebarkan（被转发） | #59 | 请求用被动更礼貌，上提到 syn |
| tutup | 动词根 | penutupan（闭幕、结业）/ menutup（关闭） | #61 | 反义 pembukaan 开幕，上提到 syn |
| tumbuh | 动词根 | bertumbuh（成长）/ pertumbuhan（成长，名词） | #64 | — |
| rintis | 动词根（不单用） | merintis（开拓、开创）/ perintis（开拓者） | #65 | — |
| Injil | 名词 | menginjili（向…传福音）/ penginjilan（传福音事工） | #66 | 专名，首字母大写 |
| nikmat | 形容词 | menikmati（享受、品味）/ kenikmatan（乐趣） | #67 | nikmat 单用＝美味的、恩惠 |
| andai | 连词 | seandainya（假如，与事实相反） | #75 | — |
| bahagia | 形容词 | kebahagiaan（幸福感） | #76 | ⚠️ bahagia 是形容词，作名词要加 ke-…-an |
| kerja | 动词根 | mengerjakan（做作业、任务）/ pekerjaan（工作、活儿） | #86 | 落选：bekerja 工作（不及物，降级到 syn） |
| rasuk | 动词根（不单用） | kerasukan（被鬼附） | #87 | ke-…-an 表遭受，上提到 syn |
| keliar | 动词根（不单用） | berkeliaran（四处游荡） | #89 | 按原卡 root 字段判为 keliar；另一种分析是 liar 野的 |
| kubur | 名词 | pekuburan（墓地、坟场）/ menguburkan（埋葬） | #90 | 落选：kuburan 坟墓（降级到 syn） |
| berita | 名词 | memberitakan（传扬、宣告）/ pemberitaan（传讲） | #91 | ber- 是词根一部分，不拆 |
| tular | 动词根（不单用） | menular（传染、蔓延）/ tertular（被传染） | #92 | — |
| tolak | 动词根 | menolak（拒绝）/ ditolak（被拒绝、被排斥） | #93 | 落选：penolakan 拒绝（名词，降级到 syn） |
| sembunyi | 动词根 | tersembunyi（隐藏的）/ menyembunyikan（把…藏起来） | #94 | 落选：bersembunyi 躲藏（降级到 syn） |
| capai | 动词根 | mencapai（达到、达成）/ tercapai（得以实现） | #96 | ⚠️ capai 单用＝累，上提到 syn |
| ikat | 动词根 | mengikat（捆绑、约束）/ ikatan（纽带） | #97 | 落选：terikat 被束缚（降级到 syn） |
| baru | 形容词 | memperbarui（更新）/ pembaruan（更新，名词） | #98、#184 | 已由批次 2 建。落选：memperbaharui（旧拼法，公文常见，降级到 syn）；#184 的换护照/续合同用例并进 der 的 ex |
| kenan | 动词根（不单用） | berkenan（乐意、悦纳） | #99 | — |
| soal | 名词 | persoalan（问题、难题）/ soalnya（因为、原因是） | #100、#162 | 已由批次 2 建 |
| genap | 形容词 | segenap（全部的、整个的） | #102 | — |
| ucap | 动词根（不单用） | mengucapkan（说出、致以）/ ucapan（致辞） | #103 | — |
| salam | 名词 | bersalaman（互相握手问候） | #104 | ber-…-an 表互相，上提到 syn |
| curah | 动词根（不单用） | mencurahkan（倾倒、倾注、倾诉） | #105 | — |
| kumpul | 动词根 | berkumpul（聚集、聚会）/ mengumpulkan（收集） | #106 | 落选：perkumpulan 团体（降级到 syn） |
| tunjuk | 动词根 | menunjukkan（表明、出示）/ petunjuk（指南、说明） | #109 | 落选：menunjuk 用手指向（降级到 syn）；原卡词形 tunjukkan 是口语祈使 |
| biasa | 形容词 | terbiasa（习惯了的） | #110 | — |
| alas | 名词 | alasan（理由、原因、借口） | #111 | alas＝垫子、基础；alasan 已高度词汇化，词根卡价值有限 |
| suatu | 代词 | sesuatu（某物、某事） | #112 | suatu 后接名词（suatu hari 某天） |
| bentuk | 名词 | dibentuk（被塑造、被形成）/ membentuk（组建、塑造） | #114 | 落选：berbentuk 呈…形状（降级到 syn） |
| larang | 动词根（不单用） | melarang（禁止、不准）/ larangan（禁令） | #116 | Dilarang… 公共标语句式上提到 syn |
| bahas | 动词根 | membahas（讨论、探讨）/ pembahasan（探讨，名词） | #117 | 口语可直接用词根：Bahas apa? |
| jamah | 动词根（不单用） | menjamah（触摸；属灵眷顾） | #118 | — |
| sentuh | 动词根（不单用） | tersentuh（被触动、被感动）/ menyentuh（触摸） | #119 | — |
| tampil | 动词根 | penampilan（外表、形象；演出表现）/ menampilkan（展示） | #121 | — |
| buruk | 形容词 | memburuk（恶化、变坏） | #124 | ⚠️ 别和 membusuk 腐烂混淆，上提到 syn |
| tindak | 动词根 | bertindak（采取行动）/ tindakan（行动、措施） | #125 | 落选：menindak 查处（降级到 syn） |
| serang | 动词根（不单用） | menyerang（攻击、袭击）/ serangan（攻击，名词） | #127 | — |
| rakit | 动词根 | perakitan（组装、装配）/ merakit（组装） | #129 | rakit 另有「竹筏」义，上提到 syn |
| pimpin | 动词根（不单用） | memimpin（带领、主持）/ pimpinan（领导层、管理者） | #131、#214 | 落选：pemimpin 领袖（降级到 syn） |
| rasa | 名词 | perasaan（感觉、情绪）/ merasa（感觉、觉得） | #137 | ⚠️ rasa 偏味道/触感，情绪用 perasaan，上提到 syn |
| contoh | 名词 | contohnya（例如、比如） | #164 | — |
| kedip | 动词根 | kedip-kedip（闪个不停、忽明忽暗） | #165 | 重叠表反复 |
| uang | 名词 | keuangan（财务、资金；财务部） | #176 | — |
| temu | 动词根（不单用） | menemui（去见、拜会；遭遇）/ menemukan（找到、发现） | #185 | 两者分工上提到 syn |
| buai | 动词根 | terbuai（沉溺于、被陶醉） | #197 | — |
| bawa | 动词根 | membawa（带、携带）/ pembawaan（天性、性情） | #199 | — |
| sempat | 副词 | kesempatan（机会、时机；空闲） | #203 | sempat＝来得及 |
| atur | 动词根（不单用） | peraturan（规定、规章、法规）/ mengatur（安排、调整） | #212 | 落选：aturan（更口语更泛，降级到 syn） |
| lambat | 形容词 | terlambat（迟到、延误）/ keterlambatan（延误，名词） | #216 | 口语说 telat，上提到 syn |
| cepat | 形容词 | secepatnya（尽快） | #217 | — |
| tagih | 动词根（不单用） | tagihan（账单、催款单）/ menagih（催款） | #218 | — |
| setuju | 动词根 | persetujuan（批准、同意）/ menyetujui（同意某事） | #219 | — |
| potong | 动词根 | potongan（折扣；扣款）/ memotong（切、剪、扣） | #233 | 与 #134 potong rambut 词组卡不冲突 |
| audit | 名词 | mengaudit（审计、查账） | #238 | 外来词；名词形就是 audit |
| kirim | 动词根 | mengirim（寄、发送）/ pengirim（寄件人、发货方） | #243 | 落选：pengiriman 发货、运送（降级到 syn） |
| terima | 动词根 | menerima（接受、收到）/ penerimaan（接收验收；收入；录取） | #244 | 落选：penerima 收件人（降级到 syn） |
| bayar | 动词根 | membayar（付款）/ pembayaran（付款、支付） | #247 | — |
| hubung | 动词根（不单用） | menghubungi（联系、对接）/ hubungan（关系） | #249 | 原卡词形 hubungi 是口语祈使 |
| kembali | 动词根 | mengembalikan（归还、退回） | #251 | 原卡词形 kembalikan 是口语祈使；口语也说 balikin |
| kelompok | 名词 | sekelompok（一组、一群、一伙） | #253 | — |
| hadir | 动词根 | hadirat（（神的）同在、面前）/ kehadiran（出席、临在） | #254 | -at 是阿拉伯语后缀；两者语域分工上提到 syn |
| sangkal | 动词根（不单用） | menyangkal（否认、不认；舍弃） | #256 | 反义 mengaku 承认，上提到 syn |
| pikul | 动词根 | memikul（挑、扛、担负） | #257 | — |
| aku | 动词根（不单用） | pengakuan（承认、告白、认罪）/ mengaku（坦白、承认） | #258 | ⚠️ 与代词 aku（我）同形异义，id 需按 `root:aku-1`/`root:aku-2` 规则留意 |
| ngeri | 形容词 | mengerikan（可怕的、令人恐惧的） | #264 | me-…-kan 造使役形容词的规律上提到 syn |
| rupa | 名词 | merupakan（是、构成，书面）/ rupanya（看样子、原来） | #265 | 落选：berupa 呈…形式、menyerupai 类似于（降级到 syn） |
| huni | 动词根（不单用） | dihuni（被居住）/ penghuni（住户、居民） | #266 | — |
| berontak | 动词根（不单用） | memberontak（悖逆、反叛）/ pemberontakan（叛乱） | #267 | ber- 是词根一部分，不拆；落选：pemberontak 叛徒 |
| selesai | 形容词 | menyelesaikan（解决、完成）/ penyelesaian（解决方案） | #271 | — |

## 抽出的词组卡汇总

从 `coll` 抽出的 39 张：

alat musik / musik rohani / minggu lalu / satu demi satu / hari demi hari /
Khotbah di Bukit / air terjun / terjun payung / jurang pemisah / mati lemas /
gempa bumi / Sepuluh Perintah Allah / masuk angin / keinginan daging /
di samping itu / badan usaha / oleh sebab itu / serangan jantung / aman terkendali /
korban jiwa / apa kabar / bahan baku / saksi dusta / jalan buntu / ajaran sesat /
dengan demikian / sedemikian rupa / nafsu makan / masa bodoh / anggota tubuh /
tipu daya /
menjinakkan bom / faktur pajak / ganti rugi / menyangkal diri / memikul salib /
Pengakuan Iman Rasuli / menderita sengsara / terlebih dahulu

从 `syn` 抽出的 22 张（`syn` 是散文，这些搭配埋在辨析句子里）：

kalau begitu / warta jemaat / menanam gereja / tanah air / oleh karena itu /
panjang ceritanya / membawakan acara / Perjanjian Lama / Perjanjian Baru /
pulang kerja / keluar dari kerja / menegur sapa / surat jalan /
jangan macam-macam / menggugah selera / terbawa suasana / dana cair /
bea cukai / modal nekat / untung saja / menanggung dosa / takut akan Tuhan

跨行重复、只立一张的（写 `（已由 #NN 立）`，不另立卡）：

berat hati（#24 → #62）/ di samping itu（#85 → #69）/ apa saja（#179 → #72）/
hawa nafsu（#197、#198 → #193）/ menderita sengsara（#150 → #260）/
faktur pajak（#224 → #225）/ surat jalan（#241 → #163）

原卡本身就是词组、直接转 `t:"phrase"` 的 18 张：

kali terakhir / buku harian / berat hati / ada apa / apa saja / gak usah /
salah paham / selain itu / potong rambut / makan malam / masuk kerja /
surat tugas / nasi campur / nasi kari / hawa nafsu / tanda tangan /
tanggung jawab / terlebih lagi

## 规模

- 原卡片：271
  - 新建词根卡：143
  - 并入词根：110
  - 新建词组卡：18
  - 丢弃：0
- 词根卡：232（原卡转成的 143 + 补建的 89）
- 词组卡：79（原卡转成的 18 + 从 coll 抽出的 39 + 从 syn 抽出的 22）
- 合计：311
