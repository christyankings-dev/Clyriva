# Clyriva Clientes · aplicativo de avisos por empresa (v2.0)

## Finalidade
O Clyriva da **gestão** conserva o painel contábil completo e a carteira exclusiva do administrador. O **Clyriva Clientes** é um aplicativo web instalável, separado, com login por e-mail e senha próprios, que exibe *somente* comunicados explicitamente publicados para a(s) empresa(s) às quais o administrador concedeu acesso. Não existe acesso do cliente ao cofre, carteira JSON, receitas, folhas, relatórios ou tarefas internas.

## Fluxo do administrador
1. Entre no Clyriva e salve a empresa em **Meus clientes**.
2. No topo, abra **Avisos para clientes** (`/avisos-admin.html`).
3. Em **Autorizar aplicativo**, selecione a empresa e informe o e-mail. O servidor cria uma conta confirmada e uma senha aleatória somente se essa conta ainda não existir. Envie o acesso por um canal privado e recomende que o cliente altere a senha.
4. Em **Publicar novo aviso**, selecione a empresa, escreva título, mensagem e, se útil, a data do prazo. Marque *Enviar notificação ao publicar* para notificar os aparelhos autorizados e inscritos.
5. É possível arquivar avisos e revogar imediatamente um vínculo do cliente com uma empresa. O acesso revogado deixa de receber notificações e de consultar avisos daquela empresa.

## Fluxo do cliente
1. Abra `https://clyriva-production.up.railway.app/cliente.html` pelo navegador do celular.
2. Entre com o e-mail e senha enviados pela gestão. A sessão do app do cliente usa uma chave de armazenamento separada da sessão administrativa.
3. Toque em **Instalar Clyriva Clientes**, ou no iPhone utilize Safari → Compartilhar → Adicionar à Tela de Início.
4. No aplicativo instalado, toque em **Ativar notificações** e autorize quando o navegador solicitar.
5. Use **Enviar notificação de teste** para verificar o aparelho; sem permissão e assinatura ativa, o servidor não consegue entregar mensagens.

## Política de avisos e notificações
- Novo comunicado: alerta genérico imediato quando a opção correspondente é marcada e a assinatura está ativa. Mesmo sem aparelho inscrito, o aviso fica salvo para consulta.
- Prazos: rotina diária às **09h de Brasília** verifica comunicados *publicados*, não arquivados, com prazo até 3 dias à frente ou vencidos há até 7 dias. No máximo um lembrete por dia por aparelho.
- A tela bloqueada do celular nunca mostra nome da empresa, dados contábeis, CNPJ ou valores. Para ler detalhes, o cliente precisa entrar no próprio aplicativo.
- Não há disparo automático de notas, guias, anexos ou tarefas internas do administrador.
- As notificações dependem da rede, do sistema operacional, das permissões do aparelho e dos serviços de push do navegador; não substituem a comunicação oficial com o cliente.

## Segurança
- Supabase Auth valida cada sessão e o servidor consulta `clyriva_admins` para operações administrativas.
- `clyriva_client_access` vincula explicitamente usuário/empresa/administrador. O banco confirma que a empresa está ativa na carteira real.
- `clyriva_client_notices` tem RLS de leitura apenas para administrador ou cliente com vínculo confirmado, ativo e específico. Escrever, modificar e arquivar avisos é função somente da gestão.
- Assinaturas Web Push ficam em `clyriva_client_push_subscriptions`, inacessível diretamente aos clientes pelo Data API.
- O servidor remove a assinatura do outro tipo de conta quando ela é associada a um dispositivo, evitando que o mesmo navegador receba mensagens de duas contas diferentes inadvertidamente.
- VAPID e token do agendamento permanecem no Supabase Vault, fora do repositório. O cron chama a função com token verificado no servidor.
- O cliente pode revogar notificações no aparelho. O logout tenta desassociar a assinatura antes de encerrar a sessão.

## Publicação e validação
- Migração: `db/migrations/20261120_client_notices.sql`.
- Edge Functions: `clyriva-client` (administração e push do cliente) e `clyriva-push` (alertas administrativos, atualizado para não conflitar com o mesmo dispositivo).
- Agendamento: `clyriva-clientes-prazos-09h-brasilia` no pg_cron às 12h UTC.
- Páginas: `/cliente.html` e `/avisos-admin.html`.
- Testes adicionais: `tests/cliente_test.py` e testes de permissões/anônimos executados no Supabase.
- **Pendente:** teste de ponta a ponta com uma conta de cliente e um aparelho físico autorizando as notificações. Não declare entrega de push para celular como verificada antes desse teste.

