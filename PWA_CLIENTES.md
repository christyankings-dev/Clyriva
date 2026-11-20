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
