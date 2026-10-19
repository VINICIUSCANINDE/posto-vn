---
target: painel e área do colaborador
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/gabrielmoreira/orca/posto-vn/app/dashboard.tsx"
target_fingerprint: "sha256:244cbb0c753737e25b9b00e87b2dac1058de9a87b6829cffdf27355712cf5d67"
target_path: /Users/gabrielmoreira/orca/posto-vn/app/dashboard.tsx
timestamp: 2026-10-18T23-40-15Z
slug: app-dashboard-tsx
---
Method: dual-agent (A: design review · B: detector + browser overlay) + technical audit (C)

## Design Health Score

| # | Heurística | Nota | Problema principal |
|---|---|---|---|
| 1 | Visibilidade do estado | 2 | Recibo do colaborador renderiza fora da tela no celular; "Enviando…" sem timeout; ponto verde sempre aceso mesmo com sincronização falhando |
| 2 | Correspondência com o mundo real | 3 | Verbos inconsistentes (Novo / Cadastrar / Registrar / Lançar abastecimento) |
| 3 | Controle e liberdade | 2 | Esc não fecha modal; clicar fora descarta formulário; menu mobile prende |
| 4 | Consistência | 3 | Visual coeso; placa monoespaçada só em parte das telas |
| 5 | Prevenção de erros | 3 | Bom no servidor; falta mostrar último km do veículo e aviso de duplicata |
| 6 | Reconhecer vs lembrar | 3 | Histórico sem hora; select de veículo sem busca |
| 7 | Flexibilidade | 1 | Sem atalhos, sem busca nos cadastros, linhas não clicáveis, fechamento uma instituição por vez |
| 8 | Estética e minimalismo | 2 | Cromo redundante, KPIs repetidos, ~520px de cabeçalho no celular; 50 textos ≤9px |
| 9 | Recuperação de erros | 2 | "Failed to fetch" em inglês vaza e esconde a orientação anti-duplicidade |
| 10 | Ajuda | 2 | Dicas pontuais; sem ajuda de tarefa para fechar o mês |
| **Total** | | **23/40** | **Aceitável** |

## Veredito de especificidade
Template genérico de painel administrativo pintado de verde (workspace switcher num sistema de um posto, 4 KPIs com ícone, card escuro com círculos decorativos, sobretítulos espaçados, Arial). Fechamento mensal tem a mesma cara da visão geral e não parece documento de cobrança. Detector: `overused-font` (Arial) real nas duas fontes; `border-accent-on-rounded` falso positivo (sublinhado de aba sem raio). Overlay no navegador: low-contrast 53/72/23 achados (visão geral/fechamento/colaborador), undersized-ui-text, tiny-text, kicker-above-heading, icon-tile-stack.

## Auditoria técnica: 10/20 (Aceitável)
Acessibilidade 2 · Performance 2 · Theming 1 · Responsivo 3 · Integridade 2. 57/104 pares de cor falham AA; 153 hex soltos contra 5 tokens; polling de 5 s baixa histórico inteiro sem timeout/AbortController; modal sem gestão de foco; menu mobile fechado focável; ~95 KB de Tailwind sem uso.

## Priority Issues
- [P1] Recibo de envio fora da tela + envio sem timeout → reenvio e duplicata. Fix: recibo em tela cheia no lugar do formulário, timeout 15 s, mensagens de rede em pt-BR, rascunho persistido. (/impeccable harden, /impeccable clarify)
- [P1] Texto 7–10px e contraste 2,1–3,1:1 em todo o texto secundário; bordas e foco <3:1. Fix: escala em rem com piso 12px, neutros ≥4,5:1, tokens semânticos. (/impeccable typeset, /impeccable colorize)
- [P1] Valor a faturar cortado em tablet/celular; números alinhados à esquerda. Fix: linhas viram cards <900px, tabular-nums à direita. (/impeccable adapt)
- [P1] Rede sem resiliência: polling sobreposto, histórico completo a cada 5 s, sem ETag. (/impeccable harden, /impeccable optimize)
- [P2] Fechamento não parece fechamento: sem documento por instituição, sem estado conferido, primário errado. (/impeccable shape, /impeccable distill)
- [P2] Colaborador atravessa ~520px de cromo; botão abaixo da dobra; combustível poderia ser botões. (/impeccable distill, /impeccable adapt)

## Persona Red Flags
- Alex (admin): sem Esc, sem atalhos, sem detalhe de linha, fechar 3 instituições = 3 impressões.
- Sam (a11y): contraste, 7–9px, gráfico sem alternativa, modal sem foco, sem aria-current/expanded.
- Casey / "Seu Zé" (colaborador, Android antigo, 3G): botão de envio em y=1113 de 844, recibo fora da tela, rascunho perdido, histórico sem hora, polling pesado.

## Minor Observations
Marca repetida 3x na sidebar; "Faturamento mensal" solto nos filtros; eixo do gráfico com "Litros" no meio e escala inconsistente <100 L; passo "01" sem passo 02; "October 2026" e validação no idioma do navegador; spinners que não giram; sombra do menu vazando; código morto para não-admin.

## Questions to Consider
- Se o fechamento é o produto, por que a primeira tela é um dashboard genérico e não "Outubro: 3 instituições a fechar"?
- Como o colaborador sabe, sem ler, que o último abastecimento entrou?
- Qual o caminho visual quando o colaborador erra 45 por 450 litros, se nada pode ser editado?
