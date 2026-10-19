---
name: Controle de Transporte
description: Controle de abastecimentos e fechamento mensal por instituição de um posto de combustível.
colors:
  brand: "#157255"
  brand-hover: "#105f46"
  brand-dark: "#102d26"
  brand-soft: "#eaf4ed"
  brand-soft-2: "#d3e8da"
  ink: "#14231c"
  ink-2: "#3f4f46"
  ink-3: "#56655c"
  on-dark: "#ffffff"
  on-dark-2: "#c4d8cc"
  bg: "#f5f7f5"
  surface: "#ffffff"
  surface-2: "#f8faf8"
  line: "#e1e7e2"
  line-strong: "#7d8c81"
  danger: "#b42318"
  danger-soft: "#fdf0ee"
  warn: "#7a4f00"
  warn-soft: "#fdf5e1"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  title-sm:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
  plate:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  button-lg:
    padding: "0 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  select-trigger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  select-item-highlighted:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-dark}"
    rounded: "{rounded.sm}"
    height: "36px"
  tag:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  tag-brand:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-hover}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  kpi:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  nav-item-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-hover}"
  option-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "60px"
  option-card-checked:
    backgroundColor: "{colors.brand-soft}"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "640px"
  fill-modal:
    width: "560px"
  colab-top:
    backgroundColor: "{colors.brand-dark}"
    textColor: "{colors.on-dark}"
    height: "60px"
  tabbar-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-hover}"
    rounded: "{rounded.md}"
    height: "52px"
  toast:
    backgroundColor: "{colors.brand-dark}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: Controle de Transporte

## Overview

**Creative North Star: "O Livro-Caixa da Pista"**

O Controle de Transporte é uma ferramenta de trabalho SaaS limpa e silenciosa, o padrão da categoria executado sem ironia nem enfeite, no nível de acabamento de Stripe Dashboard, Linear e Nubank/Conta Azul. Tudo existe para duas certezas: o administrador fecha cada instituição com um extrato que se lê como documento de cobrança, e o colaborador, em pé na pista com um celular simples, sabe sem dúvida que o lançamento foi recebido.

Superfícies brancas sobre um fundo cinza-esverdeado, um único verde como cor de ação e seleção, um verde profundo para os números fortes e para o cabeçalho do colaborador. A densidade é a de um painel de gestão: tabelas com numerais tabulares alinhados à direita, cards de indicadores sem decoração, bordas finas e uma única sombra suave reservada para o que flutua (modal, menu de seleção, toast, card de login). No celular, a mesma linguagem ganha alvos de toque de 44 a 52px e campos de 48px.

A interface recusa os vícios de template: sem seletor de espaço de trabalho, sem card de destaque decorativo, sem rótulos-sobretítulo (kickers), sem micro-texto cinza de 7 a 10px, sem efeito de hover ou spotlight nos cards e sem fundo animado no login.

**Key Characteristics:**
- Paleta verde fixa: um verde de ação, um verde profundo, um verde claro de seleção, neutros tingidos de verde.
- Pilha de fontes do sistema, escala em rem de 12/13/14/16/20/24/30, numerais tabulares.
- Raios de 8px nos controles e 12px nos contêineres; bordas finas; sombra só no que flutua.
- Toolbar padronizada em todas as telas: filtros à esquerda, ações à direita.
- Selects próprios (Radix) com a lista do sistema, nunca o popup nativo.
- Lançamento sempre em modal, com rodapé fixo de total ao vivo e botão de salvar no alcance do polegar.

## Colors

Uma família verde única sobre branco: o verde age, o verde claro seleciona, o verde profundo pesa; todo o resto é neutro tingido de verde.

### Primary
- **Verde Pista** (brand): a única cor de ação e seleção. Botão primário, link, foco (contorno de 2px), barras do gráfico, medidores, check do select, borda da opção marcada, ícones de destaque. Seu hover é o **Verde Pista Fechado** (brand-hover), que também colore o texto de itens ativos (navegação, abas, tabbar, tag de marca).
- **Verde Profundo** (brand-dark): cabeçalho do colaborador no celular, toast, números fortes (total do extrato, total do lançamento, totais do comprovante) e texto sobre o verde claro.

