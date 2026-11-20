# Clyriva PWA — Instalação e notificações

O Clyriva pode ser instalado como aplicativo web pela URL oficial. **Não é um APK nem um aplicativo da App Store.** Mantém exatamente o login e o banco da versão web. Não armazena carteiras financeiras para leitura offline.

## Instalar no celular

- **Android:** abra o site oficial no Chrome/Edge, toque em **Instalar Clyriva**. Se o navegador não mostrar o aviso, use menu ⋮ → **Instalar app / Adicionar à tela inicial**.
- **iPhone (iOS 16.4+):** abra pelo Safari, toque em **Compartilhar** → **Adicionar à Tela de Início**; abra o ícone instalado.
- **Após instalar:** faça login como administrador, abra **Instalar Clyriva / Alertas**, toque em **Ativar notificações** e autorize no sistema. Use **Enviar notificação de teste** para confirmar no próprio celular.

A permissão **não é solicitada automaticamente** na instalação. Ela depende da ação explícita do administrador. Só dispositivos inscritos receberão mensagens.

## Como funcionam as notificações

- Supabase `pg_cron` faz verificação diária às 12h UTC (9h em Brasília, sem horário de verão) da coleção de obrigações `tasks` e tributos `taxes` do workspace.
- Envia um aviso apenas se houver itens vencidos ou com vencimento nos próximos 3 dias.
- A mensagem mostra **apenas quantidade de itens**, nunca CNPJ, valores, nomes ou outros dados privados.
- Uma notificação de rotina por dispositivo e dia; os avisos de teste só podem ser enviados uma vez a cada 30 segundos.
- O usuário pode desativar o envio no mesmo dispositivo.
- A entrega depende da conectividade e das configurações de bateria, notificações e permissões do sistema operacional. Não substitui o acompanhamento manual dos vencimentos.

## Segurança e arquitetura

- Manifest e ícones em `/manifest.webmanifest` e `/icons/`.
- Service worker `/sw.js`: cache apenas da tela genérica offline e ícones; **nenhum dado de cliente ou sessão é colocado no cache**.
- Supabase Edge Function `clyriva-push`: assinaturas e testes exigem sessão válida e perfil administrador, verificados dentro da função.
- Chaves VAPID privadas e credencial do agendamento mantidas em **Supabase Vault** e legíveis na API somente pela função `clyriva_push_server_settings` com papel `service_role`.
- Tabela de dispositivos `clyriva_push_subscriptions` protegida por RLS; outros usuários não podem listar nem cadastrar aparelhos.
- Job `clyriva-push-diario-09h-brasilia` chama a Edge Function com um cabeçalho secreto, via `pg_net`.
- A função usa `verify_jwt=false` para permitir chamadas do agendamento, mas **as rotas de assinatura e teste verificam autenticação e papel no próprio código**, e o agendamento valida credencial própria; não é um endpoint aberto para enviar notificações.

## Pontos para testar num aparelho físico

1. Instalação e ícone na tela inicial.
2. Login habitual dentro do aplicativo instalado.
3. Permissão de notificações concedida após o toque em **Ativar notificações**.
4. Chegada da **notificação de teste** com o aplicativo fechado.
5. Desativação das notificações neste aparelho.
6. Quando houver itens vencidos ou com prazo de até 3 dias, verificação do aviso diário.

A chave pública é parte do protocolo Web Push e pode constar no código; as chaves secretas não entram no GitHub. Não usar credenciais reais nos testes automatizados.
