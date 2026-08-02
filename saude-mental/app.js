/* ============================================================
   Respira — app de auto-avaliação e cuidado com a saúde mental
   Tudo roda no aparelho da pessoa. Nenhum dado é enviado a servidores.
   IMPORTANTE: não é diagnóstico nem substitui ajuda profissional.
   ============================================================ */

/* ---------- Instrumentos validados ---------- */

// Escala de respostas comum ao PHQ-9 e GAD-7 (últimas 2 semanas)
const SCALE = [
  { label: "Nenhuma vez", value: 0 },
  { label: "Vários dias", value: 1 },
  { label: "Mais da metade dos dias", value: 2 },
  { label: "Quase todos os dias", value: 3 },
];

// PHQ-9 — rastreio de sintomas de depressão
const PHQ9 = {
  id: "phq9",
  name: "Como você tem se sentido",
  subtitle: "9 perguntas sobre o seu humor",
  intro: "Nas últimas 2 semanas, com que frequência você foi incomodado(a) por algum dos problemas abaixo?",
  maxScore: 27,
  criticalItem: 8, // índice da pergunta sobre pensamentos de se ferir (0-based)
  questions: [
    "Pouco interesse ou pouco prazer em fazer as coisas",
    "Se sentir “para baixo”, deprimido(a) ou sem perspectiva",
    "Dificuldade para pegar no sono, permanecer dormindo, ou dormir mais do que de costume",
    "Se sentir cansado(a) ou com pouca energia",
    "Falta de apetite ou comer demais",
    "Se sentir mal consigo mesmo(a), achar que é um fracasso ou que decepcionou a si ou à família",
    "Dificuldade para se concentrar nas coisas, como ler ou ver televisão",
    "Lentidão para se mover ou falar (a ponto de outros notarem), ou o contrário: estar tão agitado(a) que anda de um lado para o outro mais que o normal",
    "Pensar que seria melhor estar morto(a) ou em se ferir de alguma maneira",
  ],
  levels: [
    { max: 4,  tag: "Mínimo",            color: "#7bb0a3", msg: "Seus sintomas de depressão parecem estar em um nível baixo neste momento. Que bom. Continue cuidando de você." },
    { max: 9,  tag: "Leve",              color: "#8fb46a", msg: "Você tem sentido alguns sintomas leves. Vale observar como você se sente nas próximas semanas e caprichar no autocuidado." },
    { max: 14, tag: "Moderado",          color: "#e0b352", msg: "Seus sintomas sugerem um nível moderado. Pode ser um bom momento para conversar com um psicólogo ou médico." },
    { max: 19, tag: "Moderado a intenso", color: "#e08a52", msg: "Você tem sentido bastante coisa. Procurar apoio profissional pode fazer uma diferença real em como você se sente." },
    { max: 27, tag: "Intenso",           color: "#d5766a", msg: "Seus sintomas estão em um nível intenso. Por favor, não carregue isso sozinho(a) — buscar ajuda profissional agora é muito importante." },
  ],
};

// GAD-7 — rastreio de sintomas de ansiedade
const GAD7 = {
  id: "gad7",
  name: "Como está a sua ansiedade",
  subtitle: "7 perguntas sobre preocupação e tensão",
  intro: "Nas últimas 2 semanas, com que frequência você foi incomodado(a) por algum dos problemas abaixo?",
  maxScore: 21,
  criticalItem: -1,
  questions: [
    "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)",
    "Não conseguir parar ou controlar as preocupações",
    "Preocupar-se muito com diversas coisas",
    "Dificuldade para relaxar",
    "Ficar tão agitado(a) que se torna difícil permanecer sentado(a)",
    "Ficar facilmente aborrecido(a) ou irritado(a)",
    "Sentir medo, como se algo terrível fosse acontecer",
  ],
  levels: [
    { max: 4,  tag: "Mínimo",   color: "#7bb0a3", msg: "Sua ansiedade parece estar num nível baixo agora. Continue cuidando dos seus momentos de descanso." },
    { max: 9,  tag: "Leve",     color: "#8fb46a", msg: "Você tem sentido uma ansiedade leve. Técnicas de respiração e pausas ao longo do dia podem ajudar bastante." },
    { max: 14, tag: "Moderado", color: "#e0b352", msg: "Sua ansiedade está num nível moderado. Considere conversar com um profissional sobre o que você tem sentido." },
    { max: 21, tag: "Intenso",  color: "#d5766a", msg: "Você tem sentido uma ansiedade intensa. Buscar apoio profissional pode te ajudar a encontrar mais alívio e equilíbrio." },
  ],
};