### Secondary
- **Verde Claro de Seleção** (brand-soft): fundo de item ativo da navegação e da tabbar, opção marcada, item realçado do select, nota informativa, resumo de formulário, rodapé de totais da tabela, trilho dos medidores e início do degradê do login.
- **Verde Claro de Contorno** (brand-soft-2): borda da tag de marca, linha superior do rodapé de totais, cor da seleção de texto.

### Neutral
- **Tinta** (ink): texto principal, títulos, valores.
- **Tinta Média** (ink-2): texto de apoio, células de tabela, ícones de botão.
- **Tinta Suave** (ink-3): legendas, placeholders, rótulos de eixo, contexto dos KPIs. Contraste mínimo de 4,5:1 sobre branco.
- **Fundo da Pista** (bg): fundo de página.
- **Superfície** (surface): cards, painéis, modais, campos, sidebar.
- **Superfície Elevada** (surface-2): cabeçalho de tabela, hover de botão secundário, tags neutras, blocos de fatos do comprovante.
- **Linha** (line): bordas de cards, divisórias, linhas de tabela.
- **Linha Forte** (line-strong): borda de campos, selects, botões secundários e cartões de opção (contraste mínimo de 3:1).
- **Sobre Escuro** (on-dark, on-dark-2): texto principal e secundário sobre o Verde Profundo.

### Estados
- **Erro** (danger, danger-soft): mensagens de erro, borda de campo inválido, indicador de sincronização com falha.
- **Atenção** (warn, warn-soft): aviso de conexão, tag de estoque baixo.

### Named Rules
**A Regra da Paleta Fixa.** A família de cor é verde e não muda: verde escuro, verde e verde claro sobre branco e fundo cinza-esverdeado. Cinzas e estados podem ser ajustados para atingir contraste AA; trocar a família, não.

**A Regra da Voz Única.** O Verde Pista é a única cor de ação e seleção. Nenhum segundo acento, nenhum gradiente decorativo; o único degradê do sistema é o fundo estático do login (verde claro para o fundo da pista em 320px).

## Typography

**Display Font:** pilha do sistema (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto)
**Body Font:** a mesma pilha
**Label/Mono Font:** ui-monospace (SF Mono, Menlo, Consolas), só para placas e links de convite

**Character:** a fonte do aparelho, sem carregamento, legível em qualquer celular; a hierarquia vem de tamanho, peso e numerais tabulares, não de uma fonte de exibição.

### Hierarchy
- **Display** (650, 30px, 1.2, -0.02em, tabular): valor dos KPIs e total do comprovante. No celular, `clamp(1.25rem, 6vw, 1.5rem)`.
- **Headline** (700, 24px, 1.25, -0.01em): título de página, título do card de login, total do extrato e do lançamento.
- **Title** (700, 20px): título de modal e do formulário de lançamento. **Title-sm** (700, 16px): título de painel, de estado vazio, nome em cartões de opção e de perfil.
- **Body** (400, 14px, 1.5): texto corrido, células de tabela, botões (600). Em campos do celular sobe para 16px.
- **Label** (600, 13px): rótulos de campo, links de ação, botão pequeno, contexto dos KPIs (500).
- **Caption** (500 a 600, 12px): cabeçalho de tabela, tags, rótulos de eixo, rótulo de grupo da navegação. É o piso do sistema.
- **Placa** (mono 600, 13px, 0.04em): toda placa de veículo. No comprovante, mono 700 de 30px, 0.08em, dentro de uma moldura de 2px.

### Named Rules
**A Regra do Piso de 12px.** Nenhum texto visível abaixo de 12px (a única exceção é o rótulo do eixo do gráfico no celular, 11px). Micro-texto cinza não existe.

**A Regra do Número Alinhado.** Todo valor, litro, contagem e total usa numerais tabulares e, em tabelas, alinha à direita.

**A Regra da Placa.** Placa de veículo é sempre monoespaçada, com espaçamento de letras; é o identificador que o colaborador confere na bomba.

