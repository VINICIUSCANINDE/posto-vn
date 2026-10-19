# Controle de Transporte — sistema completo

Código e documentação das duas áreas do sistema de abastecimentos do Controle de Transporte.

## Conteúdo

- `app/dashboard.tsx`: painel de gestão.
- `app/frentista/`: área exclusiva do frentista.
- `app/api/data/`: serviço compartilhado, validações e permissões.
- `db/` e `drizzle/`: estrutura do banco e migração.
- `docs/01-modelo-area-do-frentista.md`: especificação para o desenvolvedor.
- `docs/02-modelo-painel-de-gestao.md`: especificação para o desenvolvedor.
- `docs/previas/`: imagens das interfaces.
- `docs/implementacao-atual.md`: funcionamento, testes e pendências.
- `tests/integration.mjs`: verificações de integração local.

## Links publicados

- Gestão: https://posto-vn-gestao.viniciuscaninde15.chatgpt.site/
- Colaborador: https://posto-vn-gestao.viniciuscaninde15.chatgpt.site/frentista

Acesso privado na hospedagem Sites. Ambas as áreas utilizam o mesmo banco. A gestão busca novos registros a cada 5 segundos enquanto a aba está visível.

## Ambiente de desenvolvimento

Implementação atual: Vinext/React, TypeScript, Cloudflare Workers e D1, autenticação fornecida pelo Sites. Use Node.js 24 e pnpm 11.25.0 para reproduzir o ambiente validado.

1. Instale as dependências: `pnpm install --frozen-lockfile`.
2. Verifique tipos: `pnpm exec tsc --noEmit`.
3. Compile: `pnpm run build`.
4. Aplique uma única vez a migração ao banco **local**, conforme `docs/implementacao-atual.md` e a documentação do starter:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_redundant_weapon_omega.sql
```

5. Inicie: `pnpm run dev`.
6. Com o servidor local na porta 5173 e o banco de desenvolvimento disponível, execute em outro terminal: `node tests/integration.mjs`.

O teste utiliza autenticação simulada local, cria registros fictícios, verifica permissões e integração e limpa os registros criados. Execute somente em ambiente local de desenvolvimento descartável. Foram aprovadas 19 verificações de integração na versão entregue.

## Implantação e limites

- A configuração `.openai/hosting.json` identifica a publicação Sites existente; não contém senha ou token. Não criar um novo Site por engano.
- Este projeto não foi migrado ao Google. Essa migração exige adaptar aplicação, autenticação e banco.
- O domínio postovn.com.br ainda não está conectado.
- Cadastros e acesso de funcionários precisam ser configurados antes do uso pela equipe.
- Nenhum dado real de clientes, abastecimentos, banco local ou credencial de acesso faz parte desta entrega.
- Publicar o código no GitHub não publica automaticamente a aplicação nem migra o banco.

Prefira manter este repositório privado e conceder acesso somente aos desenvolvedores responsáveis.

## Oficina

Menu **Oficina** no painel administrativo e aba **Oficina** na área do colaborador (`/frentista`): estoque de peças, entradas, uso previsto por veículo e entregas com identificação de quem recebeu. A saída baixa o estoque dentro de uma transação, e o `CHECK` da tabela `workshop_counters` impede saldo negativo mesmo com envios simultâneos. Colaboradores podem operar a Oficina, mas continuam sem acesso a preços, cadastros administrativos, equipe e relatórios. Regras completas em `docs/03-modulo-oficina.md`.

Para atualizar um banco existente, rode `pnpm db:migrate`, que aplica `drizzle/0001_same_steel_serpent.sql`.
