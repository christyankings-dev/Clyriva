# Clyriva

O Clyriva reúne a carteira, os honorários, as notas fiscais de controle, o caixa, as guias e as pendências do escritório. A gestão e os clientes entram por páginas diferentes.

| Entrada                                                                             | Quem usa                          | O que pode fazer                                                                                                    |
| ----------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [Gestão](https://clyriva-production.up.railway.app/)                                | Administrador autorizado          | Gerir sua carteira, guardar documentos internos, registrar pagamentos, exportar dados e publicar avisos.            |
| [Clyriva Clientes](https://clyriva-production.up.railway.app/cliente.html)          | Pessoa com acesso ativo à empresa | Ver avisos publicados, abrir ou baixar os arquivos liberados e escolher se deseja receber notificações no aparelho. |
| [Avisos para clientes](https://clyriva-production.up.railway.app/avisos-admin.html) | Administrador autorizado          | Gerir acessos, cobranças independentes, comunicados, histórico e revogações.                                        |

## Primeiro acesso pelo celular

Na ficha de uma empresa ativa, selecione **Criar login do cliente**, confira a empresa, informe o e-mail da pessoa e copie o acesso para enviar em particular. Clientes já autorizados usam a senha existente. Para testar o perfil de cliente no seu celular, use um e-mail diferente do seu login administrativo.

O cliente abre o link recebido, toca em **Instalar no celular**, abre o ícone **Clyriva Clientes** e entra com o e-mail e a senha. Em **Notificações neste aparelho**, toca em **Ativar notificações**, permite o envio e escolhe **Enviar notificação de teste**. O app informa quando o serviço aceita o envio. Quando o navegador apresenta a notificação, o app mostra **Este aparelho confirmou** e o horário. O resultado do último teste fica disponível para a mesma conta nesse navegador por até 24 horas, inclusive ao reabrir o app. No iPhone ou iPad, o Web Push requer iOS/iPadOS 16.4 ou posterior e o aplicativo adicionado à Tela de Início.

## Rotina do escritório

Em **Visão geral → Meu dia / Minha semana**, selecione um contador para listar os registros. Os prazos usam o calendário de Brasília em todas as competências. O filtro de empresa se aplica à agenda das empresas ativas. Abrir a ficha por uma linha seleciona a competência daquele lançamento. Em cada linha é possível abrir a ficha, registrar pagamento ou concluir a tarefa. A tarefa pode ser marcada como **Aguardando retorno do cliente** na edição.

Em **Meus clientes → Ficha → Cadastrar guia** ou **Criar tarefa**, é possível selecionar o PDF, JPG ou PNG antes de salvar. O registro é gravado primeiro. Se o documento falhar, use **Tentar novamente**. Para o cliente baixar os arquivos, use **Disponibilizar no app do cliente** e confira empresa, vencimento, valor, documentos e acessos. Esse passo se aplica também a novos anexos de uma guia já publicada.

A agenda distingue guias sem anexo, envios pendentes, publicações e avisos arquivados. Uma guia publicada pode ainda ter um segundo PDF aguardando liberação. A consulta de documentos pode ser atualizada no painel.

## Código e manutenção

O painel tem uma página React por área de trabalho, em TypeScript. O catálogo de rotas fica em [routes.ts](frontend/src/apps/panel/navigation/routes.ts). O [guia de arquitetura](docs/ARQUITETURA.md) relaciona cada área aos arquivos de tela, regras, estilos e testes.

O Supabase Auth identifica cada usuário. A lista `clyriva_admins` e as políticas do banco delimitam a carteira do gestor. O aplicativo consulta os vínculos ativos por usuário e empresa a cada leitura. Um segundo administrador tem sua própria carteira. O compartilhamento entre sócios depende de implementação específica.

O cofre usa AES-GCM e senha-mestra. O JSON de backup contém dados legíveis da carteira e o cofre cifrado. PDFs, imagens, publicações e autorizações precisam de cópia própria. O histórico guarda até 25 revisões anteriores da carteira. Em uma restauração, acessos revogados e avisos arquivados exigem nova ação da gestão.

## Execução e implantação

Com Node.js 22.12 ou superior e Python 3.12, execute os comandos abaixo a partir da raiz.

```sh
npm ci
npm run build
python -m pip install -r requirements.txt
python servidor.py
```

Abra [o servidor local](http://127.0.0.1:8765). Para editar a interface com atualização automática, mantenha o servidor Python aberto e execute também npm run dev em outro terminal. O login usa o projeto indicado em frontend/public/config.js. Para desenvolvimento autenticado use um projeto Supabase de teste ou as contas fictícias das suítes. O Dockerfile compila a interface com Node e executa o servidor Python com Gunicorn. O Railway publica a branch main. As migrações e as funções Edge têm implantação própria.

O workflow de qualidade verifica regras da carteira, proxy, lembretes, interface em Chromium e integração com um Supabase descartável. A suíte de integração usa Docker e Supabase CLI. O script `bash tests/run_supabase_local.sh` cria seu próprio projeto local temporário e usa apenas a API do loopback.

Os controles de NF, tributos e pagamentos registram a atividade informada pelo escritório. Emissão fiscal, movimentação bancária e recolhimento de impostos exigem os sistemas próprios.

[Alterações e auditoria da v2.6](docs/history/CHANGELOG_v2.6.md) · [Histórico da v2.5](docs/history/CHANGELOG_v2.5.md) · [Guia do aplicativo do cliente](docs/PWA_CLIENTES.md) · [Notificações da gestão](docs/PWA_NOTIFICACOES.md)