## Layout

Grade de 8px com passos de 4, 8, 12, 16, 20, 24 e 32px. O admin usa uma sidebar clara fixa de 240px em grupos rotulados (sem rótulo, Cadastros, Gestão), e o conteúdo com margem de 28 a 32px e largura máxima de 1480px, empilhado em grade com 20px de intervalo: cabeçalho de página (título e uma linha de contexto), Toolbar, conteúdo. Os KPIs ficam em quatro colunas (duas abaixo de 1280px; no celular, o primeiro e o último ocupam a linha inteira). A visão geral divide gráfico e participação por instituição em 1,75fr / 1fr.

A área do colaborador reaproveita a mesma sidebar no desktop (largura máxima de 1200px no conteúdo). Abaixo de 1024px a sidebar do admin vira gaveta (280px, com fundo escurecido) aberta por uma barra superior de 56px; a do colaborador some e dá lugar ao cabeçalho Verde Profundo de 60px e a uma tabbar fixa de quatro botões (Início, Lançar, Lançamentos, Oficina) que respeita a área segura.

Abaixo de 760px: Toolbar empilha (busca em largura total, ações dividindo a linha), formulários viram uma coluna, campos e botões de ação vão a 44px de altura e 16px de fonte, tabelas viram cards (primeira célula como título, demais como pares rótulo/valor, total separado por linha tracejada, ações por último), e o modal de lançamento ocupa a tela toda.

### Named Rules
**A Regra da Toolbar.** Toda tela com filtros ou ações tem a mesma Toolbar, logo abaixo do cabeçalho: busca e selects à esquerda, ações à direita, 40px de altura no desktop e 44px no celular. Ações de página não moram no cabeçalho nem na sidebar.

**A Regra do Polegar.** No celular, todo alvo de toque tem no mínimo 44px; a ação de salvar fica no rodapé fixo, ao alcance do polegar.

## Elevation & Depth

Sistema plano com camadas tonais: fundo da pista, superfície branca e bordas finas fazem a separação. Cards e painéis carregam só um sombreado quase imperceptível; a sombra de sobreposição existe apenas no que flutua acima da página. Barras fixas (rodapé de envio, tabbar) usam uma sombra curta voltada para cima para se destacar do conteúdo que rola.

### Shadow Vocabulary
- **Repouso** (`box-shadow: 0 1px 2px rgba(16, 45, 38, 0.05)`): cards, KPIs, painéis.
- **Sobreposição** (`box-shadow: 0 16px 40px rgba(16, 45, 38, 0.18), 0 2px 6px rgba(16, 45, 38, 0.08)`): modal, lista do select, toast, gaveta aberta, card de login.
- **Barra fixa** (`box-shadow: 0 -6px 16px rgba(16, 45, 38, 0.06)`; tabbar `0 -4px 16px`): rodapé de envio do lançamento e tabbar.
- **Véu** (`rgba(16, 45, 38, 0.45)`; gaveta 0.4): fundo atrás de modal e gaveta.

### Named Rules
**A Regra do Card Quieto.** Cards e KPIs não reagem ao ponteiro: nenhum hover, spotlight, brilho, inclinação ou elevação. Só controles interativos (botões, opções, linhas de tabela, itens de navegação) têm estado de hover.

## Shapes

Cantos discretamente arredondados e consistentes: 8px em botões, campos, selects, cartões de opção, avisos, toast e itens de navegação; 12px em cards, painéis e modais; 6px nos itens da lista do select e na moldura da placa; pílula (999px) em tags, contadores e medidores; círculo no avatar e no indicador de sincronização. Bordas sempre de 1px (2px só na moldura da placa do comprovante e no sublinhado da aba ativa). As barras do gráfico têm só o topo arredondado (3px). O modal de lançamento perde os cantos no celular, onde ocupa a tela inteira.

## Components

