# Tiny Planet Industries

Simulador 3D low-poly de construção, gerenciamento e automação num pequeno planeta esférico.
Feito com **React + Three.js (React Three Fiber)**, **Zustand** e **Remotion** (cinemáticas da interface e trailer).

## Publicar no Netlify

**Opção 1 — arrastar e soltar (mais simples):**
1. Acesse https://app.netlify.com/drop (faça login).
2. Arraste o arquivo `tiny-planet-industries-netlify.zip` (ou a pasta `dist/`) para a página.
3. Pronto: o Netlify gera um link público. Nada mais é necessário — o jogo é 100% estático.

**Opção 2 — via GitHub (atualiza sozinho a cada commit):**
1. Suba esta pasta para um repositório.
2. No Netlify: *Add new site → Import an existing project* e escolha o repositório.
3. O arquivo `netlify.toml` já configura tudo: `npm run build`, pasta `dist`, Node 22.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/
```

## Remotion

- `npm run studio` — abre o Remotion Studio com as composições (`TitleBackground`, `LogoReveal`, `Celebration`, `Trailer`).
- `npm run render:trailer` — renderiza o trailer de 23 s em `out/trailer.mp4` (1920×1080).

> Licença do Remotion: gratuita para pessoas físicas e empresas com até 3 funcionários; acima disso exige licença comercial (remotion.pro).

## Como jogar

WASD anda · Shift corre · E coleta · clique em recursos para coletar, em edifícios para gerenciar e em áreas escuras para comprar regiões ·
1–6 atalhos de construção · R gira · X demolir · M mercado · T pesquisa · P planetas · Tab visão do planeta · Espaço pausa.

## Estrutura

```
src/game/data     itens, receitas, edifícios, pesquisas, missões e planetas (fácil de expandir)
src/game/world    geração procedural do planeta hexagonal (Goldberg), relevo, biomas, depósitos e regiões
src/game/sim      motor da simulação: energia, logística com caminhões/drones, poluição, mercado, progressão, save
src/render        cena 3D (modelos low-poly, terreno, água, atmosfera, veículos, partículas, astronauta)
src/ui            HUD, painéis, telas de título e jogo
src/remotion      composições do Remotion (título, celebrações, trailer)
src/audio         efeitos e música ambiente procedurais (WebAudio)
scripts           testes automáticos da simulação (simtest.ts) e de ponta a ponta (e2e.mjs)
```

Para adicionar conteúdo: novos itens em `items.ts`, receitas em `recipes.ts`, edifícios em `buildings.ts`
(+ modelo em `render/models/BuildingModels.tsx`), tecnologias em `research.ts`, missões em `quests.ts` e planetas em `planets.ts`.
