# Manutenção do Clyriva

O Vite compila quatro entradas independentes. O servidor Python serve o resultado de produção em dist e encaminha as consultas autenticadas de CNPJ. As carteiras, publicações, documentos e vínculos de acesso permanecem no Supabase.

## Onde fazer uma alteração

| Área | Entrada ou tela | Regra, dados ou integração |
| --- | --- | --- |
| Login da gestão, recuperação e histórico | [Login da gestão](../frontend/index.html) | [Sessão e autenticação](../frontend/src/management/auth), [histórico e comunicação com o painel](../frontend/src/management/workspace) |
| Visão geral e agenda | [Dashboard.jsx](../frontend/src/panel/pages/Dashboard.jsx) | [Agenda, prazos e resumo por cliente](../frontend/src/agenda) |
| Cadastro, prioridade e ficha | [Clients.jsx](../frontend/src/panel/pages/Clients.jsx), [ClientDetails.jsx](../frontend/src/panel/pages/ClientDetails.jsx) | [Consulta CNPJ e dados cadastrais](../frontend/src/panel/clients), [formulários e gravação](../frontend/src/panel/forms) |
| Notas, fluxo de caixa e honorários | [Invoices.jsx](../frontend/src/panel/pages/Invoices.jsx), [Cash.jsx](../frontend/src/panel/pages/Cash.jsx), [Fees.jsx](../frontend/src/panel/pages/Fees.jsx) | [Seletores dos valores por cliente e competência](../frontend/src/panel/state/selectors.js), [validação da carteira](../frontend/src/domain/workspace.js) |
| Guias, obrigações e atendimentos | [Taxes.jsx](../frontend/src/panel/pages/Taxes.jsx), [Tasks.jsx](../frontend/src/panel/pages/Tasks.jsx), [Service.jsx](../frontend/src/panel/pages/Service.jsx) | [Anexos internos, envio e publicação](../frontend/src/panel/documents) |
| Cofre, relatórios e backup | [Páginas do painel](../frontend/src/panel/pages) | [Criptografia e bloqueio](../frontend/src/panel/vault), [linhas e CSV](../frontend/src/panel/reports), [backup](../frontend/src/panel/backup) |
| Aplicativo do cliente | [Login e instalação](../frontend/cliente.html), [cartão de aviso](../frontend/src/client/billing/NoticeCard.jsx) | [Login e saída](../frontend/src/client/auth), [inscrição do aparelho e confirmação do teste](../frontend/src/client/device) |
| Gestão de avisos e acessos | [Avisos da gestão](../frontend/avisos-admin.html) | [Cobranças, convites e publicação](../frontend/src/notices), [API de clientes no Supabase](../edge-functions/clyriva-client) |

## Como o painel funciona

Cada chave de [routes.js](../frontend/src/panel/navigation/routes.js) corresponde a um componente da pasta pages. Os botões de navegação usam essa chave. Um clique numa ação de registro carrega seu identificador até [actions.js](../frontend/src/panel/navigation/actions.js). As páginas leem os dados pelos seletores e usam componentes compartilhados de cabeçalho, cartões, estados e tabelas.

Cada tipo de lançamento tem um [módulo de formulário](../frontend/src/panel/forms/records) com os campos, a validação e a gravação daquele tipo. Os formulários e diálogos com manipulação direta do DOM ficam fora da árvore de páginas do React. As alterações da carteira passam por [transactions.js](../frontend/src/panel/state/transactions.js). A operação guarda uma cópia anterior, tenta gravar pela ponte do iframe e restaura o estado se a gravação falhar. A ponte valida a janela que fez o pedido e a revisão da carteira. O cofre chega à persistência cifrado.

## Estilos

Cada arquivo em [entries](../frontend/src/entries) importa os estilos de sua entrada. Os [estilos do painel](../frontend/src/styles/panel) estão agrupados por finalidade, com arquivos próprios de clientes, CNPJ, formulários e cofre. A identidade compartilhada da gestão e do painel está em [identity](../frontend/src/styles/identity). O portal do cliente e a tela de avisos compartilham a folha cliente.css.

Para alterar um componente isolado, coloque um CSS Module ao lado do JSX, como em [NoticeCard.module.css](../frontend/src/client/billing/NoticeCard.module.css). As utilidades Tailwind usam o prefixo tw e o reset global está desativado. Assim uma alteração local pode ser feita sem alterar a aparência dos campos de outra entrada.

## Contratos entre as entradas

| Endereço | Comportamento |
| --- | --- |
| / | Login da gestão, recuperação e sessão administrativa. |
| /admin.html | Painel dentro do iframe da sessão administrativa. A abertura direta apresenta o acesso ao login. |
| /cliente.html | Login do cliente, documentos, instalação e notificações. O manifesto instalado usa /cliente.html?app=1. |
| /avisos-admin.html | A gestão pode abrir a autorização de uma empresa específica pelo fragmento autorizar. |
| /sw.js e /push-test.js | O navegador usa estes caminhos estáveis, inclusive quando o aplicativo está fechado. |

O servidor publica apenas as páginas, recursos do aplicativo e JS/CSS compilados. O banco continua verificando autorização por usuário e empresa. A chave de configuração enviada ao navegador é a chave pública do projeto. Os arquivos privados dependem de links assinados e de autorização do servidor.

## Como verificar e publicar

Use os comandos de instalação do [README](../README.md). Na raiz, npm run lint verifica JavaScript, JSX e regras de componentes. npm run format:check confere a formatação, npm test executa as suítes JavaScript e npm run build gera o site completo. Em uma revisão, confira o desktop e a largura de 390 pixels.

O [workflow de qualidade](../.github/workflows/quality.yml) compila o site, verifica as regras de negócio, abre as páginas de produção com dados fictícios no Chromium e testa os vínculos de duas empresas em um Supabase descartável. O Railway acompanha a branch main e executa a imagem do Dockerfile. Para reverter uma alteração exclusiva do frontend, reverta o commit e publique novamente. A reorganização do frontend usa o banco existente.
