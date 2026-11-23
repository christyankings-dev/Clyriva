# Manutenção do Clyriva

O Vite compila quatro entradas independentes. O servidor Python serve o resultado de produção em dist e encaminha as consultas autenticadas de CNPJ. As carteiras, publicações, documentos e vínculos de acesso permanecem no Supabase.

## Estrutura do código

O código do navegador está em `frontend/src`, escrito em TypeScript (`strict`) e React. Cada tela do Vite tem uma pasta em `apps`, e o que é comum a mais de uma tela fica em `shared`.

| Pasta                                              | Conteúdo                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| [apps/management](../frontend/src/apps/management) | Login da gestão, recuperação, sessão e ponte com o painel.                    |
| [apps/panel](../frontend/src/apps/panel)           | Painel administrativo (carregado dentro do iframe da gestão).                 |
| [apps/client](../frontend/src/apps/client)         | Aplicativo do cliente.                                                        |
| [apps/notices](../frontend/src/apps/notices)       | Avisos, cobranças e acessos das empresas.                                     |
| [shared/domain](../frontend/src/shared/domain)     | Tipos e regras da carteira (validação, CPF/CNPJ, valores).                    |
| [shared/agenda](../frontend/src/shared/agenda)     | Agenda de prazos e resumo por cliente.                                        |
| [shared/lib](../frontend/src/shared/lib)           | Utilitários: acesso ao DOM, erros, pontos de montagem React e estado simples. |

Regras de organização:

- Cada tela tem `main.tsx` (monta o `App`), `App.tsx` (estrutura), `index.css` (importa os estilos) e `types.ts`.
- Cada página do painel fica em `pages/<Nome>/index.tsx`, com `types.ts` e uma pasta `components/` para as partes que só ela usa. Componentes usados por mais de uma página ficam em [components](../frontend/src/apps/panel/components), um por pasta, e são reexportados por `components/index.ts`.
- Não se escreve HTML por texto (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `dangerouslySetInnerHTML`). O ESLint trata isso como erro. Diálogos, formulários e avisos são componentes React.
- Importações usam a extensão real (`.ts` ou `.tsx`) e `import type` para tipos.
- `npm run check` roda `tsc`, ESLint e Prettier.

## Onde fazer uma alteração

| Área                                     | Entrada ou tela                                                                                                                                                                     | Regra, dados ou integração                                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login da gestão, recuperação e histórico | [Login da gestão](../frontend/index.html)                                                                                                                                           | [Sessão e autenticação](../frontend/src/apps/management/session), [histórico e comunicação com o painel](../frontend/src/apps/management/workspace)                   |
| Visão geral e agenda                     | [Dashboard](../frontend/src/apps/panel/pages/Dashboard/index.tsx)                                                                                                                   | [Agenda, prazos e resumo por cliente](../frontend/src/shared/agenda)                                                                                                  |
| Cadastro, prioridade e ficha             | [Clients](../frontend/src/apps/panel/pages/Clients/index.tsx), [ClientDetails](../frontend/src/apps/panel/pages/ClientDetails/index.tsx)                                            | [Consulta CNPJ e dados cadastrais](../frontend/src/apps/panel/clients), [formulários e gravação](../frontend/src/apps/panel/forms)                                    |
| Notas, fluxo de caixa e honorários       | [Invoices](../frontend/src/apps/panel/pages/Invoices/index.tsx), [Cash](../frontend/src/apps/panel/pages/Cash/index.tsx), [Fees](../frontend/src/apps/panel/pages/Fees/index.tsx)   | [Seletores dos valores por cliente e competência](../frontend/src/apps/panel/state/selectors.ts), [validação da carteira](../frontend/src/shared/domain/workspace.ts) |
| Guias, obrigações e atendimentos         | [Taxes](../frontend/src/apps/panel/pages/Taxes/index.tsx), [Tasks](../frontend/src/apps/panel/pages/Tasks/index.tsx), [Service](../frontend/src/apps/panel/pages/Service/index.tsx) | [Anexos internos, envio e publicação](../frontend/src/apps/panel/documents)                                                                                           |
| Cofre, relatórios e backup               | [Páginas do painel](../frontend/src/apps/panel/pages)                                                                                                                               | [Criptografia e bloqueio](../frontend/src/apps/panel/vault), [linhas e CSV](../frontend/src/apps/panel/reports), [backup](../frontend/src/apps/panel/backup)          |
| Aplicativo do cliente                    | [Login e instalação](../frontend/cliente.html), [cartão de aviso](../frontend/src/apps/client/components/NoticeCard)                                                                | [Login e saída](../frontend/src/apps/client/auth), [inscrição do aparelho e confirmação do teste](../frontend/src/apps/client/device)                                 |
| Gestão de avisos e acessos               | [Avisos da gestão](../frontend/avisos-admin.html)                                                                                                                                   | [Cobranças, convites e publicação](../frontend/src/apps/notices), [API de clientes no Supabase](../edge-functions/clyriva-client)                                     |

