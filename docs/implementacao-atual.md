# CONTROLE TRANSPORTE — sistema de abastecimentos

Primeira implementação validada localmente: instalação, TypeScript, compilação e 19 verificações de integração concluídas com sucesso. A interface de login, painel e fechamento mensal foi inspecionada no navegador. Dados de teste removidos do banco local. A publicação segue o fluxo Sites; domínio próprio e liberação de funcionários dependem de configuração posterior.

## Funcionalidades implementadas no código

- Interface responsiva em português, sem dados fictícios.
- Perfis administrador e frentista com autorização nas operações do servidor.
- Instituições, pessoas, veículos vinculados a instituições, contratos, combustíveis e equipe.
- Abastecimentos com data, placa, instituição, motorista, litros, odômetro e preço vigente.
- Preços e nomes preservados no histórico de abastecimentos.
- Relatório mensal por instituição e relação de veículos/abastecimentos.
- Exportação CSV compatível com planilhas e impressão em PDF pelo navegador.
- Banco D1 compartilhado entre dispositivos.
- Alterações de cadastros registradas em auditoria; lançamentos não são sobrescritos.

## Pendências para funcionamento

1. Dependências instaladas e registradas em pnpm-lock.yaml.
2. Migração gerada e inspecionada em drizzle/0000_redundant_weapon_omega.sql.
3. Compilação pelo helper Sites concluída.
4. Migração local aplicada. Testes de integração: autenticação, instituição, veículo, combustível, cálculo, preço histórico, placa duplicada, litros negativos, odômetro regressivo, proteção contra origem externa e permissões do frentista. O teste foi executado com dados fictícios e limpeza posterior.
5. Sincronizar o código e publicar com o fluxo Sites usando o project_id já existente em `.openai/hosting.json`. Não criar outro site.
6. Abrir o site privado como proprietário antes de liberar qualquer outra conta. O primeiro usuário autenticado, durante a fase privada, recebe o perfil administrador principal.
7. Cadastrar preços, instituições, veículos e equipe. Liberar funcionários na política de acesso da hospedagem, além de cadastrar o perfil interno. O login atual usa a autenticação ChatGPT fornecida pelo Sites.
8. Confirmar a propriedade de postovn.com.br e conectar o domínio na hospedagem com os registros DNS fornecidos. O domínio ainda não foi conectado.

## Operação mensal

O frentista seleciona veículo e combustível, informa litros, data e odômetro e salva. A instituição é obtida do cadastro do veículo e o preço vem do cadastro administrativo. No fechamento mensal, o administrador seleciona mês e instituição, confere os totais, exporta CSV ou imprime em PDF.

Os contratos nesta versão registram instituição, pessoa/veículo opcional e vigência. Não aplicam limites de crédito, bloqueios automáticos ou regras contratuais ao abastecimento. O relatório é gerado sob demanda; não existe envio automático no fim do mês.

## Área do frentista vinculada

- `/frentista`: formulário dedicado e histórico da própria conta, com dados limitados no servidor mesmo em prévia pelo administrador.
- `/`: gestão; contas de frentista são encaminhadas à sua área.
- Ambas as áreas usam o mesmo banco D1. A gestão consulta novos registros a cada 5 segundos enquanto a aba está visível e ao retomar o foco.
- Requer conexão à internet. A confirmação é exibida após a gravação e usa o preço efetivamente salvo pelo servidor.
- A hospedagem permanece privada. Funcionários precisam de cadastro interno com perfil frentista e liberação na política de acesso Sites antes de abrir o endereço.

## Oficina

Novo menu administrativo com estoque de peças, entradas e saídas, uso previsto por veículo e peças efetivamente entregues. A saída identifica quem recebeu e baixa o estoque de forma atômica. Consulte `docs/03-modulo-oficina.md` para as regras completas.

A instalação local agora também exige a migração `drizzle/0001_blue_giant_man.sql`, depois da 0000, usando o mesmo comando de migração e sem reaplicar arquivos já executados. Os testes específicos da Oficina estão em `tests/workshop.mjs` (executar com o servidor local aberto: `node tests/workshop.mjs`). Foram aprovados 21 testes da Oficina e 19 dos abastecimentos, totalizando 40 verificações de integração.