const TESTS = { phq9: PHQ9, gad7: GAD7 };

/* ---------- Armazenamento local (privacidade primeiro) ---------- */
const STORE_KEY = "respira.historico.v1";

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveResult(entry) {
  const h = loadHistory();
  h.unshift(entry);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(h.slice(0, 100))); } catch {}
}
function clearHistory() {
  try { localStorage.removeItem(STORE_KEY); } catch {}
}

/* ---------- Diário de humor (também só no aparelho) ---------- */
const MOOD_KEY = "respira.humor.v1";
const MOODS = [
  { value: 1, emoji: "😢", label: "Muito mal", color: "#d5766a" },
  { value: 2, emoji: "😟", label: "Mal",       color: "#e08a52" },
  { value: 3, emoji: "😐", label: "Mais ou menos", color: "#e0b352" },
  { value: 4, emoji: "🙂", label: "Bem",       color: "#8fb46a" },
  { value: 5, emoji: "😄", label: "Muito bem", color: "#7bb0a3" },
];
function loadMoods() {
  try { return JSON.parse(localStorage.getItem(MOOD_KEY)) || []; }
  catch { return []; }
}
function saveMood(entry) {
  const m = loadMoods();
  m.push(entry);
  try { localStorage.setItem(MOOD_KEY, JSON.stringify(m.slice(-365))); } catch {}
}
function clearMoods() {
  try { localStorage.removeItem(MOOD_KEY); } catch {}
}
function moodInfo(v) { return MOODS.find((m) => m.value === v) || MOODS[2]; }