## v2.1 - cobrancas com lembretes D-3 / D-2 / D-1 / D0

Em **Avisos para clientes → Cadastrar cobrança**, selecione empresa, tipo (DAS, Boleto, DARF, FGTS, INSS, Guia, Outro), descricao, valor em reais e vencimento. O vencimento informado e o valor sao apresentados na ficha do cliente. A verificacao diaria ocorre às 09h America/Sao_Paulo via cron 12:00 UTC. Sao produzidas quatro notificacoes independentes por cobranca/assinatura: faltando 3 dias, 2 dias, 1 dia e no vencimento, sempre conforme o fuso brasileiro; o cron deve funcionar e o celular permitir Web Push. Nao ha garantia de hora exata de exibicao pelo sistema operacional. O usuario escolhe se o valor aparece na notificacao, o que pode inclui-lo na tela bloqueada. O sistema nao envia PDFs, codigos de barras nem gera guias de pagamento.

Cada disparo e registrado pela combinacao **endpoint + cobranca + dia do envio**, para evitar duplicidade em execucoes simultaneas ou repetidas. A administracao pode editar cobrancas ativas, marca-las como pagas (interrompendo lembretes futuros) ou arquiva-las. Mensagens avulsas continuam com envio imediato opcional, mas **nao** geram quatro lembretes diarios.

O aplicativo fica associado exclusivamente a cada login de cliente e suas empresas autorizadas. Requer autorizacao explicita do cliente para receber notificacoes. Para verificar a entrega real, cadastra-se uma cobranca ficticia com vencimento em ate tres dias em uma empresa com cliente autenticado e aparelho inscrito e aguarda-se o cron ou um disparo manual autorizado. O servidor e o gateway podem aceitar uma notificacao sem que o telefone a apresente (sem conexao, bateria, bloqueio, permissao etc.).

O registro do ultimo lembrete aceito pelo gateway fica visivel no painel do administrador, mas nao comprova entrega ao dispositivo fisico. Em caso de baixa equivocada, utilize **Reabrir cobrança**. Por privacidade, inscricoes antigas permanecem sem valores em pushes ate o cliente ativar novamente e optar pela exibicao do valor.

## v2.2 — auditoria e confiabilidade

A tela administrativa agora possui indicadores, filtros por empresa e situação, acompanhamento de aparelhos inscritos, redefinição de acesso e exportação das cobranças em CSV. Cada envio é registrado por cobrança, dispositivo e data. Tentativas pendentes podem ser retomadas após 15 minutos, mantendo o bloqueio de envios marcados como concluídos. Antes de enviar, a cobrança é novamente conferida para não notificar pagamentos quitados.

No celular, os valores aparecem nas notificações **somente com marcação expressa** da opção. A preferência por dispositivo é restaurada ao entrar. O app possui filtros de pendentes e pagos e formulário de troca de senha.

Testes físicos de entrega devem ser feitos com o primeiro cliente: instalar o app, autorizar notificações e acionar o botão de teste.

## v2.3 — Documentos de cobranças e comunicados

No painel `/avisos-admin.html`, selecione a empresa, cadastre uma cobrança (DAS, boleto, DARF, etc.), informe valor e vencimento e, opcionalmente, escolha um documento PDF/JPG/PNG de até 5 MB. Os lembretes D-3, D-2, D-1 e D0 continuam independentes da existência de anexo. O anexo pode ser enviado no cadastro, ou adicionado e removido depois, na lista de registros. O comunicado avulso também aceita documento.

O cliente entra em `/cliente.html` com sua conta autorizada e vê os documentos do aviso apenas após o upload ser confirmado. Os botões Visualizar/Baixar chamam a função autenticada para emitir um link temporário (60 segundos); não há bucket público nem links permanentes. Documentos não são enviados dentro da notificação. Links assinados podem ser usados por quem os receber durante seu curto prazo de validade: evite compartilhá-los.

Os arquivos ficam no bucket privado `clyriva-client-attachments`, com limite 5 MB e formatos PDF/JPEG/PNG. O servidor verifica os primeiros bytes do arquivo no fechamento do upload; isto **não substitui antivírus**. O sistema não armazena arquivos em cache offline. Ao sair, o cliente perde acesso a novos links; a revogação não invalida um link previamente assinado até expirar.

Upload e consumo reais requerem uma conta administrativa e um cliente de teste, e ainda não puderam ser realizados por falta de cadastros de clientes na produção. Para o primeiro teste, faça upload de um PDF fictício, abra no app e tente acessar com login de outra empresa.
