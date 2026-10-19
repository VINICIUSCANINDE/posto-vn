# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Administrador** — dono/gestor do posto. Acesso completo: cadastros (instituições, veículos, pessoas, contratos, combustíveis/preços, equipe), relatórios e fechamento mensal.
- **Colaborador** — funcionário da pista (antes chamado "frentista" no código; renomeado na interface). Lança abastecimentos pelo celular, enquanto trabalha, e só vê os próprios lançamentos.

O colaborador é o usuário mais exposto a condições ruins: no local do abastecimento, muitas vezes com celular mais simples/antigo e conexão instável. O administrador normalmente acessa de um ambiente mais estável (escritório, computador ou tablet) para fazer o fechamento mensal.

## Product Purpose

Controla os abastecimentos de veículos de instituições-cliente (empresas, órgãos públicos e outras instituições atendidas em regime de conta/contrato, não consumidor final avulso) de um posto de combustível, e gera o fechamento mensal de faturamento por instituição. Existe para substituir o controle manual em caderno/planilha, que gerava erro, atraso e imprecisão no fechamento de cada instituição.

## Positioning

Conecta em tempo real o lançamento do colaborador na bomba ao painel do administrador — mesmo banco de dados, sincronização automática em até 5 segundos — preservando no histórico o preço e a identificação do veículo/instituição vigentes no momento do abastecimento, mesmo que o cadastro mude depois. Nenhum controle manual em papel ou planilha solta garante essa rastreabilidade por abastecimento nem gera o fechamento mensal por instituição automaticamente.

## Operating Context

- Colaborador no local do abastecimento (pista), em pé, usando o celular, possivelmente com aparelho mais simples/antigo e conexão de internet variável.
- Lançamento exige conexão ativa; não existe modo offline nem lançamento "pendente de sincronizar".
- Administrador faz o fechamento mensal por instituição (mês + instituição selecionados), exporta CSV e pode imprimir em PDF.
- Instituições atendidas são empresas e órgãos públicos com conta/contrato no posto — não é venda avulsa no balcão.
- Sistema de uso interno exclusivo deste posto; não é um produto multi-tenant para outros donos de posto.

## Capabilities and Constraints

- Stack atual: Next.js 16 na Vercel, Neon Postgres (Drizzle) e login próprio por e-mail e senha (Better Auth), com contas criadas pelo administrador por link de convite de 3 horas e uso único.
- Domínio próprio `postovn.com.br` ainda não conectado; domínio de envio de e-mail (Resend) ainda não verificado.
- Sem recebimento online, emissão de nota fiscal ou integração com bombas de combustível, a menos que contratados separadamente.
- Preço por litro e nome de instituição/veículo são preservados no histórico de cada abastecimento mesmo após o cadastro ser alterado depois.
- Não existe exclusão de lançamentos; alterações de cadastro geram registro de auditoria.
- Permissão por perfil (administrador/colaborador) é sempre verificada no servidor, nunca só ocultando elementos na tela.

## Brand Commitments

- Nome do produto: **Controle de Transporte**. "Posto VN" era o nome anterior e já foi substituído na interface e na documentação; não usar a grafia "CONTROLE TRANSPORTE".
- Paleta: manter as cores já em uso — verde escuro (`#102d26`), verde (`#157255`), verde claro (`#eaf4ed`) sobre branco e fundo `#f5f7f5`. Cinzas e estados podem ser ajustados para atingir contraste AA, sem trocar a família de cor.
- Direção visual: o padrão da categoria (painel SaaS limpo), executado no nível de acabamento de Stripe Dashboard, Linear e Nubank/Conta Azul — escolha consciente do usuário, sem ironia nem enfeite.
- O resultado não pode ficar chamativo/infantil (é um sistema de faturamento) nem piorar o lançamento rápido no celular.
- O papel de funcionário de pista é chamado **"colaborador"** na interface voltada ao usuário (o termo "frentista" permanece só na rota técnica `/frentista` e em nomes internos de código/CSS, não no texto visível).

## Evidence on Hand

- Nenhum dado fictício ou real de cliente faz parte da entrega (confirmado em `README.md`).
- Capturas de tela de referência em `docs/previas/`.
- 19 verificações de integração automatizadas em `tests/integration.mjs`, cobrindo autenticação, cálculo de total, preço histórico, placa duplicada, litros negativos, odômetro regressivo, proteção de origem e permissões por perfil.
- Especificações funcionais detalhadas em `docs/01-modelo-area-do-frentista.md` e `docs/02-modelo-painel-de-gestao.md`.

## Product Principles

1. O lançamento do colaborador na pista precisa funcionar bem em celular simples e conexão ruim — essa é a cena real de uso, não um caso extremo a tolerar.
2. Nenhuma alteração de cadastro (preço, nome de instituição ou veículo) pode mudar retroativamente um abastecimento já lançado.
3. Toda permissão é garantida no servidor; a interface pode guiar o usuário, mas nunca é a única barreira de acesso.
4. O fechamento mensal por instituição é o entregável central do produto — precisa ser confiável o bastante para cobrar uma instituição sem retrabalho manual.

## Accessibility & Inclusion

Sem exigência formal de acessibilidade (leitor de tela, alto contraste, etc.) registrada até agora. Ponto crítico real e confirmado: o celular do colaborador na pista pode ser mais simples/antigo e a conexão pode ser instável — a área do colaborador precisa continuar legível, rápida e utilizável nessas condições (campos grandes, pouco peso de dados, feedback claro de erro e de status de sincronização).