/* ---------- Conteúdo educativo ---------- */
const ARTICLES = [
  {
    id: "depressao",
    icon: "🌧️",
    title: "O que é depressão?",
    lead: "Não é frescura, nem falta de fé ou de força de vontade.",
    body: [
      { h: "Uma doença de verdade", p: "A depressão é uma condição de saúde, como diabetes ou pressão alta. Ela afeta o humor, o corpo e a forma de pensar. Não é escolha da pessoa, e ninguém sai dela só “se esforçando mais”." },
      { h: "Sinais comuns", p: "Tristeza ou vazio que não passa, perda de interesse por coisas que antes davam prazer, cansaço constante, mudanças no sono e no apetite, dificuldade de concentração, sensação de culpa ou de ser um peso. Quando isso dura mais de duas semanas, vale procurar ajuda." },
      { h: "A boa notícia", p: "A depressão tem tratamento e a maioria das pessoas melhora. Psicoterapia, e em alguns casos medicação, funcionam. Quanto mais cedo se busca ajuda, mais fácil é o caminho." },
    ],
  },
  {
    id: "ansiedade",
    icon: "🌀",
    title: "O que é ansiedade?",
    lead: "Sentir ansiedade é normal. O problema é quando ela toma conta.",
    body: [
      { h: "Ansiedade normal x transtorno", p: "Ficar ansioso antes de uma prova ou entrevista é natural e até útil. Vira transtorno quando a preocupação é intensa, frequente, difícil de controlar e começa a atrapalhar o sono, o trabalho e as relações." },
      { h: "Como ela aparece", p: "Coração acelerado, respiração curta, tensão no corpo, mente que não desliga, medo de que algo ruim vá acontecer, irritação e dificuldade para relaxar." },
      { h: "O que ajuda", p: "Técnicas de respiração e de atenção plena ajudam no dia a dia. Mas se a ansiedade está grande, um psicólogo pode te ensinar ferramentas que fazem muita diferença — e um médico avaliar se algo mais é necessário." },
    ],
  },
  {
    id: "mitos",
    icon: "💡",
    title: "Mitos e verdades sobre suicídio",
    lead: "Falar sobre isso, do jeito certo, salva vidas.",
    body: [
      { h: "Mito: falar sobre suicídio “dá a ideia”", p: "Verdade: perguntar com cuidado e ouvir sem julgar alivia a dor e reduz o risco. O silêncio é que isola. Falar abre uma porta para a pessoa buscar ajuda." },
      { h: "Mito: quem fala que quer morrer não faz", p: "Verdade: a maioria das pessoas dá sinais antes. Todo sinal deve ser levado a sério, sempre — nunca é “só chamar atenção”." },
      { h: "Mito: é fraqueza ou falta de fé", p: "Verdade: pensamentos suicidas quase sempre vêm de um sofrimento intenso e de uma dor que parece sem saída, muitas vezes ligada a uma doença tratável, como a depressão. Não é caráter, é dor." },
      { h: "Verdade: a crise passa", p: "O desejo de morrer costuma ser sobre parar de sofrer, não sobre a vida em si. Com apoio, a maioria das pessoas atravessa a crise e volta a querer viver. Por isso pedir ajuda no momento certo muda tudo." },
    ],
  },
  {
    id: "ajudar",
    icon: "🤝",
    title: "Como ajudar alguém",
    lead: "Você não precisa ter as respostas. Presença já é muito.",
    body: [
      { h: "Escute de verdade", p: "Deixe a pessoa falar sem interromper, sem julgar e sem tentar “consertar” na hora. Frases como “estou aqui com você” valem mais do que conselhos." },
      { h: "Não minimize", p: "Evite “isso é bobagem”, “tem gente pior” ou “é só pensar positivo”. Isso, mesmo sem querer, faz a pessoa se sentir mais sozinha. Valide a dor: “deve estar sendo muito difícil”." },
      { h: "Pergunte diretamente", p: "Se você suspeita, pode perguntar com carinho: “você tem pensado em desistir de viver?”. Perguntar não coloca a ideia — mostra que você se importa e abre espaço para a pessoa dividir o peso." },
      { h: "Incentive a ajuda certa", p: "Ofereça-se para procurar junto um profissional, ligar para o CVV (188) ou acompanhar a pessoa a um serviço de saúde. Em risco imediato, não a deixe sozinha e acione o SAMU (192)." },
    ],
  },
  {
    id: "sinais",
    icon: "🚩",
    title: "Sinais de alerta",
    lead: "Quando é hora de buscar ajuda com mais urgência.",
    body: [
      { h: "Preste atenção se você (ou alguém) apresenta", p: "Falar em morrer, em ser um peso ou em não ver saída; se isolar de todos; dar adeus ou doar objetos importantes; mudanças bruscas de humor; aumento no uso de álcool ou drogas; perda de esperança no futuro." },
      { h: "Procure ajuda hoje se", p: "A dor parece insuportável, os pensamentos de se ferir aparecem com frequência, ou você sente que não consegue mais dar conta sozinho(a). Não é preciso esperar “piorar” para pedir ajuda." },
      { h: "Onde", p: "CVV 188 (24h, gratuito e sigiloso), CAPS e postos de saúde do SUS. Em emergência com risco à vida, SAMU 192 ou o pronto-socorro mais próximo." },
    ],
  },
];

/* ---------- Estado da avaliação em andamento ---------- */
let session = null; // { test, index, answers[] }

