# CONTROLE TRANSPORTE — MODELO DA ÁREA DO FRENTISTA
## Documento para desenvolvimento

### Objetivo
Criar uma área exclusiva, acessada pelo navegador no celular, tablet ou computador, para o frentista registrar abastecimentos. Cada registro deve ser gravado no mesmo banco de dados utilizado pelo painel de gestão e aparecer automaticamente para o administrador.

### Identidade e endereço
- Nome: CONTROLE TRANSPORTE — Área do Frentista.
- Identidade visual: verde escuro, branco e verde claro, seguindo o painel de gestão.
- Priorizar facilidade de uso no celular, com campos legíveis e botões grandes.
- Endereço sugerido após configuração do domínio: postovn.com.br/frentista. Esse endereço é uma proposta, ainda não conectado.
- Referência publicada: https://posto-vn-gestao.viniciuscaninde15.chatgpt.site/frentista

### Tela 1 — Entrada
- Acesso individual por funcionário.
- Somente contas cadastradas e autorizadas pela administração podem entrar.
- Exibir o nome do funcionário conectado e a opção Sair.
- A versão atual utiliza autenticação pelo ChatGPT. Caso seja substituída por login próprio, implementar autenticação segura e manter as permissões por perfil no servidor.
- Não usar uma senha compartilhada por todos os funcionários.

### Tela 2 — Novo abastecimento
Apresentar os seguintes campos:

| Campo | Regra |
| --- | --- |
| Veículo / placa | Obrigatório. Selecionar entre os veículos cadastrados pela administração. |
| Instituição | Preenchida automaticamente a partir do veículo; não editável pelo frentista. |
| Combustível | Obrigatório. Selecionar entre os combustíveis cadastrados. |
| Data | Obrigatória; iniciar com a data atual e impedir datas futuras. |
| Litros | Obrigatório; valor positivo, com até três casas decimais. |
| Odômetro em km | Obrigatório; número inteiro, não negativo, com validação contra o histórico. |
| Motorista | Nome, opcional nesta primeira versão. |
| Observação | Texto opcional. |
| Preço por litro | Obtido do cadastro administrativo; não editável pelo frentista. |
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
- O frentista não poderá alterar nem excluir abastecimentos já confirmados.

### Permissões
O frentista não pode acessar relatórios gerais, fechamento mensal, cadastros de clientes/instituições/pessoas/veículos/contratos, gestão de equipe ou alterações de preços. A proteção deve existir no servidor; ocultar botões não é suficiente. Também não pode consultar lançamentos de outros funcionários.

### Integração obrigatória com a gestão
- Usar o mesmo banco de dados e as mesmas regras de negócio do painel administrativo.
- Não manter uma base independente que dependa de exportação ou digitação posterior.
- Cada abastecimento deve ter identificador único e vínculo com veículo, instituição e funcionário.
- Preservar no lançamento o preço por litro, valor total e identificação histórica do veículo e da instituição.
- Atualizar a gestão automaticamente em até 5 segundos enquanto o painel estiver aberto e conectado. Pode ser usada atualização periódica ou tecnologia em tempo real.
- Ao retomar o painel da gestão, buscar os registros mais recentes.
- Falhas de sincronização devem ficar visíveis; não indicar conexão saudável quando a atualização falhar.

### Critérios de aceite
- Um frentista autorizado registra um abastecimento e o administrador o vê sem atualizar manualmente a página.
- Uma alteração posterior de preço não modifica o abastecimento anterior.
- O frentista não consegue acessar funções administrativas nem dados de outros funcionários, mesmo por requisições diretas.
- Um lançamento com erro de validação não é gravado.
- O formulário funciona corretamente no celular.

### Material existente e limites
Já existe uma implementação com as duas áreas, banco compartilhado e atualização automática, publicada na plataforma Sites. Há código-fonte disponível no pacote controle-transporte-codigo.zip. Na validação local, passaram 19 verificações de integração; isso não substitui a homologação do desenvolvedor no ambiente escolhido.

O site está privado. A liberação dos funcionários depende de cadastro interno e autorização na hospedagem. O domínio postovn.com.br ainda não foi conectado. A migração para a plataforma Google foi solicitada pelo cliente, mas não foi executada; o desenvolvedor deverá definir o serviço adequado e adaptar hospedagem, autenticação e banco, caso essa escolha seja mantida.
