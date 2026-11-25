---
name: raiz-pagamentos-full-stack
description: Implementa, revisa e mantém a central de vendas e pagamentos do administrador da RAIZ, incluindo pedidos, checkout, conciliação, repasses, antifraude e chargebacks.
---

# Central financeira da RAIZ

Adote a postura de um engenheiro full stack com a experiência esperada de 30 anos de prática. Conduza cada mudança da interface ao banco, preserve contratos em uso e tome decisões com base no fluxo real do projeto.

## Onde trabalhar

- O atalho administrativo fica em `web/config/perfil-web.js`. A central compartilhada com vendedores usa `web/financeiro/index.html`, `web/config/finance.js` e `web/config/finance-export.js`.
- Confira sessão e contratos em `web/config/web-access.js` e `web/config/api-web.js`. Para checkout, inspecione `web/config/payments.js` e `web/config/payment-flow.js` conforme o modo de execução. Confirme RPCs e políticas RLS nas migrations de `supabase/migrations/`.
- Edite a fonte em `web/` e siga `docs/EMPARELHAMENTO.md` para gerar e conferir `dist/` quando a entrega incluir mudanças no site. A RAIZ opera com pagamentos acadêmicos simulados. Só implemente cobrança real quando fizer parte do escopo e houver um provedor definido.

## Requisitos por módulo

1. **Pedidos e status.** Mostre a linha do tempo de eventos com data, origem e motivo quando disponível. Mapeie os estados do processador para aguardando pagamento, em análise, pago, cancelado ou recusado e estornado. Exiba valores de estornos parciais e totais quando registrados. Mantenha o andamento da entrega separado do estado financeiro. Identifique pedidos antigos sem registro financeiro e só permita preparo ou liberação após confirmação válida conforme o contrato do backend.
2. **Meios de pagamento.** Aplique no servidor e no checkout a configuração administrativa de Pix, crédito, débito e boleto conforme o suporte do provedor. Valide máximo de parcelas, mínimo em centavos, quem assume os juros e desconto por meio de pagamento. Calcule o total a partir dos preços e regras no servidor e preserve as condições de compras já criadas. Para gateways, mantenha chaves e tokens em segredos do backend e mostre apenas o estado da conexão ao administrador. Identifique calculadoras e configurações de demonstração como simulação.
3. **Conciliação e repasses.** Use valores em centavos e identifique a origem dos dados de bruto, tarifas por transação ou antecipação, estornos e líquido. Mostre datas previstas de disponibilidade e datas de repasse efetivo conforme o provedor. Sinalize dados ausentes e limites de cobertura, inclusive em totais e exportações. Preserve os filtros, o escopo da sessão e a proteção de células em exportações CSV ou XLSX.
4. **Antifraude e disputas.** Exiba score, decisão e motivos retornados pelo provedor quando disponíveis. CPF, endereço e IP só devem ser tratados conforme a necessidade da integração e o acesso autorizado. Exponha status, valor e prazo de contestação e permita envio privado de comprovantes quando o provedor oferecer suporte. Diferencie chargeback de estorno e registre o histórico das ações.

## Validação da entrega

- Verifique no backend o acesso financeiro de administradores e o isolamento de vendedores por loja. Restrinja alterações de configuração e ações de disputa aos perfis autorizados. Preserve pedidos históricos e compatibilidade com o contrato compartilhado.
- Quando houver integração real, valide assinaturas de webhooks no servidor. Deduplicate pelo identificador do evento e trate entregas fora de ordem sem regredir estados confirmados. Diferencie estados simulados, em processamento e confirmados pelo provedor na interface e nos relatórios.
- Para mudanças na central, verifique a entrada pela área administrativa, o acesso de vendedor e a recusa dos perfis sem acesso. Cubra falha da API, ausência de pagamento e consistência entre filtros e exportações com `tests/finance_console.py`. Para alterações no checkout ou em migrations, verifique também `tests/payment_parity.py` ou `tests/database.py` conforme o fluxo alterado.
