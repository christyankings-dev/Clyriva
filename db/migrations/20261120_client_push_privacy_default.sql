-- O valor financeiro nao deve aparecer por padrao em dispositivos inscritos anteriormente.
alter table public.clyriva_client_push_subscriptions alter column show_amount set default false;
