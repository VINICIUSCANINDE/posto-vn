# Decisões do dono

## 12/11/2026: tanque, cancelamento e busca nos seletores

- Há um tanque por combustível cadastrado, e todo abastecimento novo desconta do tanque do combustível escolhido.
- Se o abastecimento passar do saldo, ele é gravado e o sistema avisa; o saldo pode ficar negativo. A medição da entrega e a da bomba raramente batem, e bloquear pararia o colaborador na pista.
- O administrador cancela qualquer abastecimento e o colaborador cancela os próprios, sem prazo. O motivo é obrigatório e nada é apagado.
- "Pesquisar por placa nas peças e nos carros" quer dizer buscar digitando dentro dos seletores: peça, placa de destino, saída com sobra, filtro por veículo, veículo do lançamento e do contrato. As listas já tinham campo de busca.
- Premissas aceitas no plano: o colaborador também registra chegada de combustível, o saldo inicial entra como a primeira chegada, abastecimentos anteriores não descontam do tanque e chegada não é editada nem cancelada nesta versão.

## 13/11/2026: cancelar chegada de combustível

- Uma chegada de 5.000 L foi gravada como 5 L: o campo numérico lia "5.000" como cinco com três casas decimais. O campo agora lê o ponto como separador de milhar e mostra quantos litros serão gravados. Depois disso a mesma chegada foi lançada duas vezes.
- Chegada lançada errado pode ser cancelada, com motivo, como o abastecimento: o administrador cancela qualquer chegada e o colaborador só as próprias. Nada é apagado.
- As chegadas erradas de 12 e 13/11 ficam como estão até o dono cancelá-las pelo sistema.
