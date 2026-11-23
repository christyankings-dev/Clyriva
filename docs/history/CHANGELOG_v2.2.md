# Clyriva v2.2 — Auditoria de segurança, confiabilidade e carteira

Data: 20/11/2026. Escopo: painel administrativo, aplicativo de clientes, notificações Web Push, Supabase, servidor Python, PWA e rotinas de backup.

## Mudanças implementadas

- **Lembretes recuperáveis:** envios pendentes há mais de 15 minutos podem ser retomados pelo agendamento. Há uma chave única por celular, cobrança e data, e o estado `sent` bloqueia novos disparos da mesma etapa.
- **Conferência antes de cada aviso:** a função busca o estado atual da cobrança após reservar o envio. Um boleto marcado como pago ou arquivado não gera um novo lembrete a partir de uma fila antiga.
- **Idempotência de cadastro:** solicitações de criação levam `request_key` único. Se a conexão cair depois de salvar, o novo envio reaproveita o cadastro anterior, sem duplicar a cobrança.
- **Privacidade por padrão:** exibição de valores nas notificações fica desmarcada até consentimento do cliente. A preferência do celular é consultada novamente ao abrir o app.
- **Aparelhos compartilhados:** logout limpa a tela e tenta cancelar a assinatura local independentemente do resultado da API. Login novo não fica bloqueado por instalação de service worker.
- **Acesso e recuperação:** gestão pode redefinir uma senha de cliente já autorizado, com intervalo mínimo entre tentativas e confirmação de que a conta não é administradora. A senha temporária não é gravada em tabela nem exposta continuamente na tela.
- **Gestão dos avisos:** indicadores de pendentes, vencidos, próximos 3 dias e quitados; filtros por empresa e situação; opção de copiar lembrete; CSV das cobranças com proteção contra fórmulas inseridas em células.
- **Acompanhamento da instalação:** contagem dos dispositivos inscritos em cada acesso, sem expor endpoints nem chaves de notificação.
- **Aplicativo do cliente:** filtros para cobranças em aberto, pagas e todos os registros, painel-resumo e formulário para alterar a própria senha.
- **Servidor web:** política de segurança de conteúdo (CSP) aplicada em produção, não mais apenas modo de relatório; cabeçalho de isolamento de recursos do mesmo domínio.

## Compatibilidade

Alterações no banco são **aditivas**. Não há exclusão de contas, de clientes, de cobranças, do cofre ou do histórico. O agendamento principal mantém os disparos às 9h de Brasília; execuções adicionais de revisão já configuradas podem recuperar falhas sem enviar duplicatas para envios registrados como concluídos.

## Testes locais

- `python -m unittest discover -s tests -p '*test.py' -q`
- `node --test tests/reminder_rules_test.mjs tests/core_private_test.js`
- `node tests/edge_integration_v22.mjs`
- `python tests/browser_billing_test.py`
- `python tests/browser_v22_test.py`

Os testes de navegador usam dados fictícios e API simulada. Os testes da função de borda simulam Gateway Web Push e Supabase, inclusive falhas de envio, reexecução, cobranças pagas e prevenção de repetição. O navegador automatizado não conseguiu navegar até a prévia servida por endereço local devido a restrições do ambiente; os testes em DOM simulado foram executados.

## Limitações e pendências

1. **Não foi confirmada a entrega real** em Android/iPhone; requer primeiro cliente autenticado e com notificações autorizadas em dispositivo físico.
2. A confirmação de `sendNotification` registra aceite do serviço Web Push, **não leitura pelo cliente** e nem garantia de exibição pelo SO.
3. A proteção de senhas vazadas do Supabase permanece dependente da configuração/assinatura do provedor.
4. O banco oficial estava sem empresas, clientes convidados, cobranças ou aparelhos inscritos durante a auditoria. Portanto testes de dados reais do fluxo completo não foram realizados.
5. A exportação CSV cobre cobranças e mensagens financeiras, **não substitui backup completo do Supabase**, nem substitui o backup da carteira administrativa e do cofre.
6. A área cliente é um **canal de avisos, não emissão ou liquidação de boletos**. O status de pagamento continua sob controle do administrador.
