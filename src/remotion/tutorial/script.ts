/**
 * Roteiro do vídeo tutorial "Como jogar Tiny Planet Industries".
 * Cada cena tem a narração (também usada como legenda), a captura de tela
 * e os elementos a destacar (âncoras medidas automaticamente pelo script
 * scripts/tutorial-shots.mjs).
 */

export interface Highlight {
  /** Âncora "captura.nome" no manifesto de capturas. */
  target: string;
  label?: string;
  side?: "top" | "bottom" | "left" | "right";
  shape?: "rect" | "circle";
  /** Atraso (fração da cena, 0–1) até aparecer. */
  at?: number;
}

export interface Scene {
  id: string;
  chapter: number;
  kind: "intro" | "chapter" | "shot" | "shortcuts" | "outro";
  text: string;
  shot?: string;
  /** Âncora para dar zoom. */
  zoom?: string;
  zoomScale?: number;
  highlights?: Highlight[];
  cursor?: { target: string; click?: boolean; drag?: string };
  keys?: string[];
}

export const CHAPTERS = [
  "Introdução",
  "A tela do jogo",
  "Andando pelo planeta",
  "Coletando recursos",
  "Construindo",
  "Estradas e caminhões",
  "Energia",
  "Fábricas e o painel do edifício",
  "Mercado e dinheiro",
  "Expandindo o território",
  "Pesquisa e tecnologia",
  "Poluição e meio ambiente",
  "Rumo a novos planetas",
  "Atalhos e dicas finais",
];

