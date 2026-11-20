# Clyriva v2.4 — Integração das obrigações com anexos e app do cliente

## Diagnóstico
O v2.3 permitia anexos somente aos avisos publicados em `avisos-admin.html`. As guias, tarefas, pendências e atendimentos do painel `panel.js` eram registros distintos: não havia um fluxo direto de anexo na ficha contábil e o aplicativo do cliente não recebia esses arquivos por vínculo automático.

## Correções
- Campo de arquivo diretamente nos formulários de **Guia ou tributo** e **Obrigação / pendência**, com suporte a PDF/JPG/PNG de até 5 MB. Ao salvar, o registro administrativo é persistido antes do envio; se o upload falhar, a guia/pendência continua preservada.
- Botão **📎 Anexos** nas listagens de guias, pendências, atendimentos e ficha do cliente para abrir, baixar, remover e adicionar arquivos aos lançamentos existentes.
- API de anexos conectada à função real `clyriva-client/admin-internal-*`, usando exclusivamente o token do administrador autenticado e o bucket privado já existente.
- Nova tabela privada `clyriva_internal_attachments`, com RLS e sem leitura direta por clientes ou anônimos. Verificação de vínculo da empresa no servidor, cabeçalho do arquivo no servidor, e URLs assinadas de curta validade.
- **Enviar ao app**: decisão expressa do administrador para disponibilizar um lançamento e seus anexos para o cliente vinculado. O serviço cria/atualiza o comunicado correspondente (sem redigitar valor, data e empresa), copia os arquivos para a área privada autorizada e evita duplicidades por índice único.
- Sincronização de lançamentos já publicados em caso de pagamento/conclusão, além de arquivamento do aviso ao excluir um lançamento administrativo.

## Cuidados de segurança
Anexar não envia automaticamente o documento ao cliente. A publicação requer confirmação humana. Documentos administrativos são privados e não podem ser baixados por um cliente até serem expressamente disponibilizados e submetidos à verificação de acesso. O serviço não tem bucket público.

## Testes
- Node `--check` no painel e no módulo de regras de vencimento.
- Node `--experimental-strip-types --check` na Edge Function TypeScript.
- `tests/integrated_docs_v24_test.py`: 10 verificações de integração/segurança estáticas.
- `tests/core_private_test.js`: regras centrais monetárias e datas.
- `tests/reminder_rules_test.mjs`: 8 verificações de D-3, D-2, D-1 e D0.
- `tests/servidor_test.py` e `tests/private_server_test.py` (servidor HTTP).
- Teste GUI do Chromium em localhost: **não executado com sucesso** porque o ambiente impôs `ERR_BLOCKED_BY_ADMINISTRATOR` à navegação. Não declarar teste visual de ponta a ponta como aprovado.

## Limitações e próximos testes
Para validar upload e download realmente concluídos, falta um acesso de cliente de teste e uma cobrança de teste publicada, com permissão real no dispositivo. É necessário verificar separação entre duas empresas, atualização de anexos já publicados e entrega real da notificação. Não foi cadastrado cliente de teste nem modificada nenhuma obrigação real na execução da auditoria.

## Ajustes adicionais da revisão final
- Excluir um anexo interno também exclui a cópia do mesmo arquivo publicada para o cliente, impedindo documentos antigos de continuarem disponíveis por engano.
- Atualização de lançamento já publicado respeita o arquivamento escolhido na área do cliente e preserva mensagens editadas ali.
- Observações internas das fichas de empresas **não são copiadas automaticamente** para o aplicativo. O comunicado publicado recebe uma descrição neutra, que pode ser personalizada na área de avisos.
- Testes de regressão específicos: 13 verificações de integração e isolamento.
