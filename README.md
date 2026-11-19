# Clyriva — Gestão privada v1.7

Aplicação **privada** de gestão contábil e financeira. O login individual é obrigatório; **clientes não entram no sistema**. O administrador atende os clientes diretamente e utiliza o painel para encontrar informações e gerar relatórios. Um futuro sócio poderá ter usuário próprio, com escopo compartilhado e permissões a desenvolver.

## Organização

- `index.html` + `app.js`: login Supabase Auth, verificação de administrador e painel; não oferece criação pública de contas.
- `admin.html` + `panel.js` + `panel.css`: carteira, CNPJ, notas manuais, caixa, honorários, tributos, tarefas, cofre criptografado, backup e relatórios.
- `core.js`: validação e cálculos compartilhados.
- `rotina.js`: resumo mensal, atividades e tarefas.
- `servidor.py`: servidor WSGI/HTTP; consulta CNPJ em produção exige JWT de administrador validado via RLS do Supabase.
- `config.js`: URL e chave **publishable** pública do Supabase. Nunca usar `service_role` neste arquivo.
- `db/migrations/`: documentação e SQL da migração aplicada na produção de 2026-11-19.
- `schema_v1_6_reference.sql`: referência histórica; **NÃO executar no banco de produção já configurado**.

## Banco e acessos

Supabase: `clyriva_admins` (usuários permitidos), `clyriva_workspace` (JSON de carteira), `clyriva_vault` (criptograma do cofre), `clyriva_workspace_history` (até 25 revisões anteriores por carteira). As tabelas antigas `clyriva_client_access` e `clyriva_client_views` foram preservadas sem acesso para clientes, para evitar exclusões irreversíveis.

O proprietário é cadastrado em `clyriva_admins`; novos usuários nunca são promovidos automaticamente. A aplicação ainda **não implementa** workspace compartilhado entre dois administradores: não cadastrar um sócio como administrador sem implementar controle por workspace e permissões.

- `clyriva_load`: leitura da carteira.
- `clyriva_commit`: gravação com checagem de revisão; `NULL` no cofre agora preserva o cofre existente.
- `clyriva_restore_revision`: restaura uma revisão anterior, mantendo a atual no histórico.
- `clyriva_private.publish`: desligada; não replica dados para portal de clientes.
- Edge Function `clyriva-acessos`: desativada (HTTP 410, JWT obrigatório).

## Segurança e backups

- Login, controle de administrador, HTTPS, RLS no Supabase.
- Cofre AES-GCM protegido por senha-mestra; não guarda a senha-mestra em servidor.
- Backup JSON manual: **não é cifrado para nomes, CNPJs e valores**. Armazenar em local seguro. O cofre dentro do JSON está cifrado.
- Histórico do banco guarda até 25 revisões anteriores; **não substitui um backup externo**.
- Cadastro público pela API do Supabase Auth pode depender de configuração no painel Supabase: desativar `Allow new users to sign up` em Authentication → Providers para fechar totalmente a criação de contas. Isso não é controlado pelo frontend.
- Não há emissão real de notas fiscais, consulta bancária ou recolhimento automático de tributos.

## Execução

Local: `python servidor.py` e abrir `http://127.0.0.1:8765`. Necessita Supabase configurado e permissões no banco para login real. Produção: Dockerfile no Railway, `CLYRIVA_ENV=production` (fixado no Dockerfile); domínio `https://clyriva-production.up.railway.app`.

Para rodar testes básicos:

```
python -m unittest discover -s tests -p '*test.py'
node tests/core_private_test.js
```

Antes de inserir dados reais, teste login e cadastro de cliente com acesso autenticado; teste backup e restauração com dados fictícios. Nunca cole tokens de sessão ou senhas em relatórios.