export const SCENES: Scene[] = [
  {
    id: "intro",
    chapter: 0,
    kind: "intro",
    text: "Bem-vindo ao Tiny Planet Industries! Neste tutorial você vai aprender, passo a passo, tudo o que precisa para transformar um pequeno planeta vazio numa gigantesca civilização industrial.",
  },
  {
    id: "intro2",
    chapter: 0,
    kind: "shot",
    shot: "overview",
    text: "Você começa sozinho, com um astronauta, uma pequena base e quase nada nos bolsos. O objetivo é coletar, construir, automatizar e evoluir até conquistar as estrelas.",
  },

  // 1 — A tela do jogo
  { id: "c1", chapter: 1, kind: "chapter", text: "Capítulo um: a tela do jogo." },
  {
    id: "hud-center",
    chapter: 1,
    kind: "shot",
    shot: "hud",
    text: "Esta é a tela principal. No centro está o seu astronauta, ao lado da Sede da Colônia, o módulo de pouso onde tudo começa.",
    highlights: [
      { target: "hud.player", label: "Seu astronauta", side: "bottom", shape: "circle" },
      { target: "hud.hq", label: "Sede da Colônia", side: "top", shape: "circle", at: 0.35 },
    ],
  },
  {
    id: "hud-brand",
    chapter: 1,
    kind: "shot",
    shot: "hud",
    zoom: "hud.topLeft",
    zoomScale: 2.2,
    text: "No canto superior esquerdo aparecem o nome do planeta e o seu nível de civilização. O anel dourado mostra quanto falta para o próximo nível.",
    highlights: [{ target: "hud.brand", label: "Planeta e nível", side: "bottom" }],
  },
  {
    id: "hud-stats",
    chapter: 1,
    kind: "shot",
    shot: "hud",
    zoom: "hud.stats",
    zoomScale: 1.9,
    text: "Logo ao lado ficam os indicadores mais importantes: o seu dinheiro, os pontos de pesquisa, a energia, mostrando consumo sobre geração, e a poluição do planeta.",
    highlights: [
      { target: "hud.money", label: "Dinheiro", side: "bottom", at: 0.05 },
      { target: "hud.research", label: "Pesquisa", side: "bottom", at: 0.3 },
      { target: "hud.power", label: "Energia", side: "bottom", at: 0.5 },
      { target: "hud.pollution", label: "Poluição", side: "bottom", at: 0.72 },
    ],
  },
  {
    id: "hud-toolbar",
    chapter: 1,
    kind: "shot",
    shot: "hud",
    zoom: "hud.toolbar",
    zoomScale: 1.9,
    text: "À direita estão os controles de velocidade: pausa, uma vez, duas vezes e quatro vezes. E também os botões do Mercado, da Pesquisa, dos Planetas, das Estatísticas, da Ajuda e das Configurações.",
    highlights: [
      { target: "hud.speed", label: "Velocidade", side: "bottom", at: 0.05 },
      { target: "hud.menus", label: "Painéis", side: "bottom", at: 0.45 },
    ],
  },
  {
    id: "hud-quest",
    chapter: 1,
    kind: "shot",
    shot: "hud",
    zoom: "hud.quest",
    zoomScale: 2,
    text: "À esquerda fica a missão atual. Siga as missões: elas ensinam o jogo na ordem certa e cada uma dá dinheiro de recompensa. A lâmpada amarela traz uma dica de como cumprir a missão.",
    highlights: [
      { target: "hud.quest", label: "Missão atual", side: "right" },
      { target: "hud.questHint", label: "Dica", side: "right", at: 0.6 },
    ],
  },
  {
    id: "hud-inventory",
    chapter: 1,
    kind: "shot",
    shot: "hud",
    zoom: "hud.inventory",
    zoomScale: 2.2,
    text: "Embaixo, à esquerda, está o Armazém da Sede, com todos os recursos que você possui. A barrinha azul mostra quanto do espaço de cada item já está ocupado.",
    highlights: [{ target: "hud.inventory", label: "Armazém da Sede", side: "top" }],
  },
  {
    id: "hud-build",
    chapter: 1,
    kind: "shot",
    shot: "hud",
    zoom: "hud.cats",
    zoomScale: 1.7,
    text: "E na parte de baixo, ao centro, fica a barra de construção, separada em categorias: logística, extração, produção, energia, ambiente e especial.",
    highlights: [{ target: "hud.cats", label: "Barra de construção", side: "top" }],
  },

  // 2 — Andando
  { id: "c2", chapter: 2, kind: "chapter", text: "Capítulo dois: andando pelo planeta." },
  {
    id: "walk",
    chapter: 2,
    kind: "shot",
    shot: "hud",
    keys: ["W", "A", "S", "D", "+", "Shift"],
    text: "Use as teclas W, A, S e D para andar pela superfície. Segure a tecla Shift para correr com o jetpack. Você também pode passar por cima da água voando.",
    highlights: [{ target: "hud.player", label: "Você", side: "bottom", shape: "circle" }],
  },
  {
    id: "camera",
    chapter: 2,
    kind: "shot",
    shot: "hud",
    cursor: { target: "hud.dragFrom", drag: "hud.dragTo" },
    text: "Para girar a câmera, segure o botão do mouse e arraste. Use a roda do mouse para aproximar ou afastar a visão.",
  },
  {
    id: "tab",
    chapter: 2,
    kind: "shot",
    shot: "overview",
    keys: ["Tab"],
    text: "Aperte a tecla Tab para ver o planeta inteiro de longe. As áreas claras já são suas; as escuras ainda estão bloqueadas. Aperte Tab de novo para voltar para perto do astronauta.",
    highlights: [{ target: "overview.owned", label: "Seu território", side: "right", shape: "circle" }],
  },

  // 3 — Coleta
  { id: "c3", chapter: 3, kind: "chapter", text: "Capítulo três: coletando recursos." },
  {
    id: "resources",
    chapter: 3,
    kind: "shot",
    shot: "resources",
    text: "No começo, tudo é feito à mão. Árvores dão madeira. Rochas cinzentas dão pedra. Rochas avermelhadas são ferro, as que têm veios verde-água são cobre e as pretas são carvão.",
    highlights: [
      { target: "resources.wood", label: "Madeira", side: "top", shape: "circle", at: 0.12 },
      { target: "resources.stone", label: "Pedra", side: "top", shape: "circle", at: 0.3 },
      { target: "resources.ironOre", label: "Ferro", side: "bottom", shape: "circle", at: 0.48 },
      { target: "resources.copperOre", label: "Cobre", side: "top", shape: "circle", at: 0.66 },
      { target: "resources.coal", label: "Carvão", side: "bottom", shape: "circle", at: 0.82 },
    ],
  },
  {
    id: "harvest",
    chapter: 3,
    kind: "shot",
    shot: "harvest",
    keys: ["E"],
    cursor: { target: "harvest.tree", click: true },
    text: "Para coletar, chegue perto e segure a tecla E. Ou simplesmente clique no recurso: o astronauta caminha até lá e coleta sozinho. Cada coleta aparece flutuando na tela.",
    highlights: [{ target: "harvest.popup", label: "+1 recurso", side: "top", at: 0.55 }],
  },
  {
    id: "tooltip",
    chapter: 3,
    kind: "shot",
    shot: "tooltip",
    zoom: "tooltip.tooltip",
    zoomScale: 1.8,
    cursor: { target: "tooltip.tile" },
    text: "Passe o mouse sobre qualquer hexágono para ver o que existe nele: o tipo de terreno, a região e quanto minério ainda resta no depósito.",
    highlights: [{ target: "tooltip.tooltip", label: "Informações do local", side: "right", at: 0.3 }],
  },

  // 4 — Construindo
  { id: "c4", chapter: 4, kind: "chapter", text: "Capítulo quatro: construindo." },
  {
    id: "tray",
    chapter: 4,
    kind: "shot",
    shot: "tray",
    zoom: "tray.tray",
    zoomScale: 1.8,
    cursor: { target: "tray.cat", click: true },
    text: "Para construir, clique numa categoria da barra de baixo e escolha um edifício. Cada cartão mostra o custo: o dinheiro em amarelo e os materiais necessários. Se algo estiver em vermelho, está faltando recurso.",
    highlights: [
      { target: "tray.card", label: "Edifício", side: "top", at: 0.3 },
      { target: "tray.cost", label: "Custo", side: "bottom", at: 0.55 },
    ],
  },
  {
    id: "ghost",
    chapter: 4,
    kind: "shot",
    shot: "ghost",
    keys: ["R", "Esc"],
    cursor: { target: "ghost.tile", click: true },
    text: "Depois, mova o mouse sobre o planeta. O fantasma verde mostra onde o edifício vai ficar. Clique para construir. A tecla R gira o edifício, e Esc ou o botão direito cancelam.",
    highlights: [
      { target: "ghost.tile", label: "Pré-visualização", side: "left", shape: "circle", at: 0.1 },
      { target: "ghost.chip", label: "Ferramenta ativa", side: "top", at: 0.6 },
    ],
  },
  {
    id: "ghost-bad",
    chapter: 4,
    kind: "shot",
    shot: "ghostBad",
    cursor: { target: "ghostBad.tile" },
    text: "Se o fantasma ficar vermelho, aquele local não serve. A caixinha ao lado do mouse explica o motivo, como água, espaço ocupado ou região ainda não comprada.",
    highlights: [{ target: "ghostBad.tooltip", label: "Motivo", side: "right", at: 0.35 }],
  },
  {
    id: "woodcutter",
    chapter: 4,
    kind: "shot",
    shot: "ghost",
    text: "Comece com um Lenhador perto de uma floresta. Ele corta as árvores num raio de dois hexágonos, e a área azul mostra esse alcance. Não se preocupe: as árvores voltam a crescer.",
    highlights: [{ target: "ghost.range", label: "Alcance do Lenhador", side: "right", shape: "circle" }],
  },
  {
    id: "miner",
    chapter: 4,
    kind: "shot",
    shot: "miner",
    cursor: { target: "miner.tile", click: true },
    text: "As Mineradoras só podem ser construídas em cima de um depósito de minério. Elas extraem pedra, ferro, cobre ou carvão automaticamente, até o depósito acabar.",
    highlights: [{ target: "miner.tile", label: "Depósito de ferro", side: "left", shape: "circle" }],
  },

  // 5 — Estradas
  { id: "c5", chapter: 5, kind: "chapter", text: "Capítulo cinco: estradas e caminhões." },
  {
    id: "roads",
    chapter: 5,
    kind: "shot",
    shot: "roads",
    keys: ["1"],
    cursor: { target: "roads.dragFrom", drag: "roads.dragTo" },
    text: "Atenção, esta é a regra mais importante do jogo: todo edifício precisa estar ligado à Sede por estradas. Escolha a Estrada, tecla um, e arraste o mouse para traçar o caminho.",
    highlights: [{ target: "roads.area", label: "Estradas", side: "top", at: 0.4 }],
  },
  {
    id: "trucks",
    chapter: 5,
    kind: "shot",
    shot: "trucks",
    zoom: "trucks.truck",
    zoomScale: 1.7,
    text: "Pelas estradas circulam os caminhões. Eles levam a produção até o armazém da Sede e trazem de volta os insumos e o combustível que cada máquina precisa.",
    highlights: [{ target: "trucks.truck", label: "Caminhão de entrega", side: "top", shape: "circle", at: 0.2 }],
  },
  {
    id: "noconn",
    chapter: 5,
    kind: "shot",
    shot: "noconn",
    text: "Um edifício sem estrada mostra este ícone laranja de corrente e o aviso: sem estrada até a Sede. Enquanto isso, você pode usar os botões Coletar e Abastecer no painel dele, fazendo o transporte à mão.",
    highlights: [
      { target: "noconn.icon", label: "Sem conexão", side: "left", shape: "circle", at: 0.05 },
      { target: "noconn.status", label: "Aviso", side: "left", at: 0.35 },
      { target: "noconn.actions", label: "Coletar e Abastecer", side: "left", at: 0.65 },
    ],
  },

  // 6 — Energia
  { id: "c6", chapter: 6, kind: "chapter", text: "Capítulo seis: energia." },
  {
    id: "power",
    chapter: 6,
    kind: "shot",
    shot: "power",
    zoom: "power.top",
    zoomScale: 1.6,
    text: "Mineradoras, fundições e outras máquinas consomem energia. A Sede gera só um pouquinho. Logo você vai precisar de Geradores a Biomassa, que queimam madeira ou tábuas entregues pelos caminhões.",
    highlights: [{ target: "power.stat", label: "Consumo / Geração", side: "bottom" }],
  },
  {
    id: "power-warn",
    chapter: 6,
    kind: "shot",
    shot: "power",
    text: "Se o consumo passar da geração, todas as máquinas ficam mais lentas: aparece um aviso no topo e um raio vermelho sobre os edifícios afetados. Construa mais geradores para resolver.",
    highlights: [
      { target: "power.warn", label: "Aviso de energia", side: "bottom", at: 0.1 },
      { target: "power.icon", label: "Sem energia", side: "top", shape: "circle", at: 0.5 },
    ],
  },

  // 7 — Fábricas
  { id: "c7", chapter: 7, kind: "chapter", text: "Capítulo sete: fábricas e o painel do edifício." },
  {
    id: "insp",
    chapter: 7,
    kind: "shot",
    shot: "inspector",
    cursor: { target: "inspector.building", click: true },
    text: "A Fundição transforma minério em placas. Clique em qualquer edifício para abrir o painel dele, do lado direito da tela.",
    highlights: [{ target: "inspector.panel", label: "Painel do edifício", side: "left", at: 0.45 }],
  },
  {
    id: "insp-recipe",
    chapter: 7,
    kind: "shot",
    shot: "inspector",
    zoom: "inspector.panel",
    zoomScale: 1.45,
    text: "No painel você acompanha o progresso e escolhe a receita: placa de ferro, placa de cobre ou tijolo. Receitas com cadeado são liberadas pela pesquisa.",
    highlights: [
      { target: "inspector.progress", label: "Progresso", side: "left", at: 0.05 },
      { target: "inspector.recipes", label: "Receitas", side: "left", at: 0.3 },
    ],
  },
  {
    id: "insp-actions",
    chapter: 7,
    kind: "shot",
    shot: "inspector",
    zoom: "inspector.panelBottom",
    zoomScale: 1.6,
    text: "Mais abaixo aparecem a entrada, a saída e a conexão. O botão dourado melhora o edifício: no nível dois ele trabalha sessenta por cento mais rápido. Os botões menores pausam, giram ou demolem, devolvendo metade do custo.",
    highlights: [
      { target: "inspector.buffers", label: "Entrada e saída", side: "left", at: 0.05 },
      { target: "inspector.upgrade", label: "Melhorar", side: "left", at: 0.4 },
      { target: "inspector.actions", label: "Pausar · Girar · Demolir", side: "left", at: 0.7 },
    ],
  },
  {
    id: "chain",
    chapter: 7,
    kind: "shot",
    shot: "trucks",
    text: "Monte cadeias de produção: mineradoras alimentam fundições, fundições alimentam montadoras, e cada etapa vale mais dinheiro que a anterior. Mais tarde vêm engrenagens, circuitos, aço, motores e computadores.",
    highlights: [{ target: "trucks.base", label: "Sua indústria", side: "top", shape: "circle" }],
  },

  // 8 — Mercado
  { id: "c8", chapter: 8, kind: "chapter", text: "Capítulo oito: mercado e dinheiro." },
  {
    id: "market",
    chapter: 8,
    kind: "shot",
    shot: "market",
    keys: ["M"],
    text: "O dinheiro vem das vendas. Abra o Mercado com a tecla M. Em cada item você pode vender dez, cem ou tudo de uma vez.",
    highlights: [{ target: "market.sell", label: "Vender", side: "top", at: 0.35 }],
  },
  {
    id: "market-price",
    chapter: 8,
    kind: "shot",
    shot: "market",
    zoom: "market.priceArea",
    zoomScale: 1.5,
    text: "Os preços sobem e descem com o tempo, e o gráfico mostra a tendência. Vender muito de uma vez derruba o preço por um tempo, então diversifique os produtos.",
    highlights: [
      { target: "market.price", label: "Preço", side: "bottom", at: 0.05 },
      { target: "market.trend", label: "Tendência", side: "bottom", at: 0.35 },
    ],
  },
  {
    id: "market-auto",
    chapter: 8,
    kind: "shot",
    shot: "market",
    zoom: "market.autoArea",
    zoomScale: 1.6,
    text: "Ligue a venda automática: você escolhe quanto quer manter guardado, e o jogo vende sozinho todo o excedente. É o jeito mais fácil de ganhar dinheiro sem parar.",
    highlights: [{ target: "market.auto", label: "Venda automática", side: "bottom" }],
  },

  // 9 — Território
  { id: "c9", chapter: 9, kind: "chapter", text: "Capítulo nove: expandindo o território." },
  {
    id: "region",
    chapter: 9,
    kind: "shot",
    shot: "regionHover",
    cursor: { target: "regionHover.tile" },
    text: "As áreas escuras do planeta ainda não são suas. Passe o mouse sobre uma região vizinha ao seu território: ela fica amarela e mostra o preço.",
    highlights: [{ target: "regionHover.tooltip", label: "Preço da região", side: "right", at: 0.4 }],
  },
  {
    id: "region-buy",
    chapter: 9,
    kind: "shot",
    shot: "regionDialog",
    cursor: { target: "regionDialog.buy", click: true },
    text: "Clique para ver os detalhes e comprar. Cada região nova traz mais espaço e novos depósitos de minério. O preço aumenta a cada compra, então escolha bem.",
    highlights: [{ target: "regionDialog.modal", label: "Depósitos da região", side: "left" }],
  },

  // 10 — Pesquisa
  { id: "c10", chapter: 10, kind: "chapter", text: "Capítulo dez: pesquisa e tecnologia." },
  {
    id: "research",
    chapter: 10,
    kind: "shot",
    shot: "research",
    keys: ["T"],
    text: "Abra a árvore tecnológica com a tecla T. As tecnologias da primeira era custam apenas dinheiro e materiais. As que estão brilhando em roxo já podem ser pesquisadas: basta clicar.",
    highlights: [{ target: "research.era1", label: "Primeira era", side: "right", at: 0.3 }],
  },
  {
    id: "research-rp",
    chapter: 10,
    kind: "shot",
    shot: "research",
    zoom: "research.head",
    zoomScale: 1.7,
    text: "Depois disso, você vai precisar de Pontos de Pesquisa, gerados pelos Laboratórios. Cada tecnologia libera novos edifícios, novas receitas ou bônus permanentes.",
    highlights: [{ target: "research.rp", label: "Pontos de Pesquisa", side: "bottom" }],
  },
  {
    id: "celebrate",
    chapter: 10,
    kind: "shot",
    shot: "celebration",
    text: "A cada tecnologia, missão concluída, nível novo ou região comprada, uma comemoração aparece na tela. Aproveite!",
    highlights: [{ target: "celebration.banner", label: "Conquista!", side: "bottom" }],
  },

  // 11 — Poluição
  { id: "c11", chapter: 11, kind: "chapter", text: "Capítulo onze: poluição e meio ambiente." },
  {
    id: "pollution",
    chapter: 11,
    kind: "shot",
    shot: "pollution",
    text: "Fundições e geradores poluem. A fumaça se espalha, deixa o terreno marrom, mata as árvores e escurece o céu do planeta.",
    highlights: [{ target: "pollution.area", label: "Área poluída", side: "top", shape: "circle" }],
  },
  {
    id: "pollution-fine",
    chapter: 11,
    kind: "shot",
    shot: "pollution",
    zoom: "pollution.top",
    zoomScale: 1.6,
    text: "Acima de sessenta por cento, o planeta cobra uma multa ambiental todo segundo. Pesquise e construa Turbinas Eólicas, Painéis Solares, Viveiros e Purificadores de Ar para manter o ar limpo.",
    highlights: [
      { target: "pollution.stat", label: "Poluição", side: "bottom", at: 0.05 },
      { target: "pollution.warn", label: "Multa", side: "bottom", at: 0.3 },
    ],
  },

  // 12 — Novos planetas
  { id: "c12", chapter: 12, kind: "chapter", text: "Capítulo doze: rumo a novos planetas." },
  {
    id: "rocket",
    chapter: 12,
    kind: "shot",
    shot: "rocketpad",
    text: "No fim da árvore tecnológica está a Engenharia Espacial. Construa a Plataforma de Lançamento e abasteça-a com circuitos, motores, computadores e aço. Quando o foguete estiver pronto, aperte Lançar!",
    highlights: [
      { target: "rocketpad.components", label: "Componentes", side: "left", at: 0.3 },
      { target: "rocketpad.launch", label: "Lançar", side: "left", at: 0.75 },
    ],
  },
  {
    id: "launch",
    chapter: 12,
    kind: "shot",
    shot: "launch",
    text: "O lançamento descobre um planeta novo, com recursos exclusivos e mais valiosos.",
  },
  {
    id: "planets",
    chapter: 12,
    kind: "shot",
    shot: "planets",
    keys: ["P"],
    text: "Ferrus é um deserto vermelho rico em titânio. Glacies é um mundo de gelo com cristais caríssimos. Viaje entre os planetas pelo painel Planetas, com a tecla P.",
    highlights: [{ target: "planets.cards", label: "Seus planetas", side: "bottom", at: 0.2 }],
  },
  {
    id: "ferrus",
    chapter: 12,
    kind: "shot",
    shot: "ferrus",
    text: "Cada planeta tem a sua própria base, o seu armazém e o seu território, mas o dinheiro e as tecnologias são compartilhados.",
  },

  // 13 — Atalhos
  { id: "c13", chapter: 13, kind: "chapter", text: "Capítulo treze: atalhos e dicas finais." },
  {
    id: "shortcuts",
    chapter: 13,
    kind: "shortcuts",
    text: "Aqui estão todos os atalhos do teclado. Pause este vídeo se quiser anotar. A barra de espaço pausa o jogo, e os botões de velocidade aceleram tudo quando você estiver esperando a produção.",
  },
  {
    id: "outro",
    chapter: 13,
    kind: "outro",
    text: "Lembre-se: siga as missões, conecte tudo com estradas, cuide da energia e da poluição, e venda o que sobrar. O jogo salva sozinho a cada vinte segundos. Agora é com você. Bom jogo!",
  },
];
