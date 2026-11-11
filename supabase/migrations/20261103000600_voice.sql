-- Durable SFU revocations. Related: docs/Features/Voice Chat.md
create table public.voice_revocations (
  id bigint generated always as identity primary key,
  room_id uuid not null,
  user_id uuid,
  created_at timestamptz not null default now()
);
create table public.voice_worker_state (
  id boolean primary key default true check(id),
  last_seen timestamptz not null
);
alter table public.voice_revocations enable row level security;
alter table public.voice_worker_state enable row level security;
revoke all on public.voice_revocations,public.voice_worker_state from public,anon,authenticated;
grant all on public.voice_revocations,public.voice_worker_state to service_role;
grant usage,select on sequence public.voice_revocations_id_seq to service_role;
create function public.voice_worker_ready(p_room uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.voice_worker_state where id and last_seen > now()-interval '90 seconds')
    and not exists(select 1 from public.voice_revocations where room_id=p_room and (user_id is null or user_id=auth.uid()));
$$;
revoke all on function public.voice_worker_ready(uuid) from public,anon;
grant execute on function public.voice_worker_ready(uuid) to authenticated;
create function public.queue_voice_revocation() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='room_members' then
    if tg_op='DELETE' then
      insert into public.voice_revocations(room_id,user_id) values(old.room_id,old.user_id); return old;
    elsif new.status<>'active' and old.status='active' then
      insert into public.voice_revocations(room_id,user_id) values(new.room_id,new.user_id);
    end if;
  elsif tg_table_name='rooms' then
    if tg_op='DELETE' then
      insert into public.voice_revocations(room_id) values(old.id); return old;
    elsif new.closed_at is not null and old.closed_at is null then
      insert into public.voice_revocations(room_id) values(new.id);
    end if;
  elsif tg_table_name='users' and new.email_confirmed_at is null and old.email_confirmed_at is not null then
    insert into public.voice_revocations(room_id,user_id) select room_id,user_id from public.room_members where user_id=new.id and status='active';
  end if;
  return new;
end;
$$;
revoke all on function public.queue_voice_revocation() from public,anon,authenticated;
create trigger voice_member_revoked after update or delete on public.room_members for each row execute function public.queue_voice_revocation();
create trigger voice_room_closed after update or delete on public.rooms for each row execute function public.queue_voice_revocation();
create trigger voice_email_revoked after update of email_confirmed_at on auth.users for each row execute function public.queue_voice_revocation();
