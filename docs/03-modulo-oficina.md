# Controle de Transporte — Módulo Oficina

## Navegação
Acesso pelo menu Oficina no painel administrativo e na área do colaborador, com quatro abas:
- Estoque: peças, códigos, unidade, saldo, mínimo e uso previsto pendente.
- Entradas e saídas: histórico de movimentações, fornecedor/documento ou veículo/recebedor.
- Uso previsto: peças necessárias por veículo, quantidade prevista, entregue e pendente.
- Veículos atendidos: peças efetivamente entregues, placa, instituição, data e nome de quem recebeu.

## Operação
1. Cadastrar a peça com código/referência, nome, unidade e estoque mínimo.
2. Registrar uma entrada para adicionar estoque, informando quantidade, data e, opcionalmente, fornecedor, documento e custo unitário.
3. Planejar o uso de uma peça em um veículo cadastrado. Isso registra uma necessidade; não reserva nem baixa o estoque.
4. Registrar a saída/entrega, informando peça, veículo, quantidade, data e nome de quem recebeu. Pode ser vinculada ao planejamento ou realizada diretamente.
5. Conferir o saldo e o histórico. Entregas parciais mantêm a quantidade ainda pendente no planejamento.

As consultas aceitam busca por peça, código, placa ou recebedor, filtro por veículo nas abas pertinentes e exportação CSV da consulta atual.

## Regras
- Disponível para administradores e colaboradores. A mesma conta do colaborador registra abastecimentos e controla peças, entradas, saídas e entregas pela aba Oficina. Relatórios gerais, preços de combustíveis e gestão de usuários continuam restritos à administração.
- Quantidades positivas, com até três casas decimais. Códigos de peças não se repetem no cadastro normal.
- Não permitir estoque negativo ou entrega acima da pendência de um planejamento.
- Validar que a peça e o veículo correspondem ao planejamento escolhido.
- Nome de quem recebeu obrigatório em cada saída.
- Movimentações mantêm a identificação histórica da peça, veículo e instituição, além do responsável pelo registro.
- Entradas e saídas confirmadas não são editadas ou apagadas nesta versão.
- Requer internet. Não há confirmação de entrega offline, assinatura digital ou comprovação de instalação da peça.

## Implementação
`app/workshop.tsx` contém a interface; `app/api/workshop/route.ts` valida as operações no servidor. Os cadastros e movimentos utilizam a tabela entries. A migração `drizzle/0001_same_steel_serpent.sql` (Postgres) cria workshop_counters para os saldos de estoque e pendências dos planejamentos.

Os saldos são inteiros em milésimos. Gravação de saída, baixa no estoque e atualização da pendência ocorrem em uma transação de banco. A restrição de saldo não negativo reverte toda a operação em caso de disputa pelo mesmo estoque.

`pnpm db:migrate` aplica as migrações pendentes, sem reaplicar as já executadas, tanto no banco local quanto no de produção.

## Validação
`pnpm test:oficina` (com `pnpm dev` rodando) executa 28 verificações pela API real, com login de administrador e de colaborador: saída acima do saldo, entrega parcial e completa, veículo incorreto, recebedor obrigatório, data futura, saídas simultâneas, reversão da operação recusada, quantidades fracionárias, origem externa e permissões do colaborador sem acesso administrativo. O teste remove ao final só os registros que criou.

## Placa do veículo de destino

Ao planejar ou registrar a saída de uma peça, a placa do veículo de destino é obrigatória e selecionada entre os veículos cadastrados. O formulário destaca a placa e o modelo antes da confirmação. As consultas de uso previsto, peças recebidas e movimentações identificam explicitamente a placa de destino; o estoque mostra as placas com uso previsto pendente. As exportações CSV incluem a placa e, nas movimentações, o modelo do veículo em colunas separadas. A identificação histórica já registrada no banco é preservada.
