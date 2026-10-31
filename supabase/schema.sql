-- Supabase SQL Editor에서 실행합니다.
-- CHANGE_ME_DELETE_PASSWORD를 원하는 삭제 비밀번호로 바꾼 복사본을 사용하세요.
-- 실제 비밀번호가 든 복사본은 GitHub 저장소에 올리지 않습니다.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists invitation_private;
revoke all on schema invitation_private from public, anon, authenticated;

create table if not exists public.wedding_guestbook (
  id uuid primary key default gen_random_uuid(),
  side text not null check (side in ('groom', 'bride')),
  name text not null check (char_length(btrim(name)) between 1 and 20),
  message text not null check (char_length(btrim(message)) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists wedding_guestbook_newest
  on public.wedding_guestbook (created_at desc, id desc);
alter table public.wedding_guestbook enable row level security;
revoke all on public.wedding_guestbook from public, anon, authenticated;

create table if not exists invitation_private.settings (
  singleton boolean primary key default true check (singleton),
  password_hash text not null
);
create table if not exists invitation_private.rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table invitation_private.settings enable row level security;
alter table invitation_private.rate_limits enable row level security;
revoke all on all tables in schema invitation_private from public, anon, authenticated;

do $setup$
declare v_password text := 'CHANGE_ME_DELETE_PASSWORD';
begin
  if v_password = 'CHANGE_ME_' || 'DELETE_PASSWORD' then
    raise exception '복사본에서 CHANGE_ME_DELETE_PASSWORD를 삭제 비밀번호로 바꿔 주세요.';
  end if;
  insert into invitation_private.settings(singleton, password_hash)
  values (true, extensions.crypt(v_password, extensions.gen_salt('bf', 10)))
  on conflict (singleton) do update set password_hash = excluded.password_hash;
end;
$setup$;

-- 실패 횟수도 정상 응답으로 반환하여 트랜잭션에 기록합니다.
create or replace function invitation_private.consume_rate_limit(
  p_action text, p_limit integer, p_window_seconds integer
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_ip text;
  v_bucket text;
  v_hits integer;
  v_now timestamptz := clock_timestamp();
begin
  v_ip := coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', 'unknown');
  v_bucket := p_action || ':' || md5(v_ip);
  delete from invitation_private.rate_limits where window_start < v_now - interval '1 day';
  insert into invitation_private.rate_limits as r(bucket, window_start, hits)
  values(v_bucket, v_now, 1)
  on conflict(bucket) do update set
    hits = case when r.window_start < v_now - make_interval(secs => p_window_seconds) then 1 else least(r.hits + 1, 100000) end,
    window_start = case when r.window_start < v_now - make_interval(secs => p_window_seconds) then v_now else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
revoke all on function invitation_private.consume_rate_limit(text, integer, integer) from public, anon, authenticated;

create or replace function public.list_guestbook(p_page integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
  v_pages integer;
  v_page integer;
  v_comments jsonb;
begin
  select count(*) into v_total from public.wedding_guestbook;
  v_pages := greatest(1, ceil(v_total / 10.0)::integer);
  v_page := least(greatest(coalesce(p_page, 1), 1), v_pages);
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc, c.id desc), '[]'::jsonb)
  into v_comments
  from (
    select id, side, name, message, created_at from public.wedding_guestbook
    order by created_at desc, id desc limit 10 offset ((v_page - 1) * 10)
  ) c;
  return jsonb_build_object('comments', v_comments, 'total', v_total, 'page', v_page, 'pages', v_pages);
end;
$$;

create or replace function public.add_guestbook(p_side text, p_name text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_side is null or p_side not in ('groom', 'bride')
    or char_length(btrim(coalesce(p_name, ''))) not between 1 and 20
    or char_length(btrim(coalesce(p_message, ''))) not between 1 and 200 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;
  if not invitation_private.consume_rate_limit('post', 5, 60) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  insert into public.wedding_guestbook(side, name, message)
  values(p_side, btrim(p_name), btrim(p_message)) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- 아래는 삭제 함수를 정의하는 구문입니다. 초기 설정 실행 시 댓글을 삭제하지 않습니다.
create or replace function public.delete_guestbook(p_id uuid, p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hash text; v_deleted uuid;
begin
  if not invitation_private.consume_rate_limit('delete', 5, 300) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  select password_hash into v_hash from invitation_private.settings where singleton = true;
  if v_hash is null or p_password is null or char_length(p_password) > 100
    or extensions.crypt(p_password, v_hash) is distinct from v_hash then
    return jsonb_build_object('ok', false, 'reason', 'invalid_password');
  end if;
  delete from public.wedding_guestbook where id = p_id returning id into v_deleted;
  if v_deleted is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.list_guestbook(integer) from public, anon, authenticated;
revoke all on function public.add_guestbook(text, text, text) from public, anon, authenticated;
revoke all on function public.delete_guestbook(uuid, text) from public, anon, authenticated;
grant execute on function public.list_guestbook(integer) to anon;
grant execute on function public.add_guestbook(text, text, text) to anon;
grant execute on function public.delete_guestbook(uuid, text) to anon;
notify pgrst, 'reload schema';
commit;
