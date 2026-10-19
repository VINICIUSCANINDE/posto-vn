# Controle de Transporte

Sistema interno do posto para lançar abastecimentos de veículos de instituições conveniadas, controlar a Oficina (estoque e entrega de peças por veículo) e fechar a cobrança mensal de cada instituição.

Duas áreas, um banco:

- **Administração** (`/`): visão geral, abastecimentos, Oficina, cadastros (instituições, veículos, pessoas, contratos), fechamento mensal, combustíveis e preços, equipe e acessos.
- **Colaborador** (`/frentista`): lançamento rápido de abastecimento pelo celular, histórico da própria conta e Oficina. A rota mantém o nome técnico antigo; na interface o perfil se chama "colaborador".

A administração busca novos registros a cada 5 segundos enquanto a aba está visível.

## Stack

- Next.js 16 (App Router), React 19 e TypeScript, hospedado na Vercel.
- Neon Postgres (provisionado pelo Marketplace da Vercel) com Drizzle ORM.
- Login próprio com e-mail e senha via Better Auth. Não existe cadastro público.
- E-mail de recuperação de senha via Resend.
- Interface com componentes próprios (`components/`), Radix Select e animações do React Bits (respeitam "reduzir movimento").

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `app/dashboard.tsx` | Painel administrativo |
| `app/frentista/` | Área do colaborador |
| `app/workshop.tsx` | Interface da Oficina (usada nas duas áreas) |
| `app/auth-screens.tsx` | Login por perfil, primeiro acesso, esqueci/redefinir senha e convite |
| `app/api/data/` | Cadastros, abastecimentos, equipe e permissões |
| `app/api/workshop/` | Operações da Oficina (transacionais) |
| `app/api/convite/`, `app/api/setup/` | Aceite de convite e criação do primeiro administrador |
| `lib/auth.ts`, `lib/permissions.ts` | Configuração do Better Auth e perfis |
| `lib/invites.ts` | Links de convite |
| `lib/email.ts` | Envio de e-mail (Resend) |
| `components/` | Campos, selects, modal, toolbar, link de convite e animações |
| `db/`, `drizzle/` | Esquema e migrações do banco |
| `tests/` | Testes de integração e da Oficina |
| `docs/` | Especificações e regras de negócio |

## Acesso e contas

- **Perfis:** `admin` (administrador) e `attendant` (colaborador). As permissões são sempre verificadas no servidor.
- **Primeiro acesso:** com o banco vazio, a tela de login do administrador pede para criar a primeira conta de administrador. Depois disso, essa opção some.
- **Novas contas:** o administrador cadastra nome, e-mail e perfil em **Equipe e acessos** e recebe um **link de convite** para enviar à pessoa (copiar ou WhatsApp). O link vale por **3 horas** e funciona **uma única vez**: quando a pessoa cria a senha, ele deixa de funcionar. Gerar um novo link cancela o anterior.
- **Esqueci minha senha:** envia por e-mail um link válido por 1 hora. Em desenvolvimento, sem `RESEND_API_KEY`, o link aparece no terminal do servidor.
- **Desativar conta:** ao editar o membro, mude **Acesso** para "Desativado". A pessoa não consegue mais entrar.

## Ambiente de desenvolvimento

Requer Node.js 24 e pnpm 11.

1. Instale as dependências: `pnpm install`.
2. Baixe as variáveis do projeto na Vercel: `vercel env pull .env.local` (o projeto precisa estar vinculado com `vercel link`).
3. Aplique as migrações pendentes: `pnpm db:migrate`.
4. Inicie: `pnpm dev` (abre em http://127.0.0.1:3000).

Outros comandos: `pnpm exec tsc --noEmit` (tipos), `pnpm lint`, `pnpm build`, `pnpm db:generate` (gera migração depois de alterar `db/schema.ts`).

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão do app com o Neon (pool) |
| `DATABASE_URL_UNPOOLED` | Conexão direta, usada nas migrações e nos testes |
| `BETTER_AUTH_SECRET` | Segredo das sessões (obrigatório, nunca versionar) |
| `BETTER_AUTH_URL` | URL pública do app; na Vercel, se ausente, usa a URL de produção do projeto |
| `RESEND_API_KEY` | Envio de e-mail; obrigatória em produção |
| `EMAIL_FROM` | Remetente dos e-mails, de um domínio verificado no Resend (sem ela, usa o remetente de teste `onboarding@resend.dev`, que só entrega para o dono da conta Resend) |

`.env.local` está no `.gitignore` e não deve ser versionado.

## Testes

Com o servidor rodando (`pnpm dev`), em outro terminal:

```sh
pnpm test              # os dois conjuntos
pnpm test:integracao   # login, abastecimentos e permissões (22 verificações)
pnpm test:oficina      # estoque, planejamento, entregas e concorrência (28 verificações)
```

Os testes entram com as contas de teste (`TEST_ADMIN_EMAIL`/`TEST_ADMIN_PASSWORD` e `TEST_COLAB_EMAIL`/`TEST_COLAB_PASSWORD`, com padrão nas contas locais), criam registros fictícios e, ao final, removem só o que criaram. **Rode apenas contra um banco de desenvolvimento**, nunca contra o banco com dados reais.

## Publicação

Produção: https://gestaotransportece.com.br (também em https://controle-de-transporte-one.vercel.app)

O projeto da Vercel está conectado a `VINICIUSCANINDE/posto-vn`:

- Push na `main` publica em produção automaticamente.
- Outras branches e pull requests ganham um link de prévia próprio. As prévias usam o mesmo banco da produção; não teste nelas com dados fictícios.
- Mudanças em `db/schema.ts` exigem `pnpm db:migrate` contra o banco de produção **antes** do push que depende delas.

Pendente: verificar o domínio de envio no Resend e configurar `RESEND_API_KEY` e `EMAIL_FROM` na Vercel.

## Regras de negócio

- O preço por litro e os nomes de instituição e veículo ficam gravados em cada abastecimento; mudar o cadastro depois não altera o histórico.
- Abastecimentos não são editados nem apagados. Alterações de cadastro geram registro de auditoria.
- O odômetro não pode ser menor que o do abastecimento anterior do veículo nem maior que o de um abastecimento posterior.
- Sem recebimento online, nota fiscal ou integração com bombas.
- Oficina: estoque nunca negativo, garantido por `CHECK` no banco e baixa em transação. Regras completas em `docs/03-modulo-oficina.md`.

Detalhes de funcionamento em `docs/implementacao-atual.md`.
