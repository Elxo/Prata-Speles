# Prāta spēles

Interaktīva TV šova stila aplikācija erudīcijas turnīram. Komandas sacenšas dueļos, vadītājs vada spēli no pults, bet zāle redz lielo ekrānu.

- **/host** — vadītāja pults: pareizās atbildes, taimeris, punkti, likmes, visa spēles gaita.
- **/screen** — lielais ekrāns (projektors/TV): tikai tas, ko drīkst redzēt zāle.
- **/editor** — redaktors: turnīrs, spēles, komandas, jautājumi, noteikumi, imports un eksports.
- **/final-preview** — fināla priekšskats: visi fināla ekrāni soli pa solim ar demo datiem (nekas netiek saglabāts).
- **/noteikumi** — informatīvā lapa ar spēles noteikumiem, punktiem un papildiespēju cenām (skaitļi ņemti no turnīra iestatījumiem; der arī telefonā).

Serveris nav vajadzīgs. Dati glabājas pārlūkā (`localStorage`), un logi sinhronizējas reāllaikā ar `BroadcastChannel`.

---

## Palaišana

Nepieciešams [Node.js](https://nodejs.org/) 20 vai jaunāks.

```bash
npm install
npm run dev
```

Atveriet <http://localhost:5173> un izvēlieties skatu.

### Versija pasākumam (bez interneta)

```bash
npm run build      # izveido mapi dist/
npm run preview    # palaiž gatavo versiju http://localhost:4173
```

Mapi `dist/` var ievietot jebkurā statiskā hostingā. Ja hostings nepārvirza `/host` uz `index.html`, izmantojiet adreses ar `#`: `…/#/host`, `…/#/screen`, `…/#/editor`.

Fonti un skaņas ir iekļauti aplikācijā, tāpēc internets nav vajadzīgs (izņemot jautājumus ar ārējiem attēlu/video URL).

---

## Sagatavošana pirms pasākuma

1. Pievienojiet projektoru vai TV kā **paplašinātu ekrānu** (Windows: `Win + P` → „Paplašināt”).
2. Atveriet **pulti** (`/host`) uz sava klēpjdatora ekrāna.
3. Pultī nospiediet **„↗ Atvērt logu”**. Pārvelciet atvērto lielā ekrāna logu uz projektoru.
4. Lielajā ekrānā nospiediet **„Pilnekrāns + skaņa”** (pārlūks atļauj skaņu tikai pēc klikšķa). Pilnekrānu var ieslēgt un izslēgt ar `F` vai dubultklikšķi.
5. Abiem logiem jābūt **vienā pārlūkā un vienā profilā** (piem., abi Chrome vai abi Edge), citādi tie nesinhronizējas.

> Padoms: pirms pasākuma izspēlējiet vienu dueli kā mēģinājumu. Pēc tam **Turnīrs → „Atiestatīt progresu”** nodzēsīs punktus un rezultātus, bet komandas, jautājumi un pāri paliks.

Pultī labajā pusē vienmēr redzams lielā ekrāna **priekšskatījums**.

---

## Vadītāja ceļvedis

### Pirms turnīra (cilne „🗂 Turnīrs”)

1. **„📜 Rādīt noteikumus”** — noteikumu slaidi parādās lielajā ekrānā. Slaidus pārslēdz ar `→` / `←` vai ar pogām labajā panelī.
2. **„🎲 Izlozēt pārus”** vai izvēlieties pārus manuāli sarakstā. Pēc izlozes ekrānā automātiski parādās turnīra koks.
3. **„▶ Sākt …”** — sākas nākamā spēle. Ekrānā parādās ievads („Pirmās kārtas 1. spēle: A pret B”).

### Duelis (pirmā kārta un pusfināls)

| Darbība | Poga | Taustiņš |
| --- | --- | --- |
| Parādīt jautājumu ekrānā | 📺 Rādīt jautājumu | `S` |
| Sākt / apturēt taimeri | ▶ Sākt / ⏸ Apturēt | `Space` |
| Komanda A / B atbild pareizi | ✔ Pareizi | `1` / `2` |
| Komanda A / B atbild nepareizi | ✘ Nepareizi | `Shift+1` / `Shift+2` |
| Parādīt pareizo atbildi | 💡 Atklāt atbildi | `R` |
| Nākamais / iepriekšējais jautājums | Nākamais / Iepriekšējais | `→` / `←` |
| Atsaukt pēdējo darbību | ↶ Atsaukt | `Z` |

- Pultī vienmēr redzama **pareizā atbilde** un **vadītāja piezīmes**. Ekrānā tās neparādās.
- Pirms jautājuma parādīšanas ekrānā redzama ievadkarte: numurs, tēma un punkti.
- Režīmā **„pēc kārtas”** atbildētājs mainās automātiski. Režīmā **„ar pogu”** vadītājs atzīmē, kura komanda pieteicās pirmā.
- **Attēla jautājumi:** „🧩 Atklāt vairāk” atklāj attēlu pa daļām.
- **Audio/video:** pultī ir pogas Atskaņot / Pauze / No sākuma, un atskaņošana notiek lielajā ekrānā.
- **„🏁 Beigt spēli”** — uzvar komanda ar vairāk punktiem **šajā spēlē**. Ja rezultāts ir neizšķirts, automātiski sākas **zelta jautājums**: atzīmējiet pirmo pareizo atbildi un vēlreiz nospiediet „Beigt spēli”.
- Punktus var koriģēt ar `−10` / `+10` (komandas kartītē) vai ar jebkuru soli punktu tabulā (cilne „Turnīrs”).

### Papildiespējas (dueļos)

Katra komanda sāk turnīru ar **100 punktiem**. Jautājums pirmajā kārtā ir **100** punktu vērts, pusfinālos — **150**, žūrija finālā par katru tēmu piešķir līdz **200** punktiem (visu maina redaktorā). Dueļa laikā komanda var nopirkt papildiespējas par saviem **kopējiem** punktiem. Pults komandas kartītē ir pogas ar cenām. Dueļa punkti nemainās, tāpēc pirkums ietekmē kopvērtējumu un finālu, nevis šī dueļa uzvarētāju.

| Papildiespēja | Kad | Ko dara |
| --- | --- | --- |
| 🙋 Zāles palīdzība | kamēr jautājums ekrānā | Komanda drīkst pajautāt zālei. |
| ✖2 Dubultie punkti | **pirms** „Rādīt jautājumu” | Pareiza atbilde dod divreiz vairāk punktu. |
| ⏱ Papildu laiks | kamēr jautājums ekrānā | Pieliek taimerim sekundes (noklusējums 15 s). |
| ↪ Nodot pretiniekam | kamēr jautājums ekrānā, tikai atbildētāja komanda | Atbild otra komanda, taimeris sākas no jauna. |

Lielajā ekrānā pie komandas nosaukuma redzamas visas papildiespējas ar cenām: nopirktās ir izceltas, tās, ko komanda nevar atļauties, — blāvas. Katru papildiespēju vienam jautājumam komanda var izmantot vienu reizi. Vienā spēlē komanda var nopirkt **ne vairāk kā 3** papildiespējas. Komanda, kas pret savu pretinieku **vada pēc kopējiem punktiem, maksā divreiz vairāk**. Ekrānā parādās paziņojums. Kļūdainu pirkumu var atsaukt ar `Z`. Cenas, sākuma punktus un ieslēgšanu maina redaktorā (**Turnīrs un spēles**).

### Kas iet tālāk (6 komandu shēma, 6 spēles)

- Pēc pirmās kārtas tālāk iet **3 uzvarētāji un labākais zaudētājs** (pēc kopējiem punktiem).
- **1. pusfināls:** labākais uzvarētājs pret labāko zaudētāju. **2. pusfināls:** 2. pret 3. uzvarētāju.
- Ja labākais zaudētājs jau zaudēja tieši labākajam uzvarētājam, pāri tiek automātiski samainīti, lai neviens nespēlētu ar to pašu pretinieku atkārtoti.
- Pusfinālu uzvarētāji spēlē **finālā**. Abi finālisti ir aizvadījuši vienādu spēļu skaitu (3), tāpēc viņu punkti ir salīdzināmi.
- **Kopējie punkti nekad netiek atiestatīti**: tie pāriet no kārtas uz kārtu.
- Vecā shēma (labākais uzvarētājs uzreiz finālā, 5 spēles) joprojām pieejama redaktorā kā „6 komandas (labākais uzreiz finālā)”.

Starp spēlēm ekrānā var parādīt **turnīra koku** (`B`), **punktu tabulu** (`T`) vai **logo** (`L`).

### Fināls

> **Video tēze.** Ja tēzes jautājuma tips ir „Video”, pēc „Rādīt tēzi” ekrānā parādās video (pultī: Atskaņot / Pauze / No sākuma). Kad video beidzas, ekrānā automātiski parādās tēzes teksts. To var parādīt arī uzreiz ar „📝 Rādīt tēzes tekstu”. Tēzes tekstu ierakstiet jautājuma laukā.

Sākot finālu, ekrānā vispirms automātiski parādās **fināla noteikumi** (`→`, līdz sākas spēle). Katram jautājumam:

1. **Likmes.** Ievadiet katras komandas likmi (0 līdz visiem tās punktiem; vai līdz atpalicējas punktiem, ja redaktorā ieslēgts ierobežojums — sk. zemāk) un nospiediet **„Fiksēt likmi”**. Ekrānā redzams tikai „✔ Likme likta”. Kad abas likmes fiksētas, **„🎲 Atklāt likmes ekrānā”**.
2. **Jautājums.** `S` parāda jautājumu, `Space` palaiž taimeri. Komandas raksta atbildes uz lapas.
3. **Atbildes.** Ierakstiet komandu atbildes (pēc izvēles) un atzīmējiet Pareizi/Nepareizi (`1`/`2`, `Shift+1`/`Shift+2`). Vērtējums ekrānā nav redzams.
4. **„🎭 Atklāt ekrānā”** — atbildes tiek atklātas pa vienai ar animāciju. Pareizai atbildei likme tiek pieskaitīta, nepareizai — atņemta.
5. `R` parāda pareizo atbildi, un `→` ved uz nākamo jautājumu.

**Likmju ierobežojums.** Redaktorā (**Turnīrs un spēles → Fināla likmes**) var izvēlēties „Ne vairāk kā atpalicējas komandas punkti”. Tad abas komandas drīkst likt ne vairāk kā mazākais no abu komandu punktiem, un vadošā komanda nevar „aizbēgt” ar lielu likmi. Ja to ieslēdzat, pielāgojiet arī noteikumu slaidu „Fināls: likmes”.

Kā fināls izskatās ekrānā, var apskatīt lapā **/final-preview** (saite ir arī sākumlapā).

Pēc pēdējā jautājuma **„🏆 Beigt finālu”** parāda uzvarētāja ekrānu ar konfetti un fanfarām. Neizšķirta gadījumā sākas zelta jautājums.

### Drošība

- Stāvoklis tiek saglabāts pēc katras darbības. Ja pārlūks aizveras, pēc pārlādes spēle turpinās tieši no tās pašas vietas.
- **„↶ Atsaukt”** atceras pēdējās 60 darbības (punkti, atklāšanas, spēles beigas u. c.).
- Pirms pasākuma eksportējiet turnīru JSON failā (**Redaktors → Imports / eksports**).

---

## Redaktors (`/editor`)

- **Turnīrs un spēles:** nosaukums, logo, taimeri, fināla likmju ierobežojums, turnīra shēma (2/4/6/8 komandas), katras spēles jautājumu kopa, jautājumu skaits, atbildēšanas veids un sloti (kas iet tālāk). Te arī izvēlas zelta jautājumu kopu.
- **Komandas:** nosaukums, krāsa, kapteinis, dalībnieki, logotips.
- **Jautājumi:** kopas un jautājumi. Tipi: teksts, varianti A/B/C/D, attēls (ar pakāpenisku atklāšanu), audio, video, skatītāju jautājums (ar autoru). Failus var norādīt kā URL vai augšupielādēt.
- **Noteikumi:** slaidu teksti. Slaidi ar atzīmi „Fināls” tiek parādīti vēlreiz pirms fināla.
- **Imports / eksports:** JSON (viss turnīrs), CSV/Excel (jautājumi), demo turnīrs, jauns tukšs turnīrs.

### CSV / Excel formāts

Pirmajā rindā ir kolonnu nosaukumi (lielie/mazie burti un garumzīmes nav svarīgi):

| Kolonna | Nozīme |
| --- | --- |
| `spēle` | Spēles numurs (`1`, `2`, …), nosaukums (`Pusfināls`, `Fināls`) vai `Zelta` |
| `tēma` | Tēma (redzama ekrānā) |
| `jautājums` | Jautājuma teksts (**obligāta**) |
| `atbilde` | Pareizā atbilde; variantu jautājumiem var rakstīt burtu `A`–`D` |
| `punkti` | Punktu vērtība (noklusējums 10) |
| `laiks` | Sekundes (tukšs = spēles taimeris) |
| `tips` | `teksts`, `varianti`, `attēls`, `audio`, `video`, `skatītāju` (pēc izvēles) |
| `A`, `B`, `C`, `D` | Atbilžu varianti |
| `autors` | Skatītāja jautājuma autors |
| `piezīmes` | Vadītāja piezīmes |
| `attēls` | Attēla/audio/video URL |

CSV atdalītājs (`;`, `,` vai TAB) tiek noteikts automātiski. Redaktorā var lejupielādēt paraugfailu.

> Attēli un audio, kas augšupielādēti kā faili, tiek glabāti pārlūkā. `localStorage` apjoms ir ierobežots (~5 MB), tāpēc lieliem failiem labāk izmantot URL.

---

## Koda struktūra

```
src/
  types.ts               datu modelis (turnīrs, spēle, jautājums, komanda, likmes, stāvoklis)
  lib/
    store.ts             kopīgais stāvoklis: localStorage + BroadcastChannel + atsaukšana
    engine.ts            spēles darbības (vērtēšana, taimeris, likmes, zelta jautājums)
    tournament.ts        slotu atrisināšana, kas iet tālāk, komandu statusi
    schemes.ts           turnīra shēmu reģistrs
    publicView.ts        ko drīkst redzēt zāle (atbildes/likmes tikai pēc atklāšanas)
    sounds.ts            skaņas efekti (WebAudio, bez failiem)
    io.ts                JSON / CSV / Excel imports un eksports
  data/demo.ts           demo turnīrs: 6 komandas, jautājumi par Latviju visām 6 spēlēm
  questionTypes/         jautājumu tipu reģistrs
  components/            Stage (1920×1080 mērogošana), turnīra koks, kopīgās komponentes
  views/host/            vadītāja pults
  views/screen/          lielais ekrāns
  views/editor/          redaktors
  views/preview/         fināla priekšskats (/final-preview)
```

### Jauns jautājumu tips

1. Pievienojiet nosaukumu tipam `QuestionType` failā `src/types.ts`.
2. Pievienojiet ierakstu `QUESTION_TYPES` failā `src/questionTypes/index.tsx`: `Screen` (ekrāna daļa), `Host` (pults pogas) un `editor` (redaktora lauki).

### Jauna turnīra shēma

Pievienojiet ierakstu `SCHEMES` masīvam failā `src/lib/schemes.ts`. Katrai spēlei ir divi sloti:

- `seed` — izloze vai manuāla izvēle;
- `winner` / `loser` — citas spēles uzvarētājs vai zaudētājs;
- `ranked` — N-tais labākais uzvarētājs (vai ar `pool: 'losers'` — zaudētājs) pēc kopējiem punktiem no norādītajām spēlēm.

Tos pašus slotus var rediģēt arī redaktorā bez koda.
