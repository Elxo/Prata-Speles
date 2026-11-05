// ─────────────────────────────────────────────────────────────
//  Demo turnīrs: 6 komandas un jautājumi par Latviju visām 6 spēlēm.
// ─────────────────────────────────────────────────────────────
import type { AppState, Question, QuestionSet, Team, Tournament } from '../types';
import { createLive, DEFAULT_SETTINGS, defaultRules, TEAM_COLORS } from '../lib/defaults';
import { getScheme } from '../lib/schemes';
import { uid } from '../lib/util';

type Extra = Partial<Omit<Question, 'id' | 'text' | 'answer' | 'points'>>;

const q = (text: string, answer: string, points: number, topic: string, extra: Extra = {}): Question => ({
  id: uid('q'),
  type: 'text',
  text,
  answer,
  points,
  topic,
  ...extra,
});

const choice = (text: string, options: string[], correct: number, points: number, topic: string, extra: Extra = {}) =>
  q(text, options[correct], points, topic, { type: 'choice', options, correctOption: correct, ...extra });

const audience = (author: string, text: string, answer: string, points: number, topic: string, extra: Extra = {}) =>
  q(text, answer, points, topic, { type: 'audience', author, ...extra });

const svg = (body: string) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">${body}</svg>`);

const FLAG_ESTONIA = svg(
  '<rect width="1600" height="1000" fill="#fff"/><rect width="1600" height="333" fill="#0072ce"/><rect y="333" width="1600" height="334" fill="#000"/>',
);
const FLAG_LITHUANIA = svg(
  '<rect width="1600" height="1000" fill="#c1272d"/><rect width="1600" height="333" fill="#fdb913"/><rect y="333" width="1600" height="334" fill="#006a44"/>',
);
const FLAG_FINLAND = svg(
  '<rect width="1600" height="1000" fill="#fff"/><rect x="450" width="275" height="1000" fill="#002f6c"/><rect y="362" width="1600" height="275" fill="#002f6c"/>',
);

const image = (text: string, media: string, answer: string, points: number, topic: string) =>
  q(text, answer, points, topic, { type: 'image', media, revealSteps: 4 });

function set(name: string, questions: Question[]): QuestionSet {
  return { id: uid('set'), name, questions };
}