### Buttons
Firmes e sóbrios, sempre com texto (ícone de 16 a 18px à esquerda quando ajuda).
- **Shape:** cantos de 8px, altura de 36px (32px pequeno, 48px grande, 40px na Toolbar, 44px no celular).
- **Primary:** Verde Pista com texto branco, peso 600; no máximo um por região de ação.
- **Secondary:** superfície branca com borda Linha Forte e texto Tinta.
- **Hover / Focus:** troca só de fundo/borda em 0,15s (primário vai a Verde Pista Fechado, secundário a Superfície Elevada); foco é contorno de 2px Verde Pista com afastamento de 2px. Desabilitado em 50% de opacidade.
- **Icon button:** 36px (44px no celular), transparente, Tinta Média; variante sobre escuro com véu branco de 8% a 16%.
- **Link button:** texto Verde Pista 13px peso 600, sublinhado no hover ("Ver todos", "Tentar de novo").

### Chips
- **Style:** tags em pílula, 12px peso 500, 2px por 8px. Neutra (Superfície Elevada, borda Linha), de marca (verde claro, texto Verde Pista Fechado), atenção (warn-soft) e apagada.
- **State:** são só informativas (combustível, situação); não são filtros clicáveis.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Superfície, borda Linha, sombra de Repouso.
- **Shadow Strategy:** ver Elevation & Depth; card nunca tem hover.
- **Internal Padding:** KPI 18px por 20px; cabeçalho de painel 18px 20px 14px, com título de 16px, uma linha de contexto e um link de ação à direita.
- **KPI:** rótulo de 13px, valor Display com contagem animada na entrada, linha de contexto de 13px. Sem ícone, sem cor de destaque.

### Inputs / Fields
- **Style:** 40px de altura (48px no formulário do colaborador e no login, 44px no celular), borda Linha Forte, cantos de 8px, rótulo acima em 13px peso 600, "(opcional)" em Tinta Suave peso 400, dica ou erro abaixo em 13px.
- **Focus:** contorno de 2px Verde Pista com afastamento de 1px e borda Verde Pista.
- **Error / Disabled:** borda Erro e mensagem em Erro peso 500; desabilitado em 50%.
- **Senha:** botão de mostrar/ocultar de 44px dentro do campo.
- **Busca:** ícone de lupa à esquerda dentro do contorno, até 360px na Toolbar.

### Select
Select próprio sobre Radix, nunca o popup nativo do navegador.
- **Gatilho:** mesmo desenho do campo, texto truncado com reticências, placeholder em Tinta Suave, chevron de 16px que gira 180° quando aberto; aberto recebe o mesmo contorno de foco.
- **Lista:** superfície branca, borda Linha, cantos de 8px, sombra de Sobreposição, pelo menos a largura do gatilho, até 320px de altura, entrada com fade e deslocamento de 4px em 0,14s. Dentro de um modal, a lista é renderizada no próprio diálogo.
- **Itens:** 36px (44px e 16px no celular); realçado em verde claro com texto Verde Profundo; selecionado em peso 600 com check Verde Pista à direita.
- **Inline:** na Toolbar, 180 a 280px de largura; no celular, largura total.

### Option Cards
Escolha de combustível como cartões de rádio, não como select: grade auto-ajustável de no mínimo 140px, 60px de altura, nome em 16px peso 600 e preço por litro em 13px tabular. Marcado: borda e anel interno Verde Pista com fundo verde claro. Foco com contorno de 2px.

### Navigation
- **Sidebar:** branca, 240px, marca no topo (selo verde de 36px com ícone de bomba, nome e subtítulo), grupos rotulados em 12px, itens de 36px com ícone de 18px em Tinta Suave; hover em Superfície Elevada; ativo em verde claro com texto Verde Pista Fechado e ícone Verde Pista, peso 600. Contador em pílula. Rodapé com troca de área, estado de sincronização e o usuário com botão de sair.
- **Cabeçalho do colaborador (celular):** Verde Profundo, 60px, selo translúcido, nome do produto e do colaborador, indicador de conexão e sair.
- **Tabbar (celular):** quatro botões de 52px com ícone de 22px e rótulo de 12px; ativo em verde claro. "Lançar" abre o modal de lançamento.
- **Abas (Oficina):** botões de 44px com sublinhado de 2px Verde Pista na aba ativa; no celular rolam na horizontal com máscara de fade.

