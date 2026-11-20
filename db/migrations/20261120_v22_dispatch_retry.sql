-- Clyriva v2.2: tres tentativas diarias às 09:00, 09:20 e 09:40 BRT.
-- A unicidade por aparelho/cobranca/dia evita disparos repetidos quando
-- o envio já foi registrado como concluído.
do $block$
declare jid bigint;
begin
 select jobid into jid from cron.job where jobname='clyriva-clientes-prazos-09h-brasilia';
 if jid is null then
   raise exception 'Agendamento de avisos de cliente nao encontrado';
 end if;
 perform cron.alter_job(jid, schedule:='0,20,40 12 * * *');
end
$block$;
