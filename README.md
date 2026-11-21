# Clyriva

O Clyriva reúne a carteira, os honorários, as notas fiscais de controle, o caixa, as guias e as pendências do escritório. A gestão e os clientes entram por páginas diferentes.

| Entrada | Quem usa | O que pode fazer |
| --- | --- | --- |
| [Gestão](https://clyriva-production.up.railway.app/) | Administrador autorizado | Gerir sua carteira, guardar documentos internos, registrar pagamentos, exportar dados e publicar avisos. |
| [Clyriva Clientes](https://clyriva-production.up.railway.app/cliente.html) | Pessoa com acesso ativo à empresa | Ver avisos publicados, abrir ou baixar os arquivos liberados e escolher se deseja receber notificações no aparelho. |
| [Avisos para clientes](https://clyriva-production.up.railway.app/avisos-admin.html) | Administrador autorizado | Gerir acessos, cobranças independentes, comunicados, histórico e revogações. |

## Primeiro acesso pelo celular

Na ficha de uma empresa ativa, selecione **Criar login do cliente**, confira a empresa, informe o e-mail da pessoa e copie o acesso para enviar em particular. Clientes já autorizados usam a senha existente. Para testar o perfil de cliente no seu celular, use um e-mail diferente do seu login administrativo.

O cliente abre o link recebido, toca em **Instalar no celular**, abre o ícone **Clyriva Clientes** e entra com o e-mail e a senha. Em **Notificações neste aparelho**, toca em **Ativar notificações**, permite o envio e escolhe **Enviar notificação de teste**. O serviço informa se aceitou o teste. A exibição é conferida na central de notificações do próprio aparelho. No iPhone ou iPad, o Web Push requer iOS/iPadOS 16.4 ou posterior e o aplicativo adicionado à Tela de Início.

## Rotina do escritório

Em **Visão geral → Meu dia / Minha semana**, selecione um contador para listar os registros. Os prazos usam o calendário de Brasília em todas as competências. O filtro de empresa se aplica à agenda das empresas ativas. Abrir a ficha por uma linha seleciona a competência daquele lançamento. Em cada linha é possível abrir a ficha, registrar pagamento ou concluir a tarefa. A tarefa pode ser marcada como **Aguardando retorno do cliente** na edição.

Em **Meus clientes → Ficha → Cadastrar guia** ou **Criar tarefa**, é possível selecionar o PDF, JPG ou PNG antes de salvar. O registro é gravado primeiro. Se o documento falhar, use **Tentar novamente**. Para o cliente baixar os arquivos, use **Disponibilizar no app do cliente** e confira empresa, vencimento, valor, documentos e acessos. Esse passo se aplica também a novos anexos de uma guia já publicada.

A agenda distingue guias sem anexo, envios pendentes, publicações e avisos arquivados. Uma guia publicada pode ainda ter um segundo PDF aguardando liberação. A consulta de documentos pode ser atualizada no painel.

## Código e persistência

| Componente | Responsabilidade |
| --- | --- |
| `index.html`, `app.js`, `admin.html`, `panel.js` | Login da gestão, carteira em memória, validação e gravação com revisão. |
| `core.js`, `rotina.js` | Datas, valores em centavos, CPF e CNPJ, agenda e resumo mensal. |
| `servidor.py` | Site e proxy de consulta CNPJ. A consulta usa BrasilAPI e CNPJ.ws. O cadastro aceita preenchimento manual. |
| `cliente.js`, `avisos-admin.js`, `edge-functions/clyriva-client/` | Sessão do cliente, publicação explícita por empresa, arquivos privados, links curtos e lembretes. |
| `pwa.js`, `sw.js`, `edge-functions/clyriva-push/` | Instalação dos apps e alertas da gestão. |
| `db/migrations/` | Evolução do banco. O arquivo `schema_v1_6_reference.sql` é histórico e a instalação de testes o aplica somente a um banco vazio. |

O Supabase Auth identifica cada usuário. A lista `clyriva_admins` e as políticas do banco delimitam a carteira do gestor. O aplicativo consulta os vínculos ativos por usuário e empresa a cada leitura. Um segundo administrador tem sua própria carteira. O compartilhamento entre sócios depende de implementação específica.

O cofre usa AES-GCM e senha-mestra. O JSON de backup contém dados legíveis da carteira e o cofre cifrado. PDFs, imagens, publicações e autorizações precisam de cópia própria. O histórico guarda até 25 revisões anteriores da carteira. Em uma restauração, acessos revogados e avisos arquivados exigem nova ação da gestão.

## Execução e implantação

Para iniciar o servidor, execute `python servidor.py` e abra `http://127.0.0.1:8765`. O login online requer uma conta autorizada no Supabase configurado. O Railway acompanha `main`, com build e comando do Gunicorn em `railway.json`. Para rodar pelo Dockerfile, a imagem já define `CLYRIVA_ENV=production`. O arquivo `config.js` recebe apenas URL e chave pública. Migrações do banco e funções Edge têm implantação separada do site.

O workflow de qualidade verifica regras da carteira, proxy, lembretes, interface em Chromium e integração com um Supabase descartável. A suíte de integração usa Docker e Supabase CLI. O script `bash tests/run_supabase_local.sh` cria seu próprio projeto local temporário e usa apenas a API do loopback.

Os controles de NF, tributos e pagamentos registram a atividade informada pelo escritório. Emissão fiscal, movimentação bancária e recolhimento de impostos exigem os sistemas próprios.

[Alterações e auditoria da v2.6](CHANGELOG_v2.6.md) · [Histórico da v2.5](CHANGELOG_v2.5.md) · [Guia do aplicativo do cliente](PWA_CLIENTES.md) · [Notificações da gestão](PWA_NOTIFICACOES.md)