## Como o painel funciona

[main.tsx](../frontend/src/apps/panel/main.tsx) monta o [App](../frontend/src/apps/panel/App.tsx), que desenha a casca fixa (menu lateral, barra superior e os pontos de montagem `#page`, `#modal-root` e `#toast-root`) e então chama `start()`. Cada chave de [routes.ts](../frontend/src/apps/panel/navigation/routes.ts) corresponde a uma página em `pages`. O roteador desenha a página atual em `#page`.

Os cliques usam atributos `data-action` e `data-page`, tratados por ouvintes delegados em [navigation/events](../frontend/src/apps/panel/navigation/events) (cliques, envios, filtros, teclado e casca). O identificador do registro chega até [actions.ts](../frontend/src/apps/panel/navigation/actions.ts). As páginas leem os dados pelos seletores e compartilham cabeçalho, cartões, estados e tabelas.

Cada tipo de lançamento tem um [módulo de formulário](../frontend/src/apps/panel/forms/records) com os campos, a validação e a gravação daquele tipo. Os diálogos (registro, cofre e anexos) são componentes React exibidos pelo [ModalHost](../frontend/src/apps/panel/components/ModalHost/index.tsx). As alterações da carteira passam por [transactions.ts](../frontend/src/apps/panel/state/transactions.ts). A operação guarda uma cópia anterior, tenta gravar pela ponte do iframe e restaura o estado se a gravação falhar. A ponte valida a janela que fez o pedido e a revisão da carteira. O cofre chega à persistência cifrado.

## Estilos

Cada tela importa os estilos de seu `index.css`. Os estilos do painel ([styles](../frontend/src/apps/panel/styles)) estão agrupados por finalidade, com arquivos próprios de clientes, CNPJ, formulários e cofre. A ordem de importação em `styles/index.css` faz parte do resultado: a identidade visual, as regras responsivas e a acessibilidade sobrescrevem as anteriores e precisam continuar por último. O tema compartilhado está em [shared/styles](../frontend/src/shared/styles). O portal do cliente e a tela de avisos compartilham a folha `cliente.css`.

Para alterar um componente isolado das telas de cliente e avisos, coloque um CSS Module ao lado do componente, como em [NoticeCard](../frontend/src/apps/client/components/NoticeCard). As utilidades Tailwind usam o prefixo tw e o reset global está desativado. Assim uma alteração local pode ser feita sem alterar a aparência dos campos de outra entrada.

## Contratos entre as entradas

| Endereço               | Comportamento                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| /                      | Login da gestão, recuperação e sessão administrativa.                                                   |
| /admin.html            | Painel dentro do iframe da sessão administrativa. A abertura direta apresenta o acesso ao login.        |
| /cliente.html          | Login do cliente, documentos, instalação e notificações. O manifesto instalado usa /cliente.html?app=1. |
| /avisos-admin.html     | A gestão pode abrir a autorização de uma empresa específica pelo fragmento autorizar.                   |
| /sw.js e /push-test.js | O navegador usa estes caminhos estáveis, inclusive quando o aplicativo está fechado.                    |

O servidor publica apenas as páginas, recursos do aplicativo e JS/CSS compilados. O banco continua verificando autorização por usuário e empresa. A chave de configuração enviada ao navegador é a chave pública do projeto. Os arquivos privados dependem de links assinados e de autorização do servidor.

## Como verificar e publicar

Use os comandos de instalação do [README](../README.md). Na raiz, npm run typecheck confere os tipos, npm run lint verifica as regras de código e de componentes, e `npm run check` roda os três controles de código. npm run format:check confere a formatação, npm test executa as suítes JavaScript e npm run build gera o site completo. Em uma revisão, confira o desktop e a largura de 390 pixels.

O [workflow de qualidade](../.github/workflows/quality.yml) compila o site, verifica as regras de negócio, abre as páginas de produção com dados fictícios no Chromium e testa os vínculos de duas empresas em um Supabase descartável. O Railway acompanha a branch main e executa a imagem do Dockerfile. Para reverter uma alteração exclusiva do frontend, reverta o commit e publique novamente. A reorganização do frontend usa o banco existente.