export function demoQuestionSets() {
  const game1 = set('1. spēle', [
    q('Kā sauc Latvijas augstāko virsotni?', 'Gaiziņkalns', 10, 'Ģeogrāfija', {
      hostNotes: '311,9 m virs jūras līmeņa, Madonas novadā.',
    }),
    choice(
      'Kurā datumā tika proklamēta Latvijas Republika?',
      ['1990. gada 4. maijā', '1918. gada 18. novembrī', '1919. gada 11. novembrī', '1989. gada 23. augustā'],
      1,
      10,
      'Vēsture',
    ),
    q('Kurš ir Latvijas lielākais ezers pēc platības?', 'Lubāns', 20, 'Daba', { hostNotes: 'Ap 80 km², Latgalē.' }),
    choice(
      'Kurš ir Latvijas valsts himnas „Dievs, svētī Latviju!” autors?',
      ['Jāzeps Vītols', 'Kārlis Baumanis', 'Emīls Dārziņš', 'Raimonds Pauls'],
      1,
      10,
      'Kultūra',
    ),
    image('Kuras valsts karogs redzams attēlā?', FLAG_ESTONIA, 'Igaunijas', 20, 'Ģeogrāfija'),
    q('Kurā gadā tika dibināta Rīga?', '1201. gadā', 20, 'Vēsture', { hostNotes: 'Pilsētu dibināja bīskaps Alberts.' }),
    choice('Kurš putns ir Latvijas nacionālais putns?', ['Baltais stārķis', 'Baltā cielava', 'Melnais stārķis', 'Lakstīgala'], 1, 10, 'Daba'),
    audience('Ilze no Cēsīm', 'Kurā sporta veidā pasaulslavens ir Mārtiņš Dukurs?', 'Skeletonā', 20, 'Sports'),
    q('Kurš rakstnieks sarakstīja eposu „Lāčplēsis”?', 'Andrejs Pumpurs', 20, 'Literatūra', { hostNotes: 'Izdots 1888. gadā.' }),
    choice('Kurā gadā Latvija iestājās Eiropas Savienībā?', ['1999', '2002', '2004', '2007'], 2, 30, 'Vēsture', {
      hostNotes: '2004. gada 1. maijā. NATO — tā paša gada 29. martā.',
    }),
    q('Kā sauc Eiropas platāko ūdenskritumu, kas atrodas Kuldīgā?', 'Ventas rumba', 30, 'Ģeogrāfija', {
      hostNotes: 'Platums ap 250 m.',
    }),
    choice(
      'Kurš arhitekts projektēja Rundāles pili?',
      ['Frančesko Bartolomeo Rastrelli', 'Ludvigs Bonštets', 'Jānis Baumanis', 'Gunārs Birkerts'],
      0,
      30,
      'Kultūra',
    ),
  ]);

  const game2 = set('2. spēle', [
    q('Kurš kukainis ir Latvijas nacionālais kukainis?', 'Divpunktu mārīte', 10, 'Daba'),
    choice('Ar cik valstīm Latvijai ir sauszemes robeža?', ['2', '3', '4', '5'], 2, 10, 'Ģeogrāfija', {
      hostNotes: 'Igaunija, Lietuva, Krievija, Baltkrievija.',
    }),
    q('Kurš bija pirmais Latvijas Valsts prezidents?', 'Jānis Čakste', 20, 'Vēsture'),
    image('Kuras valsts karogs redzams attēlā?', FLAG_LITHUANIA, 'Lietuvas', 20, 'Ģeogrāfija'),
    choice('Kādu garšvielu tradicionāli liek Jāņu sierā?', ['Ķimenes', 'Dilles', 'Krustnagliņas', 'Kanēli'], 0, 10, 'Tradīcijas'),
    q('Kāds bija dzejnieka Raiņa īstais vārds un uzvārds?', 'Jānis Pliekšāns', 20, 'Literatūra'),
    choice(
      'Kurā gadā Latvijas hokeja izlase izcīnīja bronzas medaļas pasaules čempionātā?',
      ['2019', '2021', '2023', '2024'],
      2,
      20,
      'Sports',
    ),
    q('Kurā datumā notika „Baltijas ceļš”?', '1989. gada 23. augustā', 30, 'Vēsture', {
      hostNotes: 'Ap 2 miljoni cilvēku sadevās rokās no Tallinas līdz Viļņai.',
    }),
    audience(
      'Jānis no Liepājas',
      'Kurš komponists sarakstīja dziesmu „Dāvāja Māriņa”, kas pasaulē pazīstama kā „Miljons sarkanu rožu”?',
      'Raimonds Pauls',
      20,
      'Mūzika',
    ),
    choice(
      'Kuru pilsētu dēvē par „pilsētu, kurā piedzimst vējš”?',
      ['Ventspili', 'Liepāju', 'Jūrmalu', 'Pāvilostu'],
      1,
      10,
      'Ģeogrāfija',
    ),
    q('Kā sauc miniatūro fotokameru, ko 20. gs. 30. gados Rīgā, VEF, izstrādāja Valters Caps?', 'Minox', 30, 'Zinātne'),
    choice('Kurš ir Latvijas dziļākais ezers?', ['Drīdzis', 'Rāzna', 'Lubāns', 'Usmas ezers'], 0, 30, 'Daba', {
      hostNotes: 'Dziļums 65,1 m.',
    }),
  ]);

  const game3 = set('3. spēle', [
    choice(
      'Kura ir otra lielākā Latvijas pilsēta pēc iedzīvotāju skaita?',
      ['Liepāja', 'Daugavpils', 'Jelgava', 'Jūrmala'],
      1,
      10,
      'Ģeogrāfija',
    ),
    q('Kādā valūtā Latvijā norēķinājās pirms eiro ieviešanas 2014. gadā?', 'Latos', 10, 'Vēsture'),
    q('Kura ir garākā upe, kas visā garumā tek tikai pa Latvijas teritoriju?', 'Gauja', 20, 'Daba', {
      hostNotes: 'Garums 452 km. Daugava ir garāka, bet tek arī caur Baltkrieviju un Krieviju.',
    }),
    image('Kuras valsts karogs redzams attēlā?', FLAG_FINLAND, 'Somijas', 20, 'Ģeogrāfija'),
    choice(
      'Kurš tēlnieks veidoja Brīvības pieminekli Rīgā?',
      ['Kārlis Zāle', 'Teodors Zaļkalns', 'Gustavs Šķilters', 'Jānis Rozentāls'],
      0,
      20,
      'Kultūra',
      { hostNotes: 'Atklāts 1935. gada 18. novembrī.' },
    ),
    q('Kuri brāļi sarakstīja pirmo latviešu romānu „Mērnieku laiki”?', 'Reinis un Matīss Kaudzītes', 20, 'Literatūra'),
    choice(
      'Kurā turnīrā 2017. gadā uzvarēja tenisiste Jeļena Ostapenko?',
      ['Vimbldonā', 'Francijas atklātajā čempionātā', 'ASV atklātajā čempionātā', 'Austrālijas atklātajā čempionātā'],
      1,
      10,
      'Sports',
      { hostNotes: '„Roland Garros”, Parīzē.' },
    ),
    audience('Andris no Valmieras', 'Kā sauc pirmo Latvijas armijas virspavēlnieku, kurš krita 1919. gadā?', 'Oskars Kalpaks', 20, 'Vēsture'),
    q('Kura Latvijas animācijas filma 2025. gadā ieguva „Oskaru”?', '„Straume” (Flow)', 30, 'Kultūra', {
      hostNotes: 'Režisors Gints Zilbalodis. Galvenais varonis — kaķis.',
    }),
    choice('Kurā gadā notika pirmie Vispārējie latviešu Dziesmu svētki?', ['1873', '1888', '1918', '1920'], 0, 30, 'Vēsture'),
    q('Kā sauc ragu, pie kura Baltijas jūra satiekas ar Rīgas jūras līci?', 'Kolkasrags', 30, 'Ģeogrāfija'),
    choice('Cik augsts ir Rīgas radio un televīzijas tornis?', ['~168 m', '~268 m', '~368 m', '~468 m'], 2, 20, 'Zinātne', {
      hostNotes: '368,5 m — augstākā būve Baltijas valstīs.',
    }),
  ]);

  const semi1 = set('1. pusfināls', [
    q('Kurus svētkus Latvijā atzīmē 11. novembrī?', 'Lāčplēša dienu', 10, 'Vēsture'),
    choice('Kurš zieds ir Latvijas nacionālais zieds?', ['Rudzupuķe', 'Pīpene', 'Magone', 'Saulgrieze'], 1, 10, 'Daba'),
    q('Kurš latviešu gleznotājs uzgleznoja gleznu „No baznīcas”?', 'Jānis Rozentāls', 20, 'Kultūra'),
    choice('Kura no šīm pilsētām atrodas Latgalē?', ['Cēsis', 'Kuldīga', 'Rēzekne', 'Bauska'], 2, 20, 'Ģeogrāfija'),
    q('Kurā gadā Latvijā pirmo reizi ieviesa latu?', '1922. gadā', 20, 'Vēsture'),
    audience(
      'Marta no Daugavpils',
      'Kurā sporta veidā Māris Štrombergs divreiz kļuva par olimpisko čempionu?',
      'BMX riteņbraukšanā',
      20,
      'Sports',
      { hostNotes: 'Pekinā 2008 un Londonā 2012.' },
    ),
    choice(
      'Kā tautā sauc Latvijas Nacionālās bibliotēkas ēku, ko projektējis Gunārs Birkerts?',
      ['Saules pils', 'Gaismas pils', 'Zinību nams', 'Zelta pils'],
      1,
      10,
      'Kultūra',
    ),
    q(
      'Kurš Rīgā dzimušais inženieris ir viens no raķešu tehnikas un starpplanētu lidojumu teorijas pionieriem?',
      'Fridrihs Canders',
      30,
      'Zinātne',
    ),
    choice(
      'Kurā pilsētā 1935. gadā Latvijas basketbola izlase kļuva par pirmajiem Eiropas čempioniem?',
      ['Ženēvā', 'Berlīnē', 'Rīgā', 'Kauņā'],
      0,
      30,
      'Sports',
    ),
    q('Kurš ir Latvijas vecākais nacionālais parks?', 'Gaujas Nacionālais parks', 30, 'Daba', { hostNotes: 'Izveidots 1973. gadā.' }),
    choice(
      'Kura rakstniece sarakstīja pasaku lugu „Sprīdītis”?',
      ['Aspazija', 'Anna Brigadere', 'Regīna Ezera', 'Vizma Belševica'],
      1,
      20,
      'Literatūra',
    ),
    q('No kā tika pārbūvēti Rīgas Centrāltirgus paviljoni?', 'No vācu cepelīnu angāriem', 30, 'Kultūra', {
      hostNotes: 'Pirmā pasaules kara angāri no Vaiņodes.',
    }),
  ]);

  const semi2 = set('2. pusfināls', [
    q('Kā tautā sauc trīs viduslaiku dzīvojamās ēkas Mazajā Pils ielā Rīgā?', '„Trīs brāļi”', 10, 'Kultūra'),
    choice('Kāda krāsa Latvijas karogā ir starp abām karmīnsarkanajām joslām?', ['Balta', 'Zila', 'Zaļa', 'Dzeltena'], 0, 10, 'Valsts'),
    q('Kurā gadā tika atklāts Brīvības piemineklis Rīgā?', '1935. gadā', 20, 'Vēsture', { hostNotes: 'Atklāts 1935. gada 18. novembrī.' }),
    choice('Kas attēlots uz Latvijas 1 un 2 eiro monētām?', ['Latvju meita', 'Brīvības piemineklis', 'Lielais ģerbonis', 'Rīgas panorāma'], 0, 20, 'Valsts', {
      hostNotes: 'Tas pats meitas tēls bija uz 5 latu sudraba monētas.',
    }),
    q('Kura bija pirmā sieviete Latvijas Valsts prezidentes amatā?', 'Vaira Vīķe-Freiberga', 20, 'Valsts', { hostNotes: 'Prezidente 1999–2007.' }),
    choice('Kurš komponists sarakstīja kora dziesmu „Gaismas pils”?', ['Jāzeps Vītols', 'Emīls Dārziņš', 'Raimonds Pauls', 'Pēteris Vasks'], 0, 20, 'Kultūra', {
      hostNotes: 'Vārdi — Auseklis.',
    }),
    audience('Jānis no Valmieras', 'Kurš latviešu basketbolists 2024. gadā kļuva par NBA čempionu ar „Boston Celtics”?', 'Kristaps Porziņģis', 20, 'Sports'),
    q('Kurus svētkus latvieši tradicionāli svin, velkot bluķi?', 'Ziemassvētkus (ziemas saulgriežus)', 10, 'Tradīcijas'),
    q('Kā sauc slaveno sarkanbalto rakstaino jostu, kuras rakstos, pēc nostāsta, ierakstīta visa pasaule?', 'Lielvārdes josta', 20, 'Tradīcijas'),
    choice('Kuri dzīvnieki tur Latvijas lielo valsts ģerboni?', ['Lauva un grifs', 'Lācis un ērglis', 'Briedis un vilks', 'Zirgs un lauva'], 0, 30, 'Valsts'),
    q('Kurš Rīgā dzimušais šahists 1960. gadā kļuva par pasaules čempionu?', 'Mihails Tāls', 30, 'Sports'),
    q('Kurā gadā Rīgā notika barikādes?', '1991. gadā', 20, 'Vēsture', { hostNotes: '1991. gada janvārī.' }),
  ]);

  const final = set('Fināls', [
    q(
      'Kurā Rīgas ēkā 1918. gada 18. novembrī tika proklamēta Latvijas Republika?',
      'Tagadējā Latvijas Nacionālajā teātrī',
      0,
      'Vēsture',
      { hostNotes: 'Toreiz — Rīgas pilsētas 2. teātris.' },
    ),
    q('Kurš latvietis 1968. gadā Mehiko kļuva par olimpisko čempionu šķēpa mešanā?', 'Jānis Lūsis', 0, 'Sports'),
    q('Kurā Latvijas pilsētā dzimis gleznotājs Marks Rotko?', 'Daugavpilī', 0, 'Kultūra', {
      hostNotes: 'Dzimis 1903. gadā; Daugavpilī ir Marka Rotko mākslas centrs.',
    }),
    q('Kāds ir Latvijas starptautiskais tālruņa kods?', '+371', 0, 'Zinātne'),
    q('Cik deputātu ir Latvijas Saeimā?', '100', 0, 'Valsts'),
  ]);

  const golden = set('Zelta jautājumi', [
    q('Kurā gadā tika pieņemta deklarācija par Latvijas neatkarības atjaunošanu?', '1990. gadā', 10, 'Vēsture'),
    q('Kurš sakārtoja latviešu tautasdziesmu krājumu „Latvju dainas”?', 'Krišjānis Barons', 10, 'Kultūra'),
    q('Kurā datumā svin Mārtiņdienu?', '10. novembrī', 10, 'Tradīcijas'),
    q('Kurā gadā Latvijā ieviesa eiro?', '2014. gadā', 10, 'Vēsture'),
    q('Kāds bija Turaidas Rozes īstais vārds?', 'Maija', 10, 'Kultūra'),
    q('Kurā gadā tika dibināta Latvijas Universitāte?', '1919. gadā', 10, 'Vēsture'),
  ]);

  return { game1, game2, game3, semi1, semi2, final, golden };
}