### Data Table
Cabeçalho em Superfície Elevada 12px peso 600, células de 12px de respiro com 20px nas bordas, linhas divididas por Linha, hover de linha quase branco. Placa em mono, subtexto em 12px. Coluna de total fixa à direita no desktop. Rodapé de totais em verde claro com texto Verde Profundo peso 700. No celular, cada linha vira um card.

### Modal / Dialog
Diálogo nativo (`dialog` com `showModal`), 640px, cantos de 12px, sombra de Sobreposição e véu Verde Profundo a 45%. Cabeçalho com título de 20px e botão de fechar, divisória Linha; rodapé de ações fixo com divisória superior, botões alinhados à direita (no celular dividem a largura). Fecha com Esc, exceto enquanto salva; o foco vai ao primeiro campo e volta ao botão que abriu.

### Modal de lançamento (assinatura)
O "Novo abastecimento" é um modal de 560px que ocupa a tela toda no celular. Ordem fixa: veículo (select), combustível (cartões de opção), litros e odômetro lado a lado, data, extras recolhidos ("Motorista e observação", opcional). O rodapé fixo mostra o valor ao vivo em 24px Verde Profundo com a origem do preço, e o botão primário "Salvar e enviar" à direita. Depois de salvar, o mesmo modal vira o comprovante: ícone de confirmação com leve escala de entrada, placa grande em moldura, fatos em grade sobre Superfície Elevada, total em 30px, e a ação de novo lançamento.

### Auth
Tela única centralizada de até 460px sobre um degradê estático de verde claro para o fundo da pista. Marca acima, card de 32px de respiro com sombra de Sobreposição, título de 24px, uma linha de apoio. A escolha de perfil usa cartões de 76px com ícone Verde Pista e seta que desliza 3px no hover. Campos de 48px e 16px.

### Toast e avisos
Toast Verde Profundo centralizado embaixo, entrando de 8px em 0,25s. Avisos em blocos de 8px de canto: erro, atenção, sucesso (verde claro com ícone e fechar) e nota informativa.

## Do's and Don'ts

### Do:
- **Do** usar o Verde Pista (#157255) como a única cor de ação e seleção, e o Verde Profundo (#102d26) para números fortes e o cabeçalho do colaborador.
- **Do** colocar toda busca e filtro à esquerda e toda ação à direita na Toolbar padronizada, logo abaixo do cabeçalho da página, em todas as telas.
- **Do** abrir o lançamento de abastecimento sempre em modal, com rodapé fixo de total ao vivo e o botão "Salvar e enviar".
- **Do** usar o Select próprio (Radix) para toda escolha em lista, e cartões de opção para combustível.
- **Do** escrever "colaborador" em todo texto visível e "Controle de Transporte" como nome do produto.
- **Do** usar numerais tabulares alinhados à direita em todo valor e placa em fonte monoespaçada.
- **Do** dar 44px a todo alvo de toque no celular e 16px de fonte aos campos para evitar zoom.
- **Do** desligar contagem, revelação, desfoque de título e entradas animadas quando o usuário pede movimento reduzido.

### Don't:
- **Don't** colocar efeito de hover, spotlight, brilho ou elevação em cards e KPIs.
- **Don't** animar o fundo do login; o degradê é estático.
- **Don't** colocar a ação "Novo abastecimento" no painel do administrador nem na sidebar; ela existe só na Toolbar e na tabbar da área do colaborador.
- **Don't** usar o select nativo do navegador nem o seu popup.
- **Don't** mostrar "frentista" na interface (o termo vive só na rota `/frentista` e em nomes internos), nem "Posto VN" ou "CONTROLE TRANSPORTE".
- **Don't** trocar a família de cor, adicionar um segundo acento ou gradientes decorativos.
- **Don't** usar rótulos-sobretítulo (kickers), seletor de espaço de trabalho, card de destaque decorativo ou texto abaixo de 12px.
- **Don't** usar sombra em elementos em repouso além da sombra de Repouso; a sombra de Sobreposição é só do que flutua.
