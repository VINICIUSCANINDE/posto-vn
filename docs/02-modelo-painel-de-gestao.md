# CONTROLE TRANSPORTE — MODELO DO PAINEL DE GESTÃO
## Documento para desenvolvimento

### Objetivo
Criar um painel administrativo para controlar os abastecimentos lançados pelos frentistas e gerar, no fim de cada mês, um relatório com os veículos abastecidos, a instituição responsável e o valor total a cobrar de cada instituição.

O fluxo principal é de faturamento mensal. Não incluir recebimento online, emissão de nota fiscal ou integração com bombas sem uma contratação específica desses recursos.

### Identidade e endereço
- Nome: CONTROLE TRANSPORTE — Gestão de Abastecimentos.
- Identidade visual: verde escuro, branco e verde claro.
- Interface adaptada a computador, tablet e celular.
- Endereço sugerido após configuração do domínio: postovn.com.br/gestao. Esse endereço é uma proposta, ainda não conectado.
- Referência publicada atual: https://posto-vn-gestao.viniciuscaninde15.chatgpt.site/

### Acesso e segurança
- Acesso individual exclusivo para administradores autorizados.
- Funcionários com perfil frentista devem ser direcionados para a área própria e não receber dados administrativos.
- A versão atual utiliza autenticação pelo ChatGPT. Se for adotado login próprio, adaptar a autenticação e manter as permissões verificadas no servidor.
- Registrar o responsável e a data/hora de alterações importantes.
- Não liberar acesso administrativo por simples troca de endereço ou alteração de dados enviados pelo navegador.

### Módulo 1 — Visão geral
Exibir, conforme o mês e a instituição selecionados:
- Valor total dos abastecimentos.
- Quantidade de abastecimentos.
- Volume total em litros.
- Quantidade de veículos atendidos.
- Movimento diário de abastecimentos.
- Totais por instituição.
- Últimos abastecimentos recebidos.

Receber automaticamente os lançamentos da área do frentista em até 5 segundos enquanto a tela estiver aberta e conectada. Mostrar falha de conexão e buscar dados atuais ao retomar o painel.

### Módulo 2 — Abastecimentos
- Consultar todos os registros, identificando o frentista responsável.
- Filtrar por mês e instituição; buscar por placa, veículo, instituição ou motorista.
- Mostrar data, placa, veículo, instituição, motorista, combustível, litros, preço utilizado, valor total e odômetro.
- Permitir lançamento administrativo quando necessário, seguindo as mesmas validações.
- Preservar o registro original. Eventuais funções futuras de correção ou cancelamento devem manter histórico e identificação do responsável; não apagar silenciosamente os dados.

### Módulo 3 — Instituições e clientes
Cadastrar nome/razão social, documento e contato. Cada instituição concentra os veículos vinculados e os valores do fechamento mensal. Exemplos de clientes possíveis: empresas, órgãos públicos e demais instituições atendidas pelo posto.

### Módulo 4 — Veículos
- Cadastrar placa, modelo/descrição e instituição responsável.
- Impedir placas duplicadas.
- Usar o vínculo com a instituição para preencher automaticamente o abastecimento.
- Uma alteração de cadastro não pode mudar a identificação histórica dos abastecimentos já registrados.

### Módulo 5 — Pessoas
Cadastrar nome, CPF/documento e contato de pessoas associadas à operação. Permitir vincular a pessoa responsável a um contrato.

### Módulo 6 — Contratos
Cadastrar:
- Nome ou identificação do contrato.
- Instituição responsável.
- Pessoa responsável, opcional.
- Veículo específico, opcional e pertencente à instituição selecionada.
- Início e fim da vigência.
- Condições e observações.

A primeira versão registra essas informações. Limites de crédito, cotas por veículo e bloqueio automático por contrato vencido não foram definidos e não devem ser presumidos como existentes. Se necessários, detalhar as regras com o cliente.

### Módulo 7 — Combustíveis e preços
- Cadastrar os tipos de combustível comercializados e o preço por litro.
- Somente administradores podem alterar preços.
- Aplicar preços novos apenas aos próximos lançamentos.
- Gravar no abastecimento o preço efetivamente utilizado e o total em centavos.
- Manter histórico das alterações administrativas.

### Módulo 8 — Equipe e permissões
- Cadastrar nome, e-mail e perfil de cada usuário.
- Perfil administrador: acesso aos módulos de gestão.
- Perfil frentista: somente área de lançamento e histórico da própria conta.
- Diferenciar cadastro interno de usuário e autorização de acesso na hospedagem, quando a plataforma exigir as duas etapas.
- Não conceder acesso administrativo automaticamente a novos usuários.

### Módulo 9 — Fechamento mensal
Selecionar o mês e, opcionalmente, a instituição. O relatório deve apresentar:

**Resumo por instituição:** nome, quantidade de veículos distintos, quantidade de abastecimentos, volume em litros e valor total a faturar.

**Detalhamento:** todos os veículos e abastecimentos do período, com data, placa, instituição, combustível, litros, preço por litro, valor, odômetro, motorista informado e frentista responsável.

Disponibilizar exportação para planilha e impressão/PDF. A versão atual exporta CSV e utiliza a impressão do navegador para PDF. Os totais do resumo e do detalhamento devem coincidir, usando o preço histórico de cada abastecimento.

O fechamento é gerado sob demanda. Não há envio automático por e-mail ou WhatsApp nesta primeira versão.

### Integração obrigatória com a área do frentista
As duas interfaces podem ter endereços separados, mas precisam utilizar um único serviço de dados e um banco compartilhado. Um abastecimento confirmado na área do frentista deve entrar diretamente na gestão, sem importação manual. A identidade do usuário, os vínculos e os valores precisam ser validados no servidor.

### Critérios de aceite
- Um abastecimento salvo pelo frentista aparece automaticamente na gestão e no fechamento do mês correspondente.
- O relatório identifica todos os veículos abastecidos e totaliza corretamente cada instituição.
- Alterações de preços e cadastros não reescrevem o histórico.
- Um frentista não acessa relatórios, alterações de preços ou cadastros administrativos.
- Os filtros afetam de forma consistente os indicadores e os relatórios.
- Falha de rede não é apresentada como sincronização concluída.

### Material existente e limites
O pacote controle-transporte-codigo.zip contém o código atual de ambas as áreas. A implementação usa a plataforma Sites, aplicação Vinext e banco Cloudflare D1; não é um projeto Google já configurado. Foram concluídos compilação, verificação TypeScript e 19 testes de integração locais, além de inspeção visual da interface.

O site está privado e o domínio postovn.com.br ainda não está conectado. O cliente manifestou preferência por hospedagem Google; o desenvolvedor deverá confirmar a escolha, planejar a adaptação de aplicação, autenticação e banco, configurar o domínio e apresentar os custos antes de contratar serviços pagos. Hospedagem e liberação dos funcionários continuam sendo etapas de implantação.

## Acesso unificado do operador

A mesma pessoa pode registrar abastecimentos e controlar a Oficina usando o acesso `/frentista`. A interface agora se chama Área do Operador e possui as abas Novo abastecimento, Meus lançamentos e Oficina. O perfil técnico `attendant` foi mantido para compatibilidade dos usuários existentes e agora pode cadastrar peças, registrar entradas, planejar uso por veículo e registrar entregas. Não pode alterar preços de combustíveis, cadastros administrativos ou usuários, nem consultar relatórios gerais. O servidor aplica as mesmas restrições.

Validação atual: 19 verificações de abastecimentos e 27 de Oficina, totalizando 46 verificações locais aprovadas.
