-- 0003 — fix das ACLs das 5 funções da migration 0002 (defesa em profundidade).
--
-- Contexto: durante validação smoke test pós-push da 0002 (2026-05-04),
-- descobrimos que `is_slug_available('zeus')` chamado via PostgREST RPC com
-- apikey=anon (sem JWT autenticado) retornava HTTP 200 + true, ao invés do
-- esperado HTTP 403 / permission denied. Inspeção do pg_proc.proacl mostrou
-- que TODAS as 5 funções tinham EXECUTE concedido a anon e service_role:
--
--   {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
-- Causa raiz: Supabase configura no setup do projeto:
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
--
-- Esse default fire automaticamente quando uma function nova é criada em
-- public. Nosso pattern da 0002 (`revoke all from public` + `grant execute
-- to authenticated`) só removeu o grant default do pseudo-role PUBLIC, mas
-- não desfez os grants explícitos a anon/authenticated/service_role que
-- vieram do default privileges.
--
-- Pattern correto (aplicado aqui): revogar explicitamente dos 3 roles
-- Supabase + PUBLIC, depois re-grant só pra authenticated.
--
-- ESCOPO DURO: somente as 5 funções da 0002. NÃO toca em set_updated_at
-- ou handle_new_user — essas são trigger functions invocadas pela transação
-- do caller (SECURITY INVOKER), então precisam que authenticated mantenha
-- EXECUTE pra triggers de UPDATE/INSERT em profiles/companies/memberships
-- não quebrarem.
--
-- Impacto funcional da 0002 (pré-fix): segurança intacta porque os
-- auth.uid() null checks dentro das funções já bloqueavam writes do anon —
-- mas defesa em profundidade quebrada (anon callable, enumeração de slugs,
-- superfície extra de rate limit attack). Esta migration fecha a janela.

revoke all     on function public.is_company_member(uuid) from public, anon, authenticated, service_role;
grant execute  on function public.is_company_member(uuid) to authenticated;

revoke all     on function public.is_company_admin(uuid) from public, anon, authenticated, service_role;
grant execute  on function public.is_company_admin(uuid) to authenticated;

revoke all     on function public.is_slug_available(text) from public, anon, authenticated, service_role;
grant execute  on function public.is_slug_available(text) to authenticated;

revoke all     on function public.create_company(text, text, text, text, text) from public, anon, authenticated, service_role;
grant execute  on function public.create_company(text, text, text, text, text) to authenticated;

revoke all     on function public.log_audit_event(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute  on function public.log_audit_event(uuid, text, jsonb) to authenticated;
