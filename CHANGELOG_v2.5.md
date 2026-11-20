# Clyriva v2.5 — integridade entre guia, aviso e documentos

## Objetivo
Melhorar a operação diária sem alterar a estrutura dos dados existentes. As mudanças são compatíveis com os registros das versões 2.3 e 2.4.2.

## Correções
1. **CPF válido**: o cadastro passa a validar ambos os dígitos verificadores de CPF, além da validação já existente para CNPJ. Não modifica documentos já cadastrados automaticamente.
2. **Anexos de um registro**: ao abrir a tela de documentos, a interface solicita apenas os documentos da guia ou obrigação aberta; o backend confirma a empresa e o lançamento antes da consulta. Mantém a API de listagem administrativa anterior para compatibilidade.
3. **Cobrança vinculada**: guia/tributo publicada no aplicativo não pode ter valor, vencimento ou status de pagamento alterado diretamente na lista paralela de avisos. A ficha do cliente continua a fonte dos dados financeiros. Cobranças cadastradas diretamente nos avisos mantêm seus controles.
4. **Arquivamento do aviso**: ao sincronizar uma guia ou tarefa já publicada, um aviso arquivado manualmente não volta a aparecer automaticamente, mesmo quando a guia já está paga.
5. **Interface**: a tela de avisos identifica registros integrados à ficha para facilitar a navegação e evitar baixas duplicadas.
6. **Valor negativo de tributos**: validação imediata na interface de cadastro de guia.

## Testes e limites
- `tests/core_private_test.js`: verificações reais dos dígitos de CPF, com casos válidos e inválidos.
- `tests/integrity_v25_test.py`: regressões estáticas de isolamento, vínculo de cobranças e sincronização.
- `.github/workflows/quality.yml`: execução automatizada de validações de sintaxe, regras financeiras e testes de browser desktop/mobile utilizando backend simulado.
- Não houve edição de informações reais de cliente nem criação de cobrança de teste em produção.
- **Ainda é necessário** confirmar o ciclo completo com duas contas fictícias, upload/download e notificação real em celulares. O navegador automatizado com backend simulado não substitui esse teste em produção.

## Implantação
Os arquivos `panel.js`, `avisos-admin.js` e `core.js` são entregues pelo Railway após merge em `main`. A função `clyriva-client` requer implantação **separada** no Supabase com `index.ts` e `reminder-text.mjs` correspondentes. Aplicar a função de forma coordenada com a versão da interface, mantendo autenticação por token validada internamente. Não requer migração de tabelas.
