# Controle de Transporte — implementação atual

Sistema em Next.js 16 na Vercel, com banco Neon Postgres e login próprio (Better Auth). Instalação, TypeScript, compilação e os testes de integração (22 verificações) e da Oficina (28 verificações) passam localmente. Os fluxos de login por perfil, convite, recuperação de senha, lançamento em modal e selects foram verificados no navegador (Playwright) em desktop e celular.

## Funcionalidades

- Interface responsiva em português.
- Perfis administrador e colaborador, com autorização verificada nas operações do servidor.
- Login por e-mail e senha com tela própria para cada perfil (`/entrar/administrador` e `/entrar/colaborador`), a partir da escolha em `/entrar`.
- Criação do primeiro administrador quando o banco não tem nenhuma conta.
- Contas novas por link de convite (3 horas, uso único) e recuperação de senha por e-mail.
- Instituições, pessoas, veículos vinculados a instituições, contratos, combustíveis e equipe.
- Abastecimentos com data, placa, instituição, motorista, litros, odômetro e preço vigente.
- Preços e nomes preservados no histórico de abastecimentos.
- Fechamento mensal por instituição, com exportação CSV e impressão em PDF pelo navegador.
- Oficina: estoque de peças, entradas, uso previsto por veículo e entregas (`docs/03-modulo-oficina.md`).
- Alterações de cadastros registradas em auditoria; lançamentos não são sobrescritos.

## Contas e acesso

1. **Primeiro administrador.** Com o banco vazio, a tela de login do administrador mostra o formulário de criação da primeira conta (`POST /api/setup`). A rota recusa a criação quando já existe qualquer conta.
2. **Convidar alguém.** Em Equipe e acessos, o administrador informa nome, e-mail e perfil. A conta é criada sem senha e o sistema mostra o link de convite, que pode ser copiado ou enviado pelo WhatsApp.
3. **Aceite do convite.** A pessoa abre `/convite?token=…`, cria a senha e já pode entrar. O banco guarda só o hash do token. O link expira em 3 horas, deixa de valer quando é usado e é cancelado se outro for gerado para a mesma pessoa. Aceitar o convite encerra sessões anteriores da conta.
4. **Novo link.** Para quem perdeu o convite ou precisa redefinir o acesso, a ação "Gerar link" na lista da equipe cria um novo convite.
5. **Esqueci minha senha.** Envia um link por e-mail (Resend), válido por 1 hora. Redefinir a senha encerra as sessões abertas.
6. **Desativar.** Editar o membro e mudar Acesso para Desativado bloqueia o login e as chamadas à API.

A situação de cada membro aparece na lista: Ativo, Convite pendente (com horário de validade), Convite expirado ou Desativado. Um administrador não consegue remover o próprio perfil de administrador.

## Banco de dados

- `entries`: cadastros, abastecimentos, movimentos da Oficina e auditoria, com os dados em JSON e o tipo em `kind`.
- `workshop_counters`: saldos de estoque e pendências de planejamento em milésimos, com `CHECK (units >= 0)`.
- `invite`: convites (hash do token, validade, uso e cancelamento).
- `user`, `session`, `account`, `verification`: tabelas do Better Auth.

Migrações em `drizzle/` (`0000` autenticação e entries, `0001` Oficina, `0002` convites), aplicadas com `pnpm db:migrate`.

## Operação mensal

O colaborador abre "Novo abastecimento", seleciona veículo e combustível, informa litros, odômetro e data e salva. A instituição vem do cadastro do veículo e o preço vem do cadastro de combustíveis. O formulário guarda um rascunho no aparelho caso a conexão caia antes do envio, mas o lançamento só é gravado com internet. A confirmação mostra o valor efetivamente salvo pelo servidor.

No fechamento mensal, o administrador seleciona mês e instituição, confere os totais e exporta CSV ou imprime em PDF.

Os contratos nesta versão registram instituição, pessoa/veículo opcional e vigência. Não aplicam limites de crédito, bloqueios automáticos ou regras contratuais ao abastecimento. O relatório é gerado sob demanda; não há envio automático no fim do mês.

## Área do colaborador

- `/frentista`: Início, Meus lançamentos e Oficina. No celular, uma barra inferior dá acesso às mesmas seções e ao botão Lançar.
- O servidor só envia ao colaborador os cadastros necessários para lançar (instituições, veículos, combustíveis), a Oficina e os abastecimentos da própria conta, mesmo quando a área é aberta por um administrador.
- O colaborador pode cadastrar peças, registrar entradas, planejar uso e registrar entregas. Não altera preços, cadastros administrativos ou equipe, nem consulta o fechamento mensal.

## Pendências

1. Verificar um domínio de envio no Resend e configurar `RESEND_API_KEY` e `EMAIL_FROM` na Vercel. Sem isso, a recuperação de senha não funciona em produção (os convites não dependem de e-mail).
2. Antes do uso real, remover as contas e os dados de teste do banco para que o primeiro acesso crie o administrador do posto.
3. Conectar o domínio próprio, se desejado.