const TEAMS: [string, string, string[]][] = [
  ['Gudrās Pūces', 'Anna Kalniņa', ['Pēteris Ozols', 'Līga Bērziņa', 'Mārtiņš Liepa']],
  ['Daugavas Viļņi', 'Jānis Krūmiņš', ['Ieva Jansone', 'Edgars Zariņš', 'Dace Vītola']],
  ['Gaiziņa Ērgļi', 'Kristīne Sproģe', ['Raivis Āboliņš', 'Elīna Putniņa', 'Gatis Ločmelis']],
  ['Rīgas Runči', 'Toms Eglītis', ['Zane Kļaviņa', 'Uldis Grīnbergs', 'Sanita Cīrule']],
  ['Latgales Lāči', 'Valdis Šķēle', ['Inga Ruskule', 'Oskars Ģērmanis', 'Laura Žagare']],
  ['Kurzemes Vēji', 'Agnese Dūmiņa', ['Kārlis Celms', 'Signe Bauma', 'Rūdolfs Ķezbers']],
];

export function createDemoTournament(): Tournament {
  const settings = { ...DEFAULT_SETTINGS };
  const teams: Team[] = TEAMS.map(([name, captain, members], i) => ({
    id: uid('team'),
    name,
    color: TEAM_COLORS[i],
    captain,
    members,
    score: 0,
  }));
  const sets = demoQuestionSets();
  const matches = getScheme('six')!.build(settings);
  const [m1, m2, m3, sf1, sf2, final] = matches;
  m1.questionSetId = sets.game1.id;
  m2.questionSetId = sets.game2.id;
  m2.answerMode = 'buzzer';
  m3.questionSetId = sets.game3.id;
  sf1.questionSetId = sets.semi1.id;
  sf2.questionSetId = sets.semi2.id;
  final.questionSetId = sets.final.id;
  // Pāri jau sadalīti, lai var sākt uzreiz (pultī tos var izlozēt no jauna).
  [m1, m2, m3].forEach((m, i) => (m.teams = [teams[i * 2].id, teams[i * 2 + 1].id]));

  return {
    id: uid('t'),
    name: 'Prāta spēles',
    subtitle: 'Erudīcijas turnīrs par Latviju',
    schemeId: 'six',
    teams,
    matches,
    questionSets: Object.values(sets),
    goldenSetId: sets.golden.id,
    rules: defaultRules(),
    settings,
    championId: null,
  };
}

export function createDemoState(): AppState {
  return { version: 1, tournament: createDemoTournament(), live: createLive() };
}
