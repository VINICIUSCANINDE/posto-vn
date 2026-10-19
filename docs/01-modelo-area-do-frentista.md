# Controle de Transporte — MODELO DA ÁREA DO COLABORADOR
## Documento para desenvolvimento

### Objetivo
Criar uma área exclusiva, acessada pelo navegador no celular, tablet ou computador, para o colaborador registrar abastecimentos. Cada registro deve ser gravado no mesmo banco de dados utilizado pelo painel de gestão e aparecer automaticamente para o administrador.

### Identidade e endereço
- Nome: Controle de Transporte — Área do Colaborador.
- Identidade visual: verde escuro, branco e verde claro, seguindo o painel de gestão.
- Priorizar facilidade de uso no celular, com campos legíveis e botões grandes.
- Endereço sugerido após configuração do domínio: postovn.com.br/frentista. Esse endereço é uma proposta, ainda não conectado.

### Tela 1 — Entrada
- Acesso individual por funcionário.
- Somente contas cadastradas e autorizadas pela administração podem entrar.
- Exibir o nome do funcionário conectado e a opção Sair.
- Login próprio por e-mail e senha (Better Auth), com contas criadas pelo administrador por link de convite e permissões por perfil verificadas no servidor.
- Não usar uma senha compartilhada por todos os funcionários.

### Tela 2 — Novo abastecimento
Apresentar os seguintes campos:

| Campo | Regra |
| --- | --- |
| Veículo / placa | Obrigatório. Selecionar entre os veículos cadastrados pela administração. |
| Instituição | Preenchida automaticamente a partir do veículo; não editável pelo colaborador. |
| Combustível | Obrigatório. Selecionar entre os combustíveis cadastrados. |
| Data | Obrigatória; iniciar com a data atual e impedir datas futuras. |
| Litros | Obrigatório; valor positivo, com até três casas decimais. |
| Odômetro em km | Obrigatório; número inteiro, não negativo, com validação contra o histórico. |
| Motorista | Nome, opcional nesta primeira versão. |
| Observação | Texto opcional. |
| Preço por litro | Obtido do cadastro administrativo; não editável pelo colaborador. |
| Valor total | Calculado automaticamente: litros × preço vigente, arredondado para centavos. |

Botão principal: **Salvar e enviar à gestão**.

Ao salvar:
1. Validar os dados no servidor, inclusive veículo, instituição, combustível e preço.
2. Registrar o funcionário responsável e a data/hora da gravação.
3. Gravar o abastecimento no banco compartilhado.
4. Mostrar confirmação somente após o servidor confirmar a gravação, usando os valores efetivamente salvos.
5. Exibir mensagem clara em caso de erro e preservar os campos preenchidos.
6. Evitar lançamentos duplicados por toque repetido ou repetição da mesma solicitação.

É necessário estar conectado à internet. Não apresentar lançamento offline como concluído.

### Tela 3 — Meus lançamentos
- Mostrar somente os abastecimentos registrados pela conta conectada.
- Permitir busca por placa e instituição.
- Exibir data, placa, veículo, instituição, combustível, litros, odômetro, valor e confirmação de envio.
- Exibir um resumo dos próprios abastecimentos e veículos atendidos no dia.
- O colaborador não poderá alterar nem excluir abastecimentos já confirmados.

### Permissões
O colaborador não pode acessar relatórios gerais, fechamento mensal, cadastros de clientes/instituições/pessoas/veículos/contratos, gestão de equipe ou alterações de preços. A proteção deve existir no servidor; ocultar botões não é suficiente. Também não pode consultar lançamentos de outros funcionários.

### Integração obrigatória com a gestão
- Usar o mesmo banco de dados e as mesmas regras de negócio do painel administrativo.
- Não manter uma base independente que dependa de exportação ou digitação posterior.
- Cada abastecimento deve ter identificador único e vínculo com veículo, instituição e funcionário.
- Preservar no lançamento o preço por litro, valor total e identificação histórica do veículo e da instituição.
- Atualizar a gestão automaticamente em até 5 segundos enquanto o painel estiver aberto e conectado. Pode ser usada atualização periódica ou tecnologia em tempo real.
- Ao retomar o painel da gestão, buscar os registros mais recentes.
- Falhas de sincronização devem ficar visíveis; não indicar conexão saudável quando a atualização falhar.

### Critérios de aceite
- Um colaborador autorizado registra um abastecimento e o administrador o vê sem atualizar manualmente a página.
- Uma alteração posterior de preço não modifica o abastecimento anterior.
- O colaborador não consegue acessar funções administrativas nem dados de outros funcionários, mesmo por requisições diretas.
- Um lançamento com erro de validação não é gravado.
- O formulário funciona corretamente no celular.

### Material existente e limites
A implementação atual usa Next.js na Vercel, banco Neon Postgres e login próprio; detalhes em `README.md` e `docs/implementacao-atual.md`. Os testes `pnpm test:integracao` (22 verificações) e `pnpm test:oficina` (28 verificações) passam localmente; isso não substitui a homologação no ambiente de produção.

O site está privado. A liberação dos funcionários depende de cadastro interno e autorização na hospedagem. O domínio postovn.com.br ainda não foi conectado. A migração para a plataforma Google foi solicitada pelo cliente, mas não foi executada; o desenvolvedor deverá definir o serviço adequado e adaptar hospedagem, autenticação e banco, caso essa escolha seja mantida.

## Acesso unificado do colaborador

A mesma pessoa registra abastecimentos e controla a Oficina pelo acesso `/frentista` (Área do colaborador), com as seções Início, Meus lançamentos e Oficina. O perfil técnico `attendant` pode cadastrar peças, registrar entradas, planejar uso por veículo e registrar entregas. Não pode alterar preços de combustíveis, cadastros administrativos ou usuários, nem consultar relatórios gerais. O servidor aplica as mesmas restrições.
