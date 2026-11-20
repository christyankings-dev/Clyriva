# Clyriva v2.6 | Persistência, documentos e agenda do escritório

## Auditoria de 20 de novembro de 2026

O ponto de partida foi a v2.5 em `main`, commit `d398610`, com CI concluída e o mesmo commit no Railway. A primeira consulta ao Railway encontrou o serviço em repouso e zero falhas recentes. A gestão e o portal do cliente responderam por HTTPS. O Supabase estava ativo, com `clyriva-client` na versão 14. Os dois jobs de lembretes estavam habilitados, com última execução registrada às 09h de Brasília. O registro do agendador confirma a execução SQL. O aceite pelo serviço de push e a exibição no telefone têm verificações próprias.

| Impacto | Achado e correção |
| --- | --- |
| Crítico | Ao atualizar a carteira, o gatilho de histórico gravava a revisão anterior e devolvia a própria linha antiga ao PostgreSQL. A RPC podia confirmar uma revisão que não foi persistida. O defeito foi reproduzido com a definição encontrada em produção e dados fictícios. O gatilho passou a devolver a nova linha em atualizações e a RPC confere a revisão gravada antes de responder. |
| Alto | Inativar ou remover a empresa impedia o uso enquanto ela estava ausente, mas restaurar o mesmo cadastro podia revalidar vínculos antigos. A transação da carteira agora desativa esses vínculos e arquiva os avisos da empresa. Restaurar a carteira exige nova autorização para a empresa afetada. |
| Alto | Salvar um novo arquivo em guia publicada podia enviá-lo ao cliente por uma sincronização silenciosa. O documento fica interno até confirmação. A prévia identifica o público, o lançamento e os arquivos. Alterações detectadas na prévia exigem nova conferência. |
| Alto | Uma falha entre a gravação da guia e a sincronização do app podia manter um aviso aberto após o pagamento. A mesma transação agora atualiza vencimento, valor, pagamento e arquivamento dos avisos vinculados. Guias abertas com valor ou prazo incompatível com uma cobrança têm seu aviso arquivado. Avisos independentes continuam sob controle da tela de avisos. |
| Operacional | Havia telas que informavam sucesso depois de falha parcial. O formulário preserva o lançamento e o arquivo para a retentativa na mesma janela. O painel distingue falha de consulta, ausência de documento e arquivo já liberado. |
| Operacional | A consulta manual de CNPJ podia substituir nomes e endereços já corrigidos. O formulário passa a preservar valores manuais ao repetir a consulta e dados legados de origem incerta. |

## Agenda da carteira

A agenda **Meu dia / Minha semana** usa vencimento em Brasília, atravessa a virada do mês e respeita a empresa selecionada. As listas de pendências aguardando cliente, guias sem anexo, guias com envio pendente, publicadas e arquivadas reutilizam as guias e tarefas originais. O atalho para a ficha seleciona a competência do registro. O resumo do servidor entrega estados e quantidades paginados com escopo administrativo. A tela mostra a indisponibilidade da consulta sem substituir dados desconhecidos por zero.

Os períodos de três e sete dias começam amanhã. Hoje e atrasados têm controles próprios. Uma guia publicada com um novo anexo interno pode aparecer simultaneamente em **Guias publicadas** e **Guias com envio pendente**. Competência, vencimento, valor, ficha, documentos e ação de baixa ou conclusão ficam na linha do registro.

## Verificação e recuperação

- O ensaio de PostgreSQL começou com a definição da v2.5 e reproduziu a falsa confirmação. Repetido após a migração, verificou pagamento, reabertura, valor, prazo, remoção, restauração e aplicação idempotente.
- A suíte de navegador usa um servidor simulado e o painel real em iframe, em 390 e 1440 pixels. Cobre prazos e filtros, abertura da ficha, falha e retomada do anexo, prévia de publicação e indisponibilidade do resumo. As suítes anteriores exercitam também o portal, o pagamento e os avisos.
- A suíte local do Supabase cria autenticação e arquivos de teste. Verifica isolamento entre duas empresas, escopo administrativo, bytes do PDF baixado, repetição da publicação, segunda inclusão privada, alteração da prévia, exclusão, revogação e recuperação de revisão e arquivo separado. Nenhuma credencial do projeto publicado participa desse teste.
- Os lembretes usam transporte simulado nos testes. A confirmação física em Android e iPhone permanece pendente.
- O SQL foi verificado sem ler carteiras ou documentos de clientes. A instalação da migração cria ou substitui funções e um gatilho. Seu código de manutenção de acessos só executa quando a carteira muda. Edições anteriores que ficaram apenas na memória do navegador dependem de uma aba disponível ou de um backup próprio.
- Os dois buckets examinados estavam privados. As 13 tabelas da aplicação estavam com RLS ativa. Cinco tabelas sem política direta ficam atrás das funções do serviço. As três RPCs administrativas sinalizadas pelo Advisor restringem o acesso pela identidade do gestor. O catálogo negava execução anônima. A configuração de proteção contra senhas conhecidas como vazadas continua indicada pelo Advisor.
- A exclusão individual de um registro arquiva o aviso. A exclusão de uma empresa preserva objetos privados para retenção. Continua pendente uma política de retenção e uma cópia externa automatizada do Storage e dos dados de publicação. O JSON disponível na interface restaura a carteira e o cofre cifrado.

## Implantação e retorno

Aplicar o SQL `db/migrations/20261120155315_sincronizar_carteira_publicada.sql`, publicar `clyriva-client` com os dois arquivos da pasta e a validação interna de token existente, depois publicar a interface no Railway. O resultado executado de cada revisão consta no pull request, no histórico de migrações, nas versões da função e na lista de deploys. A interface antiga continua usando as rotas existentes.

Se o novo painel falhar, o Railway pode voltar ao deploy da v2.5 enquanto o banco e a função continuam protegendo as gravações e os anexos. O gatilho de integração com avisos pode ser retirado isoladamente em caso de incidente. Preservar a correção do histórico e a conferência da revisão. A restauração de configurações anteriores nunca deve reativar automaticamente os vínculos já revogados.

[Pull request e verificações](https://github.com/christyankings-dev/Clyriva/pull/2)
