# Clyriva v2.2 — Auditoria técnica interna

## Escopo
Código da interface administrativa e do cliente, PWA, API de notificações, rotinas financeiras e autenticação; consulta ao Supabase em modo de leitura, análise de alertas de segurança e validação de build do Railway. Nenhum cliente, cobrança, senha ou guia real foi usado como teste.

## Problemas observados e correções

1. **A-01 — Login falhava se o service worker não estivesse disponível.** O `signIn()` saía prematuramente caso `registration` fosse nulo. O login agora não depende da instalação nem da possibilidade de receber notificações.
2. **A-02 — Autorização em contas preexistentes.** O cadastro passa a rejeitar a vinculação automática de contas autenticadas não criadas/vinculadas anteriormente ao Clyriva; é necessária regularização explícita.
3. **A-03 — Revogação sem limpeza de dispositivos.** Quando a pessoa perde seu último acesso, o servidor desativa seus dispositivos inscritos para notificações.
4. **A-04 — Revogação durante envio.** O envio agora revalida o vínculo imediatamente antes de cada push.
5. **A-05 — Falha de rede deixava lembrete não enviado.** Agendamento do Supabase passa a ocorrer às 09:00, 09:20 e 09:40 BRT. Só há reenvio de tentativas pendentes após 15 minutos e avisos concluídos são bloqueados por chave única por dispositivo/cobrança/dia.
6. **A-06 — Dados permaneciam no HTML oculto após logout.** Interface administrativa e do cliente limpam lista, resumo e campos de entrada após saída.
7. **A-07 — Cadastro duplicado em reconexão.** Coluna `request_key` e índice único por administrador; interface preserva a chave em tentativas de repetição.
8. **A-08 — Recuperação de acesso de cliente.** Senha temporária gerada no servidor, autorização exclusiva ao admin e período mínimo entre redefinições.
9. **A-09 — Gestão de poucas empresas.** Resumo de cobranças abertas, próximas de vencer, vencidas e pagas; filtro por empresa, exportação CSV, cópia de lembrete e histórico do último envio aceito.
10. **A-10 — Privacidade de valores.** Por padrão os valores NÃO são mostrados em notificações sem consentimento do usuário no próprio aparelho.

## Evidências e limitações
- Testes Python + JavaScript do repositório, inclusive simulação de cliente e administrador em desktop e tamanho móvel.
- Inspeção de RLS: tabela de entregas e inscrições tem `RLS` ativado sem políticas; os dados são acessíveis somente pelo serviço autorizado no backend.
- Supabase sinaliza como alerta que funções `SECURITY DEFINER` administrativas são executáveis por `authenticated`. Elas devem permanecer com checagem interna de administrador; não se deve revogar indiscriminadamente, pois o painel depende delas. Auditoria destas funções continua recomendável.
- Supabase avisa que a proteção contra senhas vazadas não está ativa; verificar custo/disponibilidade nas configurações de autenticação.
- Banco de produção não continha empresas, avisos ou inscrições no momento da análise. Portanto, **não foi possível verificar recebimento real no celular** nem restaurar dados reais.
- Push confirmado pelo gateway não equivale necessariamente a uma exibição no dispositivo; Android/iOS têm condições próprias, conectividade, permissão e economia de bateria.
- Se o gateway aceitar o envio e a gravação do comprovante falhar, uma tentativa pode ser repetida; a garantia é **no máximo uma entrega registrada por cobrança, aparelho e dia**, não entrega física exatamente uma vez.
- Não houve validação de fluxo ponta a ponta com credenciais reais de cliente e integração real no banco.

## Recomendações para fase posterior
- Criar empresa de testes não real e conta específica de testes para validar acesso de ponta a ponta (sem usar a carteira existente).
- Adicionar página de auditoria operacional com últimos retornos de push e falhas de entrega; evitar expor tokens/endpoints de dispositivos.
- Configurar acompanhamento de falhas de agendamento e alerta administrativo quando a tarefa programada não roda.
- Avaliar proteção adicional de autenticação de cliente, incluindo recuperação por e-mail confiável.