/* ---------- Utilidades ---------- */
const app = document.getElementById("app");
function levelFor(test, score) {
  return test.levels.find((l) => score <= l.max) || test.levels[test.levels.length - 1];
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ============================================================
   Telas
   ============================================================ */

function renderHome() {
  session = null;
  const h = loadHistory();
  app.innerHTML = `
    <section class="screen">
      <div class="hero">
        <img class="hero__logo" src="icons/icon.svg" alt="" />
        <h1>Respira</h1>
        <p>Um espaço tranquilo para você perceber, cedo e com carinho, como anda a sua mente.</p>
        <span class="badge-privacy">🔒 Tudo fica só no seu aparelho</span>
      </div>

      <button class="menu-tile" data-go="test:phq9">
        <span class="menu-tile__icon">🌧️</span>
        <span class="menu-tile__text"><strong>Avaliar meu humor</strong><small>Sintomas de depressão · 9 perguntas · 2 min</small></span>
      </button>

      <button class="menu-tile" data-go="test:gad7">
        <span class="menu-tile__icon">🌀</span>
        <span class="menu-tile__text"><strong>Avaliar minha ansiedade</strong><small>Preocupação e tensão · 7 perguntas · 2 min</small></span>
      </button>

      <button class="menu-tile" data-go="mood">
        <span class="menu-tile__icon">📔</span>
        <span class="menu-tile__text"><strong>Diário de humor</strong><small>Registre como você está e acompanhe sua evolução</small></span>
      </button>

      <button class="menu-tile" data-go="learn">
        <span class="menu-tile__icon">📚</span>
        <span class="menu-tile__text"><strong>Aprender sobre saúde mental</strong><small>Depressão, ansiedade, mitos e como ajudar</small></span>
      </button>

      <button class="menu-tile" data-go="breathe">
        <span class="menu-tile__icon">🍃</span>
        <span class="menu-tile__text"><strong>Respirar por 1 minuto</strong><small>Um exercício rápido para acalmar</small></span>
      </button>

      <button class="menu-tile" data-go="resources">
        <span class="menu-tile__icon">🤝</span>
        <span class="menu-tile__text"><strong>Onde buscar ajuda</strong><small>Contatos e primeiros passos</small></span>
      </button>

      ${h.length ? `
      <button class="menu-tile" data-go="history">
        <span class="menu-tile__icon">📈</span>
        <span class="menu-tile__text"><strong>Meu histórico</strong><small>${h.length} avaliação${h.length > 1 ? "ões" : ""} salva${h.length > 1 ? "s" : ""}</small></span>
      </button>` : ""}

      <p class="disclaimer">
        <strong>Importante:</strong> este app é uma ajuda para você se conhecer melhor. Ele <strong>não é um diagnóstico</strong> e <strong>não substitui</strong> um psicólogo, psiquiatra ou médico. Se você está sofrendo, procurar um profissional é o passo mais importante.
      </p>
    </section>`;
}

function startTest(id) {
  session = { test: TESTS[id], index: 0, answers: [] };
  renderQuestion();
}

function renderQuestion() {
  const { test, index, answers } = session;
  const total = test.questions.length;
  const pct = Math.round((index / total) * 100);
  const selected = answers[index];

  app.innerHTML = `
    <section class="screen">
      <div class="card">
        <div class="q-header">
          <button class="back-link" data-go="home">&larr; Sair</button>
          <span class="q-count">Pergunta ${index + 1} de ${total}</span>
          <div class="progress"><div class="progress__bar" style="width:${pct}%"></div></div>
        </div>
        ${index === 0 ? `<p class="q-sub">${escapeHtml(test.intro)}</p>` : ""}
        <p class="q-text">${escapeHtml(test.questions[index])}</p>
        <div class="options">
          ${SCALE.map((opt) => `
            <div class="option ${selected === opt.value ? "selected" : ""}" data-answer="${opt.value}">
              <span class="option__dot"></span>
              <span>${opt.label}</span>
            </div>`).join("")}
        </div>
        <div class="q-nav">
          ${index > 0 ? `<button class="btn btn--ghost" data-nav="prev">Voltar</button>` : ""}
          <button class="btn btn--primary" data-nav="next" ${selected === undefined ? "disabled" : ""}>
            ${index === total - 1 ? "Ver resultado" : "Próxima"}
          </button>
        </div>
      </div>
    </section>`;
}

function finishTest() {
  const { test, answers } = session;
  const score = answers.reduce((a, b) => a + b, 0);
  const level = levelFor(test, score);
  const criticalFlag = test.criticalItem >= 0 && answers[test.criticalItem] > 0;

  saveResult({
    testId: test.id,
    testName: test.name,
    score,
    max: test.maxScore,
    tag: level.tag,
    color: level.color,
    critical: criticalFlag,
    ts: Date.now(),
  });

  renderResult({ test, score, level, criticalFlag });
}

function renderResult({ test, score, level, criticalFlag }) {
  const pct = score / test.maxScore;
  const circ = 2 * Math.PI * 65;
  const dash = circ * pct;

  const crisisBlock = criticalFlag ? `
    <div class="card" style="border:2px solid var(--danger); background:rgba(213,118,106,0.06);">
      <h2 style="color:var(--danger)">Você merece cuidado agora 💚</h2>
      <p style="color:var(--ink)">Você marcou que tem tido pensamentos sobre se ferir ou de que seria melhor não estar aqui. Isso é sinal de que a dor está grande demais para carregar sozinho(a) — e você não precisa.</p>
      <a class="btn btn--primary" href="tel:188" style="background:var(--danger); margin-top:6px;">📞 Ligar agora para o CVV — 188</a>
      <a class="btn btn--ghost" href="https://www.cvv.org.br/chat/" target="_blank" rel="noopener">💬 Conversar por chat com o CVV</a>
    </div>` : "";

  app.innerHTML = `
    <section class="screen">
      ${crisisBlock}
      <div class="card" style="text-align:center">
        <div class="result-ring">
          <svg width="150" height="150" viewBox="0 0 150 150">
            <circle cx="75" cy="75" r="65" fill="none" stroke="rgba(91,124,157,0.15)" stroke-width="12" />
            <circle cx="75" cy="75" r="65" fill="none" stroke="${level.color}" stroke-width="12"
              stroke-linecap="round" stroke-dasharray="${dash} ${circ}" />
          </svg>
          <div class="result-ring__label"><b>${score}</b><span>de ${test.maxScore}</span></div>
        </div>
        <span class="level-tag" style="background:${level.color}22; color:${level.color}">${level.tag}</span>
        <p class="result-message">${level.msg}</p>
      </div>

      <div class="card">
        <h2>Próximos passos</h2>
        <ul class="next-steps">
          <li>💬 Fale com alguém de confiança sobre como você tem se sentido — dividir alivia.</li>
          <li>🩺 Considere marcar uma conversa com um psicólogo ou médico. O SUS oferece isso gratuitamente pelo <strong>CAPS</strong> e postos de saúde.</li>
          <li>🍃 Cuide do básico: sono, comida, um pouco de sol e movimento. Pequenos passos contam.</li>
          <li>🔁 Refaça esta avaliação daqui a 1 ou 2 semanas para acompanhar como você está.</li>
        </ul>
        <button class="btn btn--accent" data-go="resources" style="margin-top:8px">Ver onde buscar ajuda</button>
        <button class="btn btn--ghost" data-go="home">Voltar ao início</button>
      </div>

      <p class="disclaimer"><strong>Lembre-se:</strong> este resultado é apenas um retrato de como você tem se sentido, não um diagnóstico. Só um profissional de saúde pode avaliar isso com você.</p>
    </section>`;
}

function renderResources() {
  app.innerHTML = `
    <section class="screen">
      <button class="back-link" data-go="home">&larr; Início</button>
      <h1>Onde buscar ajuda</h1>
      <p>Pedir ajuda é um ato de coragem. Estes contatos são gratuitos e sigilosos.</p>

      <a class="help-card help-card--call" href="tel:188">
        <span class="help-card__badge">188</span>
        <span class="help-card__body"><strong>CVV — Centro de Valorização da Vida</strong><small>Apoio emocional 24h, por telefone. Gratuito e sigiloso.</small></span>
      </a>
      <a class="help-card" href="https://www.cvv.org.br/" target="_blank" rel="noopener">
        <span class="help-card__badge">💬</span>
        <span class="help-card__body"><strong>CVV por chat e e-mail</strong><small>cvv.org.br — se você preferir escrever</small></span>
      </a>
      <a class="help-card" href="tel:192">
        <span class="help-card__badge">192</span>
        <span class="help-card__body"><strong>SAMU</strong><small>Emergência médica, se há risco imediato à vida</small></span>
      </a>
      <div class="help-card">
        <span class="help-card__badge">🏥</span>
        <span class="help-card__body"><strong>CAPS — Centro de Atenção Psicossocial</strong><small>Atendimento de saúde mental gratuito pelo SUS. Procure o CAPS ou posto de saúde mais próximo da sua cidade.</small></span>
      </div>

      <p class="disclaimer">Se você está em perigo imediato, ligue <strong>192</strong> (SAMU) ou vá ao pronto-socorro mais próximo. Você importa. 💚</p>
    </section>`;
}

function renderHistory() {
  const h = loadHistory();
  app.innerHTML = `
    <section class="screen">
      <button class="back-link" data-go="home">&larr; Início</button>
      <h1>Meu histórico</h1>
      <p>Acompanhar ao longo do tempo ajuda a perceber padrões. Isto fica salvo só no seu aparelho.</p>
      <div class="card">
        ${h.length === 0 ? `<div class="empty">Você ainda não fez nenhuma avaliação.</div>` :
          h.map((e) => `
            <div class="history-item">
              <div>
                <div><span class="history-dot" style="background:${e.color}"></span><strong>${escapeHtml(e.testName)}</strong>${e.critical ? " ⚠️" : ""}</div>
                <div class="history-item__date">${fmtDate(e.ts)} · ${e.tag}</div>
              </div>
              <div style="font-weight:700; color:${e.color}">${e.score}/${e.max}</div>
            </div>`).join("")}
      </div>
      ${h.length ? `<button class="btn btn--ghost" data-go="clear">Apagar meu histórico</button>` : ""}
    </section>`;
}

/* ---------- Diário de humor ---------- */
let moodDraft = { value: undefined, note: "" };

function renderMood() {
  moodDraft = { value: undefined, note: "" };
  const moods = loadMoods();
  app.innerHTML = `
    <section class="screen">
      <button class="back-link" data-go="home">&larr; Início</button>
      <h1>Diário de humor</h1>
      <p>Registrar como você está ajuda a perceber padrões ao longo do tempo. Fica só no seu aparelho.</p>

      <div class="card">
        <h2>Como você está se sentindo hoje?</h2>
        <div class="mood-picker" id="moodPicker">
          ${MOODS.map((m) => `
            <button class="mood-opt" data-mood="${m.value}" title="${m.label}">
              <span class="mood-opt__emoji">${m.emoji}</span>
              <span class="mood-opt__label">${m.label}</span>
            </button>`).join("")}
        </div>
        <textarea id="moodNote" class="mood-note" rows="2" placeholder="Quer anotar algo? (opcional)"></textarea>
        <button class="btn btn--primary" id="saveMoodBtn" disabled>Salvar de hoje</button>
      </div>

      ${moods.length ? `
      <div class="card">
        <h2>Sua evolução</h2>
        ${buildMoodChart(moods)}
        <p class="muted" style="text-align:center; margin-top:10px">Últimos ${Math.min(moods.length, 30)} registros</p>
      </div>
      <button class="btn btn--ghost" data-go="clearMood">Apagar meu diário</button>
      ` : `<p class="disclaimer">Faça seu primeiro registro para começar a acompanhar sua evolução. 🌱</p>`}
    </section>`;
}

function buildMoodChart(moods) {
  const data = moods.slice(-30);
  const W = 300, H = 140, padX = 14, padY = 18;
  const n = data.length;
  const stepX = n > 1 ? (W - padX * 2) / (n - 1) : 0;
  const y = (v) => padY + (5 - v) / 4 * (H - padY * 2);
  const x = (i) => padX + i * stepX;

  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const dots = data.map((d, i) => {
    const c = moodInfo(d.value).color;
    return `<circle cx="${x(i).toFixed(1)}" cy="${y(d.value).toFixed(1)}" r="4" fill="${c}"><title>${fmtDate(d.ts)}: ${moodInfo(d.value).label}</title></circle>`;
  }).join("");
  const grid = [1, 2, 3, 4, 5].map((v) => `<line x1="${padX}" y1="${y(v)}" x2="${W - padX}" y2="${y(v)}" stroke="rgba(91,124,157,0.12)" stroke-width="1"/>`).join("");

  return `
    <div class="chart-wrap">
      <div class="chart-emojis">${[5,4,3,2,1].map((v)=>`<span>${moodInfo(v).emoji}</span>`).join("")}</div>
      <svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="none">
        ${grid}
        ${n > 1 ? `<polyline points="${points}" fill="none" stroke="#5b7c9d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
        ${dots}
      </svg>
    </div>`;
}

function renderLearn() {
  app.innerHTML = `
    <section class="screen">
      <button class="back-link" data-go="home">&larr; Início</button>
      <h1>Aprender sobre saúde mental</h1>
      <p>Entender ajuda a cuidar — de você e de quem você ama.</p>
      ${ARTICLES.map((a) => `
        <button class="menu-tile" data-article="${a.id}">
          <span class="menu-tile__icon">${a.icon}</span>
          <span class="menu-tile__text"><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.lead)}</small></span>
        </button>`).join("")}
      <p class="disclaimer">Estes textos são informativos e não substituem a orientação de um profissional de saúde.</p>
    </section>`;
}

function renderArticle(id) {
  const a = ARTICLES.find((x) => x.id === id);
  if (!a) return renderLearn();
  app.innerHTML = `
    <section class="screen">
      <button class="back-link" data-go="learn">&larr; Voltar</button>
      <h1>${a.icon} ${escapeHtml(a.title)}</h1>
      <p style="font-size:1.05rem; color:var(--ink)">${escapeHtml(a.lead)}</p>
      ${a.body.map((s) => `
        <div class="card">
          <h2>${escapeHtml(s.h)}</h2>
          <p>${escapeHtml(s.p)}</p>
        </div>`).join("")}
      <button class="btn btn--accent" data-go="resources">Onde buscar ajuda</button>
      <button class="btn btn--ghost" data-go="learn">Ver outros temas</button>
    </section>`;
}

/* ---------- Exercício de respiração ---------- */
let breatheTimer = null;
function renderBreathe() {
  app.innerHTML = `
    <section class="screen" style="text-align:center">
      <button class="back-link" data-go="home">&larr; Início</button>
      <h1>Respire comigo</h1>
      <p>Siga o círculo. Inspire quando ele cresce, expire quando ele encolhe.</p>
      <div class="breathe-circle" id="breatheCircle">🍃</div>
      <div class="breathe-text" id="breatheText">Prepare-se…</div>
    </section>`;

  const circle = document.getElementById("breatheCircle");
  const text = document.getElementById("breatheText");
  const phases = [
    { cls: "inhale", label: "Inspire…", ms: 4000 },
    { cls: "", label: "Segure…", ms: 4000 },
    { cls: "exhale", label: "Expire…", ms: 4000 },
  ];
  let i = 0;
  function step() {
    const p = phases[i % phases.length];
    circle.className = "breathe-circle " + p.cls;
    text.textContent = p.label;
    i++;
    breatheTimer = setTimeout(step, p.ms);
  }
  clearTimeout(breatheTimer);
  step();
}
function stopBreathe() { if (breatheTimer) { clearTimeout(breatheTimer); breatheTimer = null; } }

/* ============================================================
   Roteamento / eventos
   ============================================================ */
function go(route) {
  stopBreathe();
  if (route === "home") return renderHome();
  if (route === "resources") return renderResources();
  if (route === "history") return renderHistory();
  if (route === "breathe") return renderBreathe();
  if (route === "mood") return renderMood();
  if (route === "learn") return renderLearn();
  if (route === "clear") {
    if (confirm("Tem certeza que deseja apagar todo o seu histórico? Isso não pode ser desfeito.")) {
      clearHistory();
    }
    return renderHistory();
  }
  if (route === "clearMood") {
    if (confirm("Apagar todos os registros do seu diário de humor? Isso não pode ser desfeito.")) {
      clearMoods();
    }
    return renderMood();
  }
  if (route.startsWith("test:")) return startTest(route.split(":")[1]);
}

app.addEventListener("click", (e) => {
  const goEl = e.target.closest("[data-go]");
  if (goEl) { e.preventDefault(); return go(goEl.dataset.go); }

  // Abrir um artigo educativo
  const artEl = e.target.closest("[data-article]");
  if (artEl) return renderArticle(artEl.dataset.article);

  // Diário de humor: escolher o humor
  const moodEl = e.target.closest("[data-mood]");
  if (moodEl) {
    moodDraft.value = Number(moodEl.dataset.mood);
    document.querySelectorAll(".mood-opt").forEach((el) => el.classList.remove("selected"));
    moodEl.classList.add("selected");
    const btn = document.getElementById("saveMoodBtn");
    if (btn) btn.disabled = false;
    return;
  }

  // Diário de humor: salvar
  if (e.target.closest("#saveMoodBtn")) {
    if (moodDraft.value === undefined) return;
    const noteEl = document.getElementById("moodNote");
    saveMood({ value: moodDraft.value, note: noteEl ? noteEl.value.trim().slice(0, 280) : "", ts: Date.now() });
    return renderMood();
  }

  const opt = e.target.closest("[data-answer]");
  if (opt && session) {
    session.answers[session.index] = Number(opt.dataset.answer);
    renderQuestion();
    return;
  }

  const nav = e.target.closest("[data-nav]");
  if (nav && session) {
    if (nav.dataset.nav === "prev") {
      session.index = Math.max(0, session.index - 1);
      return renderQuestion();
    }
    if (nav.dataset.nav === "next") {
      if (session.answers[session.index] === undefined) return;
      if (session.index === session.test.questions.length - 1) return finishTest();
      session.index++;
      return renderQuestion();
    }
  }
});

/* ---------- Modal de crise (barra vermelha) ---------- */
const crisisBar = document.getElementById("crisisBar");
const crisisModal = document.getElementById("crisisModal");
crisisBar.addEventListener("click", (e) => { e.preventDefault(); crisisModal.hidden = false; });
crisisModal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) crisisModal.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") crisisModal.hidden = true; });

/* ---------- Service worker (funciona offline) ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

/* ---------- Início ---------- */
renderHome();
